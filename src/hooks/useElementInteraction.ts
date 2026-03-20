import { useRef, useCallback, useState } from 'react';
import type { TextLayer } from '../types';

const SNAP_THRESHOLD = 5;
const DRAG_DELAY = 40;
const TAP_DISTANCE = 5;
const ROTATION_SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315, 360];
const ROTATION_SNAP_THRESHOLD = 5;

interface SnapLines {
  x: number[];
  y: number[];
}

interface UseElementInteractionOptions {
  layers: TextLayer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, changes: Partial<TextLayer>) => void;
  onLayerTapped?: (layer: TextLayer) => void;
  onEnterEditMode?: (layerId: string) => void;
}

type DragState =
  | { type: 'pending'; id: string; startX: number; startY: number; startTime: number }
  | { type: 'move'; id: string; offsetX: number; offsetY: number }
  | { type: 'resize'; id: string; handle: string; startX: number; startY: number; startWidth: number; startLayerX: number }
  | { type: 'rotate'; id: string; centerX: number; centerY: number; startAngle: number }
  | null;

function estimateHeight(layer: TextLayer): number {
  const lines = layer.text.split('\n');
  const lineHeight = layer.fontSize * 1.3;
  return lines.length > 1 ? (lines.length - 1) * lineHeight + layer.fontSize : layer.fontSize;
}

export function useElementInteraction({
  layers,
  selectedLayerId,
  canvasWidth,
  canvasHeight,
  zoom,
  contentRef,
  onSelectLayer,
  onUpdateLayer,
  onLayerTapped,
  onEnterEditMode,
}: UseElementInteractionOptions) {
  const dragRef = useRef<DragState>(null);
  const [snapLines, setSnapLines] = useState<SnapLines>({ x: [], y: [] });
  const lastElementTapRef = useRef<{ layerId: string; time: number }>({ layerId: '', time: 0 });

  // Convert client coordinates to canvas coordinates
  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!contentRef.current) return { x: 0, y: 0 };
    const rect = contentRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  }, [contentRef, zoom]);

  // Calculate snap guides (ported from Canvas.tsx)
  const calcSnapLines = useCallback((movingId: string, newX: number, newY: number, width: number, fontSize: number): SnapLines => {
    const xSnaps: number[] = [];
    const ySnaps: number[] = [];

    const movingCenterX = newX + width / 2;
    const movingCenterY = newY + fontSize / 2;
    const movingRight = newX + width;

    // Snap to canvas center
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    if (Math.abs(movingCenterX - canvasCenterX) < SNAP_THRESHOLD) xSnaps.push(canvasCenterX);
    if (Math.abs(movingCenterY - canvasCenterY) < SNAP_THRESHOLD) ySnaps.push(canvasCenterY);

    // Snap to canvas edges
    if (Math.abs(newX) < SNAP_THRESHOLD) xSnaps.push(0);
    if (Math.abs(movingRight - canvasWidth) < SNAP_THRESHOLD) xSnaps.push(canvasWidth);

    // Snap to other layers
    for (const layer of layers) {
      if (layer.id === movingId) continue;
      const lCenterX = layer.x + layer.width / 2;
      const lCenterY = layer.y + layer.fontSize / 2;

      if (Math.abs(movingCenterX - lCenterX) < SNAP_THRESHOLD) xSnaps.push(lCenterX);
      if (Math.abs(movingCenterY - lCenterY) < SNAP_THRESHOLD) ySnaps.push(lCenterY);
      if (Math.abs(newX - layer.x) < SNAP_THRESHOLD) xSnaps.push(layer.x);
      if (Math.abs(movingRight - (layer.x + layer.width)) < SNAP_THRESHOLD) xSnaps.push(layer.x + layer.width);
    }

    return { x: xSnaps, y: ySnaps };
  }, [layers, canvasWidth, canvasHeight]);

  // Element pointer down — select and start potential drag
  const handleElementPointerDown = useCallback((e: React.PointerEvent, layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    e.stopPropagation(); // Prevent canvas pan

    // Double-tap detection: if tapping an already-selected element within 400ms, enter edit mode
    const now = Date.now();
    if (
      layerId === selectedLayerId &&
      layerId === lastElementTapRef.current.layerId &&
      now - lastElementTapRef.current.time < 400 &&
      !layer.locked
    ) {
      lastElementTapRef.current = { layerId: '', time: 0 };
      onEnterEditMode?.(layerId);
      return; // Exit early — don't set up drag or capture
    }
    lastElementTapRef.current = { layerId, time: now };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    onSelectLayer(layerId);
    onLayerTapped?.(layer);

    if (layer.locked) return;

    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    dragRef.current = {
      type: 'pending',
      id: layerId,
      startX: x,
      startY: y,
      startTime: performance.now(),
    };

    // Haptic on select
    if ('vibrate' in navigator) navigator.vibrate(10);

    // Listen for global move/up on this pointer
    const onMove = (me: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const { x: cx, y: cy } = clientToCanvas(me.clientX, me.clientY);

      if (drag.type === 'pending') {
        const dist = Math.hypot(cx - drag.startX, cy - drag.startY);
        const elapsed = performance.now() - drag.startTime;
        if (dist > TAP_DISTANCE || elapsed > DRAG_DELAY) {
          // Transition to move
          dragRef.current = {
            type: 'move',
            id: drag.id,
            offsetX: layer.x - cx,
            offsetY: layer.y - cy,
          };
        }
        return;
      }

      if (drag.type === 'move') {
        const newX = Math.round(cx + drag.offsetX);
        const newY = Math.round(cy + drag.offsetY);

        const snaps = calcSnapLines(drag.id, newX, newY, layer.width, layer.fontSize);
        setSnapLines(snaps);

        // Snap apply
        let finalX = newX;
        let finalY = newY;
        if (snaps.x.length > 0) {
          const centerX = newX + layer.width / 2;
          for (const sx of snaps.x) {
            if (Math.abs(centerX - sx) < SNAP_THRESHOLD) {
              finalX = sx - layer.width / 2;
              break;
            }
            if (Math.abs(newX - sx) < SNAP_THRESHOLD) {
              finalX = sx;
              break;
            }
          }
          // Haptic on snap
          if ('vibrate' in navigator) navigator.vibrate([5, 5, 5]);
        }

        onUpdateLayer(drag.id, { x: finalX, y: finalY });
      }

      if (drag.type === 'resize') {
        const deltaX = cx - drag.startX;
        if (drag.handle === 'ne' || drag.handle === 'se') {
          const newWidth = Math.max(50, Math.round(drag.startWidth + deltaX));
          onUpdateLayer(drag.id, { width: newWidth });
        } else {
          const newWidth = Math.max(50, Math.round(drag.startWidth - deltaX));
          const newX = Math.round(drag.startLayerX + (drag.startWidth - newWidth));
          onUpdateLayer(drag.id, { width: newWidth, x: newX });
        }
      }

      if (drag.type === 'rotate') {
        const rawAngle = Math.atan2(cy - drag.centerY, cx - drag.centerX) * 180 / Math.PI;
        let angle = rawAngle - drag.startAngle;
        angle = ((angle % 360) + 360) % 360;

        // Snap to 45° increments
        for (const snap of ROTATION_SNAP_ANGLES) {
          if (Math.abs(angle - snap) <= ROTATION_SNAP_THRESHOLD) {
            angle = snap === 360 ? 0 : snap;
            if ('vibrate' in navigator) navigator.vibrate(10);
            break;
          }
        }

        onUpdateLayer(drag.id, { rotation: Math.round(angle) });
      }
    };

    const onUp = () => {
      dragRef.current = null;
      setSnapLines({ x: [], y: [] });
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [layers, selectedLayerId, clientToCanvas, onSelectLayer, onUpdateLayer, onLayerTapped, onEnterEditMode, calcSnapLines]);

  // Handle pointer down on a selection handle
  const handleHandlePointerDown = useCallback((e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.locked) return;

    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    if (handle === 'rotate') {
      const h = estimateHeight(layer);
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + h / 2;
      const startAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI - layer.rotation;

      dragRef.current = {
        type: 'rotate',
        id: layer.id,
        centerX,
        centerY,
        startAngle,
      };
    } else {
      dragRef.current = {
        type: 'resize',
        id: layer.id,
        handle,
        startX: x,
        startY: y,
        startWidth: layer.width,
        startLayerX: layer.x,
      };
    }

    // Same global listeners pattern
    const onMove = (me: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const { x: cx, y: cy } = clientToCanvas(me.clientX, me.clientY);

      if (drag.type === 'resize') {
        const deltaX = cx - drag.startX;
        if (drag.handle === 'ne' || drag.handle === 'se') {
          const newWidth = Math.max(50, Math.round(drag.startWidth + deltaX));
          onUpdateLayer(drag.id, { width: newWidth });
        } else {
          const newWidth = Math.max(50, Math.round(drag.startWidth - deltaX));
          const newX = Math.round(drag.startLayerX + (drag.startWidth - newWidth));
          onUpdateLayer(drag.id, { width: newWidth, x: newX });
        }
      }

      if (drag.type === 'rotate') {
        const rawAngle = Math.atan2(cy - drag.centerY, cx - drag.centerX) * 180 / Math.PI;
        let angle = rawAngle - drag.startAngle;
        angle = ((angle % 360) + 360) % 360;

        for (const snap of ROTATION_SNAP_ANGLES) {
          if (Math.abs(angle - snap) <= ROTATION_SNAP_THRESHOLD) {
            angle = snap === 360 ? 0 : snap;
            if ('vibrate' in navigator) navigator.vibrate(10);
            break;
          }
        }

        onUpdateLayer(drag.id, { rotation: Math.round(angle) });
      }
    };

    const onUp = () => {
      dragRef.current = null;
      setSnapLines({ x: [], y: [] });
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [layers, selectedLayerId, clientToCanvas, onUpdateLayer]);

  return {
    snapLines,
    handleElementPointerDown,
    handleHandlePointerDown,
  };
}
