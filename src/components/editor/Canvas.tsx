import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EditorState, TextLayer } from '../../types';

/**
 * Draw an image onto a canvas using "cover" behaviour:
 * scale to fill while maintaining aspect ratio, then center-crop.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasW / canvasH;

  let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;

  if (imgRatio > canvasRatio) {
    // Image is wider than canvas — crop sides
    srcW = img.naturalHeight * canvasRatio;
    srcX = (img.naturalWidth - srcW) / 2;
  } else {
    // Image is taller than canvas — crop top/bottom
    srcH = img.naturalWidth / canvasRatio;
    srcY = (img.naturalHeight - srcH) / 2;
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvasW, canvasH);
}

interface CanvasProps {
  state: EditorState;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, changes: Partial<TextLayer>) => void;
  zoomOverride?: number;  // Manual zoom override (0.25 to 2)
  onLayerTapped?: (layer: TextLayer) => void; // Called when a layer is tapped on mobile
}

export interface CanvasHandle {
  exportImage: () => string | null;
  getScale: () => number;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ state, onSelectLayer, onUpdateLayer, zoomOverride, onLayerTapped }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgLoading, setBgLoading] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showEditHint, setShowEditHint] = useState(false);

  // Wait for fonts to load before trusting canvas text metrics
  useEffect(() => {
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  // Scale canvas to fit container (or use manual zoom)
  useEffect(() => {
    if (zoomOverride !== undefined) {
      setScale(zoomOverride);
      return;
    }
    const resize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth - 32;
      const containerHeight = containerRef.current.offsetHeight - 32;
      // Guard against 0 or negative container dimensions (before layout settles)
      if (containerWidth <= 0 || containerHeight <= 0) return;
      const s = Math.min(containerWidth / state.canvasWidth, containerHeight / state.canvasHeight, 1);
      setScale(Math.max(s, 0.05)); // Never go below 5%
    };
    resize();
    // Re-calculate after a brief delay so layout has settled
    const raf = requestAnimationFrame(resize);
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, [state.canvasWidth, state.canvasHeight, zoomOverride]);

  // Load background image — fixed: no crossOrigin for display, proper error handling
  useEffect(() => {
    if (!state.backgroundImage) {
      setBgImage(null);
      setBgLoading(false);
      return;
    }

    setBgLoading(true);
    const img = new Image();

    img.onload = () => {
      setBgImage(img);
      setBgLoading(false);
    };

    img.onerror = () => {
      // Retry with crossOrigin if first attempt fails
      const img2 = new Image();
      img2.crossOrigin = 'anonymous';
      img2.onload = () => {
        setBgImage(img2);
        setBgLoading(false);
      };
      img2.onerror = () => {
        setBgLoading(false);
        toast.error('Failed to load background image');
      };
      img2.src = state.backgroundImage!;
    };

    img.src = state.backgroundImage;
  }, [state.backgroundImage]);

  // Snap guide calculation
  const calcSnapLines = useCallback((movingId: string, newX: number, newY: number, layerWidth: number, layerHeight: number) => {
    const SNAP_THRESHOLD = 8;
    const xSnaps: number[] = [];
    const ySnaps: number[] = [];

    const movingCenterX = newX + layerWidth / 2;
    const movingCenterY = newY + layerHeight / 2;
    const movingRight = newX + layerWidth;
    const movingBottom = newY + layerHeight;

    // Canvas center snaps
    const canvasCenterX = state.canvasWidth / 2;
    const canvasCenterY = state.canvasHeight / 2;

    if (Math.abs(movingCenterX - canvasCenterX) < SNAP_THRESHOLD) xSnaps.push(canvasCenterX);
    if (Math.abs(movingCenterY - canvasCenterY) < SNAP_THRESHOLD) ySnaps.push(canvasCenterY);

    // Canvas edge snaps
    if (Math.abs(newX) < SNAP_THRESHOLD) xSnaps.push(0);
    if (Math.abs(movingRight - state.canvasWidth) < SNAP_THRESHOLD) xSnaps.push(state.canvasWidth);
    if (Math.abs(newY) < SNAP_THRESHOLD) ySnaps.push(0);
    if (Math.abs(movingBottom - state.canvasHeight) < SNAP_THRESHOLD) ySnaps.push(state.canvasHeight);

    // Other layer snaps
    for (const layer of state.layers) {
      if (layer.id === movingId || !layer.visible) continue;
      const lCenterX = layer.x + layer.width / 2;
      const lCenterY = layer.y + layer.fontSize / 2;

      if (Math.abs(movingCenterX - lCenterX) < SNAP_THRESHOLD) xSnaps.push(lCenterX);
      if (Math.abs(movingCenterY - lCenterY) < SNAP_THRESHOLD) ySnaps.push(lCenterY);
      if (Math.abs(newX - layer.x) < SNAP_THRESHOLD) xSnaps.push(layer.x);
      if (Math.abs(movingRight - (layer.x + layer.width)) < SNAP_THRESHOLD) xSnaps.push(layer.x + layer.width);
    }

    return { x: xSnaps, y: ySnaps };
  }, [state.layers, state.canvasWidth, state.canvasHeight]);

  // Build CSS filter string from imageFilters
  const buildFilterString = useCallback((filters: EditorState['imageFilters']) => {
    const parts: string[] = [];
    if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
    if (filters.saturation !== 100) parts.push(`saturate(${filters.saturation}%)`);
    if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
    return parts.length > 0 ? parts.join(' ') : 'none';
  }, []);

  // Parse CSS linear-gradient and render on canvas
  const renderGradient = useCallback((ctx: CanvasRenderingContext2D, gradientStr: string, w: number, h: number) => {
    // Parse: linear-gradient(135deg, #color1 0%, #color2 100%)
    const match = gradientStr.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\)/);
    if (!match) return;
    const angle = parseFloat(match[1]);
    const stops = match[2].split(',').map(s => s.trim());

    // Convert angle to start/end points
    const rad = (angle - 90) * Math.PI / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.sqrt(w * w + h * h) / 2;
    const x0 = cx - Math.cos(rad) * len;
    const y0 = cy - Math.sin(rad) * len;
    const x1 = cx + Math.cos(rad) * len;
    const y1 = cy + Math.sin(rad) * len;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const stop of stops) {
      const parts = stop.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s+([\d.]+)%/);
      if (parts) {
        grad.addColorStop(parseFloat(parts[2]) / 100, parts[1]);
      }
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  // Render canvas
  const render = useCallback((highlightSelected = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    // Background color
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    // Background gradient (templates)
    if (state.backgroundGradient) {
      renderGradient(ctx, state.backgroundGradient, state.canvasWidth, state.canvasHeight);
    }

    // Background image with filters
    if (bgImage) {
      ctx.save();
      const filterStr = buildFilterString(state.imageFilters);
      if (filterStr !== 'none') ctx.filter = filterStr;
      drawImageCover(ctx, bgImage, state.canvasWidth, state.canvasHeight);
      ctx.filter = 'none';
      ctx.restore();

      // Color overlay
      if (state.imageFilters.overlayOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = state.imageFilters.overlayOpacity;
        ctx.fillStyle = state.imageFilters.overlayColor;
        ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
        ctx.restore();
      }
    }

    // Text layers
    for (const layer of state.layers) {
      if (editing === layer.id) continue;
      if (!layer.visible) continue;
      ctx.save();

      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.3;
      const totalTextHeight = lines.length > 1 ? (lines.length - 1) * lineHeight + layer.fontSize : layer.fontSize;

      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + totalTextHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      ctx.globalAlpha = layer.opacity;

      // Font
      const fontParts: string[] = [];
      if (layer.fontStyle.includes('italic')) fontParts.push('italic');
      if (layer.fontStyle.includes('bold')) fontParts.push('bold');
      fontParts.push(`${layer.fontSize}px`);
      fontParts.push(`"${layer.fontFamily}"`);
      ctx.font = fontParts.join(' ');
      ctx.textAlign = layer.align;
      ctx.textBaseline = 'top';

      let textX = layer.x;
      if (layer.align === 'center') textX = layer.x + layer.width / 2;
      else if (layer.align === 'right') textX = layer.x + layer.width;

      // Shadow
      if (layer.shadowBlur > 0) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = layer.shadowBlur;
        ctx.shadowOffsetX = layer.shadowOffsetX;
        ctx.shadowOffsetY = layer.shadowOffsetY;
      }

      // Draw each line
      for (let li = 0; li < lines.length; li++) {
        const lineY = layer.y + li * lineHeight;
        const lineText = lines[li];

        // Stroke
        if (layer.stroke && layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.stroke;
          ctx.lineWidth = layer.strokeWidth;
          ctx.lineJoin = 'round';
          drawText(ctx, lineText, textX, lineY, layer.letterSpacing, true);
          if (li === 0) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }
        }

        // Fill
        ctx.fillStyle = layer.fill;
        drawText(ctx, lineText, textX, lineY, layer.letterSpacing, false);

        // Underline
        if (layer.textDecoration === 'underline') {
          const metrics = ctx.measureText(lineText);
          const uY = lineY + layer.fontSize + 2;
          ctx.strokeStyle = layer.fill;
          ctx.lineWidth = Math.max(1, layer.fontSize / 20);
          let uX = textX;
          if (layer.align === 'center') uX = textX - metrics.width / 2;
          else if (layer.align === 'right') uX = textX - metrics.width;
          ctx.beginPath();
          ctx.moveTo(uX, uY);
          ctx.lineTo(uX + metrics.width, uY);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Hover highlight (faint border)
      if (highlightSelected && layer.id === hoveredLayerId && layer.id !== state.selectedLayerId) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(layer.x - 4, layer.y - 4, layer.width + 8, totalTextHeight + 12);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Selection box
      if (highlightSelected && layer.id === state.selectedLayerId) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(layer.x - 4, layer.y - 4, layer.width + 8, totalTextHeight + 12);
        ctx.setLineDash([]);

        // Corner handles
        const handles = [
          [layer.x - 4, layer.y - 4],
          [layer.x + layer.width + 4, layer.y - 4],
          [layer.x - 4, layer.y + totalTextHeight + 8],
          [layer.x + layer.width + 4, layer.y + totalTextHeight + 8],
        ];
        for (const [hx, hy] of handles) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#2dd4bf';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Lock indicator
        if (layer.locked) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = '20px system-ui';
          ctx.textAlign = 'right';
          ctx.fillText('🔒', layer.x + layer.width + 4, layer.y - 24);
        }

        ctx.restore();
      }
    }

    // Draw snap guides
    if (highlightSelected && (snapLines.x.length > 0 || snapLines.y.length > 0)) {
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (const x of snapLines.x) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.canvasHeight);
        ctx.stroke();
      }
      for (const y of snapLines.y) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.canvasWidth, y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [state, bgImage, editing, snapLines, hoveredLayerId, buildFilterString, renderGradient]);

  useEffect(() => { render(); }, [render]);

  // Re-render once fonts finish loading for accurate text metrics
  useEffect(() => {
    if (fontsLoaded) render();
  }, [fontsLoaded, render]);

  useImperativeHandle(ref, () => ({
    getScale: () => scale,
    exportImage: () => {
      // For export, need crossOrigin on the image
      if (bgImage && !bgImage.crossOrigin) {
        // Re-render with a crossOrigin-enabled image for export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = state.canvasWidth;
        exportCanvas.height = state.canvasHeight;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return null;

        // Draw background color
        ctx.fillStyle = state.backgroundColor;
        ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

        // Draw gradient if present
        if (state.backgroundGradient) {
          renderGradient(ctx, state.backgroundGradient, state.canvasWidth, state.canvasHeight);
        }

        // Draw the image (may taint the canvas, but try)
        const filterStr = buildFilterString(state.imageFilters);
        if (filterStr !== 'none') ctx.filter = filterStr;
        drawImageCover(ctx, bgImage, state.canvasWidth, state.canvasHeight);
        ctx.filter = 'none';

        // Overlay
        if (state.imageFilters.overlayOpacity > 0) {
          ctx.globalAlpha = state.imageFilters.overlayOpacity;
          ctx.fillStyle = state.imageFilters.overlayColor;
          ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
          ctx.globalAlpha = 1;
        }

        // Draw all visible text layers
        for (const layer of state.layers) {
          if (!layer.visible) continue;
          drawLayerToCtx(ctx, layer);
        }

        try {
          return exportCanvas.toDataURL('image/png');
        } catch {
          // If tainted, fall back to main canvas
          render(false);
          const dataUrl = canvasRef.current?.toDataURL('image/png') ?? null;
          render(true);
          return dataUrl;
        }
      }

      render(false);
      const dataUrl = canvasRef.current?.toDataURL('image/png') ?? null;
      render(true);
      return dataUrl;
    },
  }));

  // Hit test
  const hitTest = useCallback((clientX: number, clientY: number): TextLayer | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;

    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i];
      if (!layer.visible) continue;
      const pad = 8;
      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.3;
      const totalH = lines.length > 1 ? (lines.length - 1) * lineHeight + layer.fontSize : layer.fontSize;
      if (x >= layer.x - pad && x <= layer.x + layer.width + pad &&
          y >= layer.y - pad && y <= layer.y + totalH + pad) {
        return layer;
      }
    }
    return null;
  }, [state.layers, scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      onSelectLayer(hit.id);
      setShowEditHint(true);
      setTimeout(() => setShowEditHint(false), 2000);
      if (hit.locked) return; // Can select but not drag locked layers
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      setDragging({ id: hit.id, offsetX: x - hit.x, offsetY: y - hit.y });
    } else {
      onSelectLayer(null);
      setShowEditHint(false);
    }
  }, [hitTest, onSelectLayer, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Hover detection (when not dragging)
    if (!dragging) {
      const hit = hitTest(e.clientX, e.clientY);
      const newHoveredId = hit ? hit.id : null;
      if (newHoveredId !== hoveredLayerId) {
        setHoveredLayerId(newHoveredId);
      }
      // Update cursor
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = hit ? (hit.locked ? 'not-allowed' : 'move') : 'default';
      }
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const newX = Math.round(x - dragging.offsetX);
    const newY = Math.round(y - dragging.offsetY);

    const layer = state.layers.find(l => l.id === dragging.id);
    if (layer) {
      const snaps = calcSnapLines(dragging.id, newX, newY, layer.width, layer.fontSize);
      setSnapLines(snaps);
    }

    onUpdateLayer(dragging.id, { x: newX, y: newY });
  }, [dragging, scale, onUpdateLayer, state.layers, calcSnapLines, hitTest, hoveredLayerId]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setSnapLines({ x: [], y: [] });
  }, []);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit || !containerRef.current || hit.locked) return;
    openInlineEditor(hit);
  }, [hitTest, scale, onSelectLayer, onUpdateLayer]);

  // Shared inline editor for both mouse double-click and touch double-tap
  const openInlineEditor = useCallback((hit: TextLayer) => {
    if (!containerRef.current) return;
    setEditing(hit.id);
    onSelectLayer(hit.id);

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const textarea = document.createElement('textarea');
    containerRef.current.appendChild(textarea);

    textarea.value = hit.text;
    textarea.style.position = 'absolute';
    textarea.style.left = `${hit.x * scale + (rect.left - containerRect.left)}px`;
    textarea.style.top = `${hit.y * scale + (rect.top - containerRect.top)}px`;
    textarea.style.width = `${hit.width * scale + 4}px`;
    textarea.style.minHeight = `${(hit.fontSize + 8) * scale}px`;
    textarea.style.fontSize = `${hit.fontSize * scale}px`;
    textarea.style.fontFamily = hit.fontFamily;
    textarea.style.color = hit.fill;
    textarea.style.textAlign = hit.align;
    textarea.style.background = 'rgba(0,0,0,0.4)';
    textarea.style.border = '2px solid #2dd4bf';
    textarea.style.borderRadius = '4px';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.padding = '2px 4px';
    textarea.style.zIndex = '100';
    textarea.style.lineHeight = '1.2';
    textarea.style.overflow = 'hidden';
    textarea.focus();
    textarea.select();

    const handleBlur = () => {
      onUpdateLayer(hit.id, { text: textarea.value });
      textarea.remove();
      setEditing(null);
    };
    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') textarea.blur();
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); textarea.blur(); }
    });
  }, [scale, onSelectLayer, onUpdateLayer]);

  // --- Touch event handlers for mobile layer interaction ---
  const touchDragRef = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const lastTapRef = useRef<{ time: number; layerId: string | null }>({ time: 0, layerId: null });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single-finger touches (let pinch-zoom pass through)
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const hit = hitTest(touch.clientX, touch.clientY);

    if (hit) {
      // Stop the event from reaching useTouchCanvas so it doesn't interfere
      e.stopPropagation();
      onSelectLayer(hit.id);
      onLayerTapped?.(hit);

      if (!hit.locked) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / scale;
        const y = (touch.clientY - rect.top) / scale;
        touchDragRef.current = { id: hit.id, offsetX: x - hit.x, offsetY: y - hit.y, moved: false };
      }
    } else {
      onSelectLayer(null);
    }
  }, [hitTest, onSelectLayer, onLayerTapped, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !touchDragRef.current) return;

    // Prevent scroll while dragging a layer
    e.preventDefault();
    e.stopPropagation();
    touchDragRef.current.moved = true;

    const touch = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / scale;
    const y = (touch.clientY - rect.top) / scale;
    const newX = Math.round(x - touchDragRef.current.offsetX);
    const newY = Math.round(y - touchDragRef.current.offsetY);

    const layer = state.layers.find(l => l.id === touchDragRef.current!.id);
    if (layer) {
      const snaps = calcSnapLines(touchDragRef.current.id, newX, newY, layer.width, layer.fontSize);
      setSnapLines(snaps);
    }

    onUpdateLayer(touchDragRef.current.id, { x: newX, y: newY });
  }, [scale, onUpdateLayer, state.layers, calcSnapLines]);

  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    const dragInfo = touchDragRef.current;
    touchDragRef.current = null;
    setSnapLines({ x: [], y: [] });

    if (!dragInfo || dragInfo.moved) return;

    // Detect double-tap on a layer for inline editing
    const now = Date.now();
    const layerId = dragInfo.id;
    if (lastTapRef.current.layerId === layerId && now - lastTapRef.current.time < 400) {
      // Double-tap detected
      const layer = state.layers.find(l => l.id === layerId);
      if (layer && !layer.locked) {
        openInlineEditor(layer);
      }
      lastTapRef.current = { time: 0, layerId: null };
    } else {
      lastTapRef.current = { time: now, layerId };
      // Show edit hint on single tap
      setShowEditHint(true);
      setTimeout(() => setShowEditHint(false), 2000);
    }
  }, [state.layers, openInlineEditor]);

  return (
    <div ref={containerRef} className="relative flex justify-center items-start w-full h-full">
      {/* Loading overlay */}
      {bgLoading && (
        <div
          className="absolute z-10 flex items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm"
          style={{
            width: state.canvasWidth * scale,
            height: state.canvasHeight * scale,
          }}
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Loading image...</span>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={state.canvasWidth}
        height={state.canvasHeight}
        style={{
          width: state.canvasWidth * scale,
          height: state.canvasHeight * scale,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          borderRadius: '8px',
          cursor: dragging ? 'grabbing' : 'default',
          touchAction: 'none', // Prevent browser gestures on the canvas
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredLayerId(null); }}
        onDoubleClick={handleDblClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Edit hint tooltip */}
      {showEditHint && state.selectedLayerId && !editing && (
        <div
          className="absolute pointer-events-none animate-fade-in"
          style={{
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }}
        >
          <div className="bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
            Tap again to edit text
          </div>
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

// Helper to draw a single layer to any canvas context (used for export)
function drawLayerToCtx(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  ctx.save();

  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.fontSize / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  ctx.globalAlpha = layer.opacity;

  const fontParts: string[] = [];
  if (layer.fontStyle.includes('italic')) fontParts.push('italic');
  if (layer.fontStyle.includes('bold')) fontParts.push('bold');
  fontParts.push(`${layer.fontSize}px`);
  fontParts.push(`"${layer.fontFamily}"`);
  ctx.font = fontParts.join(' ');
  ctx.textAlign = layer.align;
  ctx.textBaseline = 'top';

  let textX = layer.x;
  if (layer.align === 'center') textX = layer.x + layer.width / 2;
  else if (layer.align === 'right') textX = layer.x + layer.width;

  if (layer.shadowBlur > 0) {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  }

  if (layer.stroke && layer.strokeWidth > 0) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth;
    ctx.lineJoin = 'round';
    drawText(ctx, layer.text, textX, layer.y, layer.letterSpacing, true);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = layer.fill;
  drawText(ctx, layer.text, textX, layer.y, layer.letterSpacing, false);

  if (layer.textDecoration === 'underline') {
    const metrics = ctx.measureText(layer.text);
    const uY = layer.y + layer.fontSize + 2;
    ctx.strokeStyle = layer.fill;
    ctx.lineWidth = Math.max(1, layer.fontSize / 20);
    let uX = textX;
    if (layer.align === 'center') uX = textX - metrics.width / 2;
    else if (layer.align === 'right') uX = textX - metrics.width;
    ctx.beginPath();
    ctx.moveTo(uX, uY);
    ctx.lineTo(uX + metrics.width, uY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, isStroke: boolean) {
  if (spacing === 0) {
    if (isStroke) ctx.strokeText(text, x, y);
    else ctx.fillText(text, x, y);
    return;
  }
  const chars = text.split('');
  let currentX = x;
  const align = ctx.textAlign as CanvasTextAlign;
  if (align === 'center' || align === 'right') {
    let totalWidth = 0;
    for (const ch of chars) totalWidth += ctx.measureText(ch).width + spacing;
    totalWidth -= spacing;
    if (align === 'center') currentX -= totalWidth / 2;
    else currentX -= totalWidth;
  }
  ctx.textAlign = 'left';
  for (const ch of chars) {
    if (isStroke) ctx.strokeText(ch, currentX, y);
    else ctx.fillText(ch, currentX, y);
    currentX += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = align;
}
