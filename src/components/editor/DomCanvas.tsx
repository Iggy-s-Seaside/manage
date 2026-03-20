import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useEffect,
  memo,
} from 'react';
import type { EditorState, TextLayer } from '../../types';
import { BackgroundLayer } from './BackgroundLayer';
import { TextElement } from './TextElement';
import { DividerElement } from './DividerElement';
import { ImageElement } from './ImageElement';
import { SelectionOverlay } from './SelectionOverlay';
import { ZoomIndicator } from './ZoomIndicator';
import { exportToCanvas } from './exportToCanvas';
import { useCanvasGestures } from '../../hooks/useCanvasGestures';
import { useElementInteraction } from '../../hooks/useElementInteraction';

interface DomCanvasProps {
  state: EditorState;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, changes: Partial<TextLayer>) => void;
  zoomOverride?: number;
  onLayerTapped?: (layer: TextLayer) => void;
  onScaleChange?: (scale: number) => void;
  onGestureChange?: (active: boolean) => void;
}

export interface DomCanvasHandle {
  exportImage: (format?: string, quality?: number) => string | null;
  getScale: () => number;
}

export const DomCanvas = memo(forwardRef<DomCanvasHandle, DomCanvasProps>(({
  state,
  onSelectLayer,
  onUpdateLayer,
  zoomOverride,
  onLayerTapped,
  onScaleChange,
  onGestureChange,
}, ref) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  // Calculate fit scale on mount and resize
  useEffect(() => {
    const calculate = () => {
      if (!viewportRef.current) return;
      const vw = viewportRef.current.clientWidth;
      const vh = viewportRef.current.clientHeight;
      const isMobile = vw < 768;
      // On mobile: minimal padding, account for toolbar overlay (60px)
      // On desktop: standard padding, fit both dimensions
      const padding = isMobile ? 8 : 16;
      const toolbarH = isMobile ? 60 : 0;
      const scaleX = (vw - padding) / state.canvasWidth;
      const scaleY = (vh - padding - toolbarH) / state.canvasHeight;
      // On mobile: fit canvas fully in the visible area (above toolbar)
      // so the entire design is visible without scrolling
      const newFit = isMobile
        ? Math.min(scaleX, scaleY, 1)
        : Math.min(scaleX, scaleY, 1);
      setFitScale(newFit);
    };

    calculate();
    const observer = new ResizeObserver(calculate);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [state.canvasWidth, state.canvasHeight]);

  // The effective base scale (fit or manual override)
  const baseScale = zoomOverride ?? fitScale;

  // Handle text editing (declared before hooks that reference it)
  const handleDoubleClick = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (layer && !layer.locked) {
      setEditingLayerId(layerId);
    }
  }, [state.layers]);

  // Gesture system for zoom/pan — uses contentRef for direct DOM transform
  const gestures = useCanvasGestures({
    viewportRef,
    contentRef,
    baseScale,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    hasSelectedElement: state.selectedLayerId !== null,
    isEditing: editingLayerId !== null,
    onZoomChange: onScaleChange,
  });

  // Element interaction (select, move, resize, rotate)
  const interaction = useElementInteraction({
    layers: state.layers,
    selectedLayerId: state.selectedLayerId,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    zoom: gestures.currentZoom,
    contentRef,
    onSelectLayer,
    onUpdateLayer,
    onLayerTapped,
    onEnterEditMode: handleDoubleClick,
  });

  // Expose imperative handle for export
  useImperativeHandle(ref, () => ({
    exportImage: (format?: string, quality?: number) => {
      try {
        const canvas = exportToCanvas(state);
        const mimeType = format || 'image/png';
        return canvas.toDataURL(mimeType, quality ?? 0.92);
      } catch {
        return null;
      }
    },
    getScale: () => gestures.currentZoom,
  }), [state, gestures.currentZoom]);

  // Report scale changes
  useEffect(() => {
    onScaleChange?.(gestures.currentZoom);
  }, [gestures.currentZoom, onScaleChange]);

  // Report gesture state changes (for toolbar auto-hide)
  useEffect(() => {
    onGestureChange?.(gestures.isGesturing);
  }, [gestures.isGesturing, onGestureChange]);

  const handleTextCommit = useCallback((layerId: string, text: string) => {
    onUpdateLayer(layerId, { text });
  }, [onUpdateLayer]);

  const handleEditEnd = useCallback(() => {
    setEditingLayerId(null);
  }, []);

  // Deselect on background click
  const handleBackgroundPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle direct clicks on the content div (not bubbled from elements)
    if (e.target === contentRef.current || (e.target as HTMLElement).dataset?.canvasBg !== undefined) {
      if (editingLayerId) {
        // Blur the contentEditable to trigger text commit before clearing edit state
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setEditingLayerId(null);
        return;
      }
      onSelectLayer(null);
    }
  }, [editingLayerId, onSelectLayer]);

  // Compute the final transform
  const zoom = gestures.currentZoom;
  const panX = gestures.currentPanX;
  const panY = gestures.currentPanY;

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-full overflow-hidden bg-black/20"
      style={{ touchAction: 'none' }}
      {...gestures.viewportHandlers}
    >
      {/* Transformed canvas content */}
      <div
        ref={contentRef}
        className="absolute origin-top-left"
        style={{
          width: state.canvasWidth,
          height: state.canvasHeight,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        onPointerDown={handleBackgroundPointerDown}
      >
        {/* Background layer */}
        <BackgroundLayer
          backgroundColor={state.backgroundColor}
          backgroundGradient={state.backgroundGradient}
          backgroundOverlay={state.backgroundOverlay}
          backgroundImage={state.backgroundImage}
          imageFilters={state.imageFilters}
        />

        {/* Canvas elements */}
        {state.layers.map((layer) =>
          layer.elementType === 'divider' ? (
            <DividerElement
              key={layer.id}
              layer={layer}
              isSelected={layer.id === state.selectedLayerId}
              onPointerDown={interaction.handleElementPointerDown}
            />
          ) : layer.elementType === 'image' ? (
            <ImageElement
              key={layer.id}
              layer={layer}
              isSelected={layer.id === state.selectedLayerId}
              onPointerDown={interaction.handleElementPointerDown}
            />
          ) : (
            <TextElement
              key={layer.id}
              layer={layer}
              isSelected={layer.id === state.selectedLayerId}
              isEditing={layer.id === editingLayerId}
              onPointerDown={interaction.handleElementPointerDown}
              onTextCommit={handleTextCommit}
              onEditEnd={handleEditEnd}
            />
          )
        )}

        {/* Selection overlay (handles, guides) */}
        {state.selectedLayerId && !editingLayerId && (
          <SelectionOverlay
            layer={state.layers.find(l => l.id === state.selectedLayerId)!}
            allLayers={state.layers}
            canvasWidth={state.canvasWidth}
            canvasHeight={state.canvasHeight}
            snapLines={interaction.snapLines}
            zoom={zoom}
            onHandlePointerDown={interaction.handleHandlePointerDown}
          />
        )}
      </div>

      {/* Zoom indicator (above canvas, not transformed) */}
      <ZoomIndicator zoom={gestures.currentZoom} />
    </div>
  );
}));

DomCanvas.displayName = 'DomCanvas';
