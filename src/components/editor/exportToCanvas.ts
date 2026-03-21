import type { EditorState, ImageFilters, TextLayer } from '../../types';

/**
 * Build CSS filter string from ImageFilters.
 */
function buildFilterString(filters: ImageFilters): string {
  const parts: string[] = [];
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.saturation !== 100) parts.push(`saturate(${filters.saturation}%)`);
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

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
    srcW = img.naturalHeight * canvasRatio;
    srcX = (img.naturalWidth - srcW) / 2;
  } else {
    srcH = img.naturalWidth / canvasRatio;
    srcY = (img.naturalHeight - srcH) / 2;
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvasW, canvasH);
}

/**
 * Parse CSS linear-gradient and render on canvas.
 */
function renderGradient(ctx: CanvasRenderingContext2D, gradientStr: string, w: number, h: number) {
  const match = gradientStr.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\)/);
  if (!match) return;
  const angle = parseFloat(match[1]);
  const stops = match[2].split(',').map(s => s.trim());

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
}

/**
 * Draw text with letter-spacing support.
 */
function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, isStroke: boolean, lineHeightMultiplier = 1.3) {
  const lines = text.split('\n');
  const lineHeight = parseFloat(ctx.font) * lineHeightMultiplier;

  for (let i = 0; i < lines.length; i++) {
    const lineY = y + i * lineHeight;
    const line = lines[i];

    if (spacing === 0) {
      if (isStroke) ctx.strokeText(line, x, lineY);
      else ctx.fillText(line, x, lineY);
    } else {
      const chars = line.split('');
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
        if (isStroke) ctx.strokeText(ch, currentX, lineY);
        else ctx.fillText(ch, currentX, lineY);
        currentX += ctx.measureText(ch).width + spacing;
      }
      ctx.textAlign = align;
    }
  }
}

/**
 * Draw a single text layer to a canvas context.
 */
function drawLayerToCtx(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  ctx.save();

  // Rotation around layer center
  // Apply textTransform
  const displayText = layer.textTransform === 'uppercase' ? layer.text.toUpperCase()
    : layer.textTransform === 'lowercase' ? layer.text.toLowerCase()
    : layer.text;
  const lines = displayText.split('\n');
  const lh = layer.lineHeight || 1.3;
  const lineHeight = layer.fontSize * lh;
  const textHeight = lines.length > 1 ? (lines.length - 1) * lineHeight + layer.fontSize : layer.fontSize;
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + textHeight / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  ctx.globalAlpha = layer.opacity;

  // Font setup
  const fontParts: string[] = [];
  if (layer.fontStyle.includes('italic')) fontParts.push('italic');
  const isBold = layer.fontStyle.includes('bold');
  const effectiveWeight = isBold && (!layer.fontWeight || layer.fontWeight === 400) ? 700 : (layer.fontWeight || 400);
  fontParts.push(`${effectiveWeight}`);
  fontParts.push(`${layer.fontSize}px`);
  fontParts.push(`"${layer.fontFamily}"`);
  ctx.font = fontParts.join(' ');
  ctx.textAlign = layer.align;
  ctx.textBaseline = 'top';

  let textX = layer.x;
  if (layer.align === 'center') textX = layer.x + layer.width / 2;
  else if (layer.align === 'right') textX = layer.x + layer.width;

  // Shadow
  if (layer.shadowBlur > 0 || layer.shadowOffsetX !== 0 || layer.shadowOffsetY !== 0) {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  }

  // Stroke (drawn first, behind fill)
  if (layer.stroke && layer.strokeWidth > 0) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth;
    ctx.lineJoin = 'round';
    drawText(ctx, displayText, textX, layer.y, layer.letterSpacing, true, lh);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Fill
  ctx.fillStyle = layer.fill;
  drawText(ctx, displayText, textX, layer.y, layer.letterSpacing, false, lh);

  // Underline
  if (layer.textDecoration === 'underline') {
    const metrics = ctx.measureText(displayText.split('\n')[0]);
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

/**
 * Draw a divider element (horizontal lines with centered label).
 */
function drawDividerToCtx(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  ctx.save();
  ctx.globalAlpha = layer.opacity;

  const label = layer.dividerLabel || layer.text || '';
  const lineColor = layer.dividerLineColor || layer.fill || '#2dd4bf';
  const lineOpacity = layer.dividerLineOpacity ?? 0.4;
  const lineThickness = layer.dividerLineThickness ?? 1;
  const padding = layer.dividerPadding ?? 40;
  const gap = layer.dividerGap ?? 16;
  const labelFont = layer.fontFamily || 'Montserrat';
  const labelSize = layer.fontSize || 20;
  const labelWeight = layer.fontWeight || 600;
  const labelColor = layer.fill || '#2dd4bf';
  const labelSpacing = layer.letterSpacing || 4;

  const y = layer.y + 15; // center vertically in 30px height

  // Measure label
  ctx.font = `${labelWeight} ${labelSize}px "${labelFont}"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (label) {
    // Draw label with letter spacing
    let totalLabelWidth = 0;
    const chars = label.split('');
    for (const ch of chars) totalLabelWidth += ctx.measureText(ch).width + labelSpacing;
    totalLabelWidth -= labelSpacing;

    const centerX = layer.x + layer.width / 2;
    const labelStartX = centerX - totalLabelWidth / 2;
    const lineLeftStart = layer.x + padding;
    const lineLeftEnd = labelStartX - gap;
    const lineRightStart = labelStartX + totalLabelWidth + gap;
    const lineRightEnd = layer.x + layer.width - padding;

    // Left line
    ctx.globalAlpha = layer.opacity * lineOpacity;
    ctx.fillStyle = lineColor;
    ctx.fillRect(lineLeftStart, y - lineThickness / 2, lineLeftEnd - lineLeftStart, lineThickness);

    // Right line
    ctx.fillRect(lineRightStart, y - lineThickness / 2, lineRightEnd - lineRightStart, lineThickness);

    // Label text
    ctx.globalAlpha = layer.opacity;
    ctx.fillStyle = labelColor;
    let currentX = labelStartX;
    for (const ch of chars) {
      ctx.fillText(ch, currentX, y);
      currentX += ctx.measureText(ch).width + labelSpacing;
    }
  } else {
    // Just a line across
    ctx.globalAlpha = layer.opacity * lineOpacity;
    ctx.fillStyle = lineColor;
    ctx.fillRect(layer.x + padding, y - lineThickness / 2, layer.width - padding * 2, lineThickness);
  }

  ctx.restore();
}

/**
 * Draw an image layer element to the canvas context (synchronous — requires pre-loaded image).
 */
function drawImageLayerToCtx(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  if (!layer.imageSrc) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = layer.imageSrc;

  // Only works if the image is already cached/loaded (data URLs are always synchronous)
  if (!img.complete || img.naturalWidth === 0) return;

  ctx.save();
  ctx.globalAlpha = layer.opacity;

  // Blend mode mapping (CSS mix-blend-mode → Canvas globalCompositeOperation)
  if (layer.blendMode && layer.blendMode !== 'normal') {
    const blendMap: Record<string, GlobalCompositeOperation> = {
      'screen': 'screen',
      'multiply': 'multiply',
      'overlay': 'overlay',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'luminosity': 'luminosity',
      'darken': 'darken',
      'lighten': 'lighten',
    };
    const op = blendMap[layer.blendMode];
    if (op) ctx.globalCompositeOperation = op;
  }

  const layerW = layer.width;
  const layerH = layer.imageHeight || layer.width;
  const centerX = layer.x + layerW / 2;
  const centerY = layer.y + layerH / 2;

  if (layer.rotation !== 0) {
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Apply per-layer image filters
  if (layer.imageFilters) {
    const filterStr = buildFilterString(layer.imageFilters);
    if (filterStr !== 'none') ctx.filter = filterStr;
  }

  // Draw the image with appropriate fit
  const fit = layer.imageFit || 'cover';
  if (fit === 'cover') {
    // Cover: scale to fill, center-crop
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const layerRatio = layerW / layerH;
    let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
    if (imgRatio > layerRatio) {
      srcW = img.naturalHeight * layerRatio;
      srcX = (img.naturalWidth - srcW) / 2;
    } else {
      srcH = img.naturalWidth / layerRatio;
      srcY = (img.naturalHeight - srcH) / 2;
    }
    ctx.drawImage(img, srcX, srcY, srcW, srcH, layer.x, layer.y, layerW, layerH);
  } else if (fit === 'contain') {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const layerRatio = layerW / layerH;
    let drawW = layerW, drawH = layerH;
    if (imgRatio > layerRatio) {
      drawH = layerW / imgRatio;
    } else {
      drawW = layerH * imgRatio;
    }
    const drawX = layer.x + (layerW - drawW) / 2;
    const drawY = layer.y + (layerH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    ctx.drawImage(img, layer.x, layer.y, layerW, layerH);
  }

  ctx.filter = 'none';

  // Overlay color
  if (layer.imageFilters && layer.imageFilters.overlayOpacity > 0) {
    ctx.globalAlpha = layer.opacity * layer.imageFilters.overlayOpacity;
    ctx.fillStyle = layer.imageFilters.overlayColor;
    ctx.fillRect(layer.x, layer.y, layerW, layerH);
  }

  ctx.restore();
}

/**
 * Synchronously render the editor state to an off-screen canvas.
 * Returns the canvas element for toDataURL() or toBlob().
 *
 * NOTE: If the background image uses CORS, it must have been loaded
 * with crossOrigin="anonymous" and served with correct CORS headers
 * for the export to succeed. If it fails, we fall back to rendering
 * without the image.
 */
export function exportToCanvas(state: EditorState): HTMLCanvasElement {
  const { canvasWidth: w, canvasHeight: h } = state;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Background color
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  // 2. Background gradient
  if (state.backgroundGradient) {
    renderGradient(ctx, state.backgroundGradient, w, h);
  }

  // 3. Background image with filters
  if (state.backgroundImage) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = state.backgroundImage;

      // Check if image is already loaded (cached)
      if (img.complete && img.naturalWidth > 0) {
        const filterStr = buildFilterString(state.imageFilters);
        if (filterStr !== 'none') ctx.filter = filterStr;
        drawImageCover(ctx, img, w, h);
        ctx.filter = 'none';

        // Color overlay
        if (state.imageFilters.overlayOpacity > 0) {
          ctx.globalAlpha = state.imageFilters.overlayOpacity;
          ctx.fillStyle = state.imageFilters.overlayColor;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        }
      }
    } catch {
      // Image export failed (CORS), continue without it
    }
  }

  // 3b. Background darkening overlay
  if (state.backgroundOverlay) {
    ctx.fillStyle = state.backgroundOverlay;
    ctx.fillRect(0, 0, w, h);
  }

  // 4. Canvas elements (visible only)
  for (const layer of state.layers) {
    if (!layer.visible) continue;
    if (layer.elementType === 'divider') {
      drawDividerToCtx(ctx, layer);
    } else if (layer.elementType === 'image') {
      drawImageLayerToCtx(ctx, layer);
    } else {
      drawLayerToCtx(ctx, layer);
    }
  }

  return canvas;
}

/**
 * Async version that waits for background image to load.
 */
export async function exportToCanvasAsync(state: EditorState): Promise<HTMLCanvasElement> {
  const { canvasWidth: w, canvasHeight: h } = state;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Background color
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  // 2. Background gradient
  if (state.backgroundGradient) {
    renderGradient(ctx, state.backgroundGradient, w, h);
  }

  // 3. Background image with filters (async load)
  if (state.backgroundImage) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = state.backgroundImage!;
      });

      const filterStr = buildFilterString(state.imageFilters);
      if (filterStr !== 'none') ctx.filter = filterStr;
      drawImageCover(ctx, img, w, h);
      ctx.filter = 'none';

      if (state.imageFilters.overlayOpacity > 0) {
        ctx.globalAlpha = state.imageFilters.overlayOpacity;
        ctx.fillStyle = state.imageFilters.overlayColor;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    } catch {
      // CORS or network error, continue without image
    }
  }

  // 3b. Background darkening overlay
  if (state.backgroundOverlay) {
    ctx.fillStyle = state.backgroundOverlay;
    ctx.fillRect(0, 0, w, h);
  }

  // 4. Canvas elements (visible only)
  for (const layer of state.layers) {
    if (!layer.visible) continue;
    if (layer.elementType === 'divider') {
      drawDividerToCtx(ctx, layer);
    } else if (layer.elementType === 'image') {
      drawImageLayerToCtx(ctx, layer);
    } else {
      drawLayerToCtx(ctx, layer);
    }
  }

  return canvas;
}
