import { useCallback, useRef, useState } from 'react';

interface TouchCanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function useTouchCanvas() {
  const [transform, setTransform] = useState<TouchCanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const touchRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    lastTouchCount: 0,
    panStartX: 0,
    panStartY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      touchRef.current.initialDistance = getTouchDistance(e.touches);
      touchRef.current.initialScale = transform.scale;
      touchRef.current.lastTouchCount = 2;
    } else if (e.touches.length === 1 && transform.scale > 1) {
      // Pan start (only when zoomed in)
      touchRef.current.panStartX = e.touches[0].clientX;
      touchRef.current.panStartY = e.touches[0].clientY;
      touchRef.current.initialOffsetX = transform.offsetX;
      touchRef.current.initialOffsetY = transform.offsetY;
      touchRef.current.lastTouchCount = 1;
    }
  }, [transform.scale, transform.offsetX, transform.offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const ratio = currentDistance / touchRef.current.initialDistance;
      const newScale = Math.min(Math.max(touchRef.current.initialScale * ratio, 0.5), 3);
      setTransform(prev => ({ ...prev, scale: newScale }));
    } else if (e.touches.length === 1 && touchRef.current.lastTouchCount !== 2 && transform.scale > 1) {
      // Pan (only when zoomed)
      const dx = e.touches[0].clientX - touchRef.current.panStartX;
      const dy = e.touches[0].clientY - touchRef.current.panStartY;
      setTransform(prev => ({
        ...prev,
        offsetX: touchRef.current.initialOffsetX + dx,
        offsetY: touchRef.current.initialOffsetY + dy,
      }));
    }
  }, [transform.scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      touchRef.current.lastTouchCount = 0;
    }
  }, []);

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  const containerStyle: React.CSSProperties = {
    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
    touchAction: transform.scale > 1 ? 'none' : 'pan-y',
  };

  return {
    transform,
    containerStyle,
    resetTransform,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
