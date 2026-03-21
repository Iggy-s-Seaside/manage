import { useRef, useCallback, useEffect, useState } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;

interface UseCanvasGesturesOptions {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  baseScale: number;
  canvasWidth: number;
  canvasHeight: number;
  hasSelectedElement: boolean;
  isEditing: boolean;
  onZoomChange?: (zoom: number) => void;
}

export function useCanvasGestures({
  viewportRef,
  contentRef,
  baseScale,
  canvasWidth,
  canvasHeight,
  hasSelectedElement,
  isEditing,
  onZoomChange,
}: UseCanvasGesturesOptions) {
  // Detect mobile once
  const isMobile = typeof window !== 'undefined'
    && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // All animation state in refs for 60fps — NO useState during gestures
  const zoomRef = useRef(baseScale);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  // React state — only updated on gesture END or external changes
  const [currentZoom, setCurrentZoom] = useState(baseScale);
  const [currentPanX, setCurrentPanX] = useState(0);
  const [currentPanY, setCurrentPanY] = useState(0);
  const [isGesturing, setIsGesturing] = useState(false);

  // Direct DOM update — 60fps, zero re-renders
  const applyTransform = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.style.transform =
      `translate(${panXRef.current}px, ${panYRef.current}px) scale(${zoomRef.current})`;
  }, [contentRef]);

  // Commit ref values to React state
  const commitToState = useCallback(() => {
    setCurrentZoom(zoomRef.current);
    setCurrentPanX(panXRef.current);
    setCurrentPanY(panYRef.current);
    onZoomChange?.(zoomRef.current);
  }, [onZoomChange]);

  // Center canvas in viewport
  const centerCanvas = useCallback((zoom: number) => {
    if (!viewportRef.current) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const scaledW = canvasWidth * zoom;
    const scaledH = canvasHeight * zoom;
    const px = (vw - scaledW) / 2;
    // On mobile, push canvas to top so it's fully visible above toolbar
    const mobileCheck = vw < 768;
    const toolbarHeight = mobileCheck ? 60 : 0;
    const visibleH = vh - toolbarHeight;
    const py = mobileCheck
      ? Math.max(4, (visibleH - scaledH) / 2)
      : (vh - scaledH) / 2;
    panXRef.current = px;
    panYRef.current = py;
    applyTransform();
  }, [viewportRef, canvasWidth, canvasHeight, applyTransform]);

  // Sync base scale changes (window resize, canvas size change)
  useEffect(() => {
    zoomRef.current = baseScale;
    centerCanvas(baseScale);
    commitToState();
  }, [baseScale, canvasWidth, canvasHeight]);

  // ══════════════════════════════════════════════════════════════════
  // MOBILE: No gesture handling at all.
  // Canvas stays auto-fit and centered. Can never be lost.
  // ══════════════════════════════════════════════════════════════════
  if (isMobile) {
    return {
      currentZoom,
      currentPanX,
      currentPanY,
      isGesturing: false,
      viewportHandlers: {},
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // DESKTOP ONLY: Pan & zoom gestures via mouse
  // ══════════════════════════════════════════════════════════════════

  // Desktop pan (mouse drag when no element selected)
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isEditing) return;
    if (hasSelectedElement) return;

    // Single-pointer pan on desktop
    if (e.pointerType === 'mouse') {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      setIsGesturing(true);
    }
  }, [hasSelectedElement, isEditing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;

    const dx = e.clientX - lastPanPointRef.current.x;
    const dy = e.clientY - lastPanPointRef.current.y;
    panXRef.current += dx;
    panYRef.current += dy;
    lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    applyTransform();
  }, [applyTransform]);

  const handlePointerUp = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;

    // Clamp pan so canvas can't go fully off-screen
    if (viewportRef.current) {
      const vw = viewportRef.current.clientWidth;
      const vh = viewportRef.current.clientHeight;
      const scaledW = canvasWidth * zoomRef.current;
      const scaledH = canvasHeight * zoomRef.current;
      const margin = 0.25;
      const minPanX = vw - scaledW * (1 - margin);
      const maxPanX = scaledW * margin;
      const minPanY = vh - scaledH * (1 - margin);
      const maxPanY = scaledH * margin;
      panXRef.current = Math.max(minPanX, Math.min(panXRef.current, maxPanX));
      panYRef.current = Math.max(minPanY, Math.min(panYRef.current, maxPanY));
      applyTransform();
    }

    setIsGesturing(false);
    commitToState();
  }, [applyTransform, commitToState, viewportRef, canvasWidth, canvasHeight]);

  const handlePointerCancel = useCallback(() => {
    isPanningRef.current = false;
    setIsGesturing(false);
  }, []);

  // Desktop mouse wheel zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      let newZoom = zoomRef.current * (1 + delta);
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

      // Zoom toward cursor
      const rect = viewport.getBoundingClientRect();
      const vpX = e.clientX - rect.left;
      const vpY = e.clientY - rect.top;
      const canvasX = (vpX - panXRef.current) / zoomRef.current;
      const canvasY = (vpY - panYRef.current) / zoomRef.current;
      panXRef.current = vpX - canvasX * newZoom;
      panYRef.current = vpY - canvasY * newZoom;

      zoomRef.current = newZoom;
      applyTransform();
      commitToState();
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [viewportRef, applyTransform, commitToState]);

  return {
    currentZoom,
    currentPanX,
    currentPanY,
    isGesturing,
    viewportHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
