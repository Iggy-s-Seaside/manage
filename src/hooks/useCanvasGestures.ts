import { useRef, useCallback, useEffect, useState } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const DOUBLE_TAP_WINDOW = 300;
const DOUBLE_TAP_DISTANCE = 20;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_THRESHOLD = 0.5;

interface Pointer {
  id: number;
  x: number;
  y: number;
}

interface UseCanvasGesturesOptions {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  baseScale: number;
  canvasWidth: number;
  canvasHeight: number;
  hasSelectedElement: boolean;
  isEditing: boolean;
  onZoomChange?: (zoom: number) => void;
}

export function useCanvasGestures({
  viewportRef,
  baseScale,
  canvasWidth,
  canvasHeight,
  hasSelectedElement,
  isEditing,
  onZoomChange,
}: UseCanvasGesturesOptions) {
  // All animation state in refs for 60fps
  const zoomRef = useRef(baseScale);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const pointersRef = useRef<Pointer[]>([]);
  const initialPinchDistRef = useRef(0);
  const initialPinchZoomRef = useRef(1);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const momentumRafRef = useRef(0);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const isAnimatingRef = useRef(false);

  // React state for rendering (updated less frequently)
  const [currentZoom, setCurrentZoom] = useState(baseScale);
  const [currentPanX, setCurrentPanX] = useState(0);
  const [currentPanY, setCurrentPanY] = useState(0);

  // Sync base scale changes (e.g., window resize, manual zoom buttons)
  useEffect(() => {
    zoomRef.current = baseScale;
    setCurrentZoom(baseScale);
    // Center canvas
    centerCanvas(baseScale);
  }, [baseScale, canvasWidth, canvasHeight]);

  const centerCanvas = useCallback((zoom: number) => {
    if (!viewportRef.current) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const px = (vw - canvasWidth * zoom) / 2;
    const py = (vh - canvasHeight * zoom) / 2;
    panXRef.current = px;
    panYRef.current = py;
    setCurrentPanX(px);
    setCurrentPanY(py);
  }, [viewportRef, canvasWidth, canvasHeight]);

  // Commit ref values to React state (batched)
  const commitToState = useCallback(() => {
    setCurrentZoom(zoomRef.current);
    setCurrentPanX(panXRef.current);
    setCurrentPanY(panYRef.current);
    onZoomChange?.(zoomRef.current);
  }, [onZoomChange]);

  const getPointerDistance = (p1: Pointer, p2: Pointer) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Animate smooth reset
  const animateToReset = useCallback(() => {
    if (!viewportRef.current) return;
    isAnimatingRef.current = true;

    const targetZoom = baseScale;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const targetPanX = (vw - canvasWidth * targetZoom) / 2;
    const targetPanY = (vh - canvasHeight * targetZoom) / 2;

    const startZoom = zoomRef.current;
    const startPanX = panXRef.current;
    const startPanY = panYRef.current;
    const startTime = performance.now();
    const duration = 300;

    const ease = (t: number) => {
      // cubic-bezier(0.25, 0.1, 0.25, 1.0) approximation
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const e = ease(t);

      zoomRef.current = startZoom + (targetZoom - startZoom) * e;
      panXRef.current = startPanX + (targetPanX - startPanX) * e;
      panYRef.current = startPanY + (targetPanY - startPanY) * e;
      commitToState();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, [baseScale, canvasWidth, canvasHeight, viewportRef, commitToState]);

  // Momentum animation
  const startMomentum = useCallback(() => {
    cancelAnimationFrame(momentumRafRef.current);
    const animate = () => {
      velocityRef.current.x *= MOMENTUM_FRICTION;
      velocityRef.current.y *= MOMENTUM_FRICTION;

      if (Math.abs(velocityRef.current.x) < MOMENTUM_THRESHOLD &&
          Math.abs(velocityRef.current.y) < MOMENTUM_THRESHOLD) {
        return;
      }

      panXRef.current += velocityRef.current.x;
      panYRef.current += velocityRef.current.y;
      commitToState();
      momentumRafRef.current = requestAnimationFrame(animate);
    };
    momentumRafRef.current = requestAnimationFrame(animate);
  }, [commitToState]);

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isAnimatingRef.current) return;
    if (isEditing) return; // Don't capture gestures in edit mode

    // Check for double-tap
    const now = Date.now();
    const dx = e.clientX - lastTapRef.current.x;
    const dy = e.clientY - lastTapRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (now - lastTapRef.current.time < DOUBLE_TAP_WINDOW && dist < DOUBLE_TAP_DISTANCE) {
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      animateToReset();
      return;
    }
    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };

    cancelAnimationFrame(momentumRafRef.current);

    const pointer: Pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    pointersRef.current = [...pointersRef.current.filter(p => p.id !== e.pointerId), pointer];

    if (pointersRef.current.length === 2) {
      // Start pinch zoom
      const [p1, p2] = pointersRef.current;
      initialPinchDistRef.current = getPointerDistance(p1, p2);
      initialPinchZoomRef.current = zoomRef.current;
      isPanningRef.current = false;
    } else if (pointersRef.current.length === 1) {
      // Potential pan start (only if no element selected, or 2-finger)
      if (!hasSelectedElement) {
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        velocityRef.current = { x: 0, y: 0 };
        lastMoveTimeRef.current = performance.now();
      }
    }
  }, [hasSelectedElement, isEditing, animateToReset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isAnimatingRef.current) return;

    // Update pointer in cache
    const idx = pointersRef.current.findIndex(p => p.id === e.pointerId);
    if (idx === -1) return;
    pointersRef.current[idx] = { id: e.pointerId, x: e.clientX, y: e.clientY };

    if (pointersRef.current.length === 2) {
      // Pinch zoom
      const [p1, p2] = pointersRef.current;
      const dist = getPointerDistance(p1, p2);
      const ratio = dist / initialPinchDistRef.current;
      let newZoom = initialPinchZoomRef.current * ratio;

      // Rubber-band at limits
      if (newZoom < MIN_ZOOM) {
        newZoom = MIN_ZOOM - (MIN_ZOOM - newZoom) * 0.3;
      } else if (newZoom > MAX_ZOOM) {
        newZoom = MAX_ZOOM + (newZoom - MAX_ZOOM) * 0.3;
      }

      // Focal point zoom toward midpoint of two fingers
      if (viewportRef.current) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const rect = viewportRef.current.getBoundingClientRect();
        const vpX = midX - rect.left;
        const vpY = midY - rect.top;

        // Point in canvas space before zoom
        const canvasX = (vpX - panXRef.current) / zoomRef.current;
        const canvasY = (vpY - panYRef.current) / zoomRef.current;

        // Apply new zoom and adjust pan so the focal point stays put
        panXRef.current = vpX - canvasX * newZoom;
        panYRef.current = vpY - canvasY * newZoom;
      }

      zoomRef.current = newZoom;
      commitToState();
      e.preventDefault();
    } else if (isPanningRef.current && pointersRef.current.length === 1) {
      // Single finger pan
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      panXRef.current += dx;
      panYRef.current += dy;

      // Track velocity for momentum
      const now = performance.now();
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        velocityRef.current.x = dx * 0.5 + velocityRef.current.x * 0.5;
        velocityRef.current.y = dy * 0.5 + velocityRef.current.y * 0.5;
      }
      lastMoveTimeRef.current = now;

      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      commitToState();
    }
  }, [viewportRef, commitToState]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current = pointersRef.current.filter(p => p.id !== e.pointerId);

    if (pointersRef.current.length === 0) {
      // Snap zoom back from rubber-band if needed
      if (zoomRef.current < MIN_ZOOM) {
        zoomRef.current = MIN_ZOOM;
        commitToState();
      } else if (zoomRef.current > MAX_ZOOM) {
        zoomRef.current = MAX_ZOOM;
        commitToState();
      }

      // Start momentum if panning
      if (isPanningRef.current) {
        isPanningRef.current = false;
        startMomentum();
      }
    } else if (pointersRef.current.length === 1) {
      // Went from 2 fingers to 1 — transition to pan
      isPanningRef.current = true;
      lastPanPointRef.current = {
        x: pointersRef.current[0].x,
        y: pointersRef.current[0].y,
      };
    }
  }, [commitToState, startMomentum]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    pointersRef.current = pointersRef.current.filter(p => p.id !== e.pointerId);
    isPanningRef.current = false;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(momentumRafRef.current);
  }, []);

  return {
    currentZoom,
    currentPanX,
    currentPanY,
    viewportHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
