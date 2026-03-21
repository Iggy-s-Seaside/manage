import { memo, useCallback, useEffect, useState, useRef } from 'react';
import type { TextLayer } from '../../types';
import { resolveMediaSrc, revokeMediaUrl, isIdbRef } from '../../lib/mediaStore';

/** Minimum touch target size in screen pixels (Apple HIG) */
const MIN_TOUCH_TARGET = 44;

interface ImageElementProps {
  layer: TextLayer;
  isSelected: boolean;
  onPointerDown?: (e: React.PointerEvent, layerId: string) => void;
  zoom?: number;
}

/** Build CSS filter string from ImageFilters */
function buildFilterCSS(filters?: TextLayer['imageFilters']): string | undefined {
  if (!filters) return undefined;
  const parts: string[] = [];
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.saturation !== 100) parts.push(`saturate(${filters.saturation}%)`);
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export const ImageElement = memo<ImageElementProps>(({
  layer,
  isSelected,
  onPointerDown,
  zoom = 1,
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const prevBlobUrl = useRef<string>('');

  // Resolve idb:// refs to blob URLs, pass through http/data URLs
  useEffect(() => {
    const src = layer.imageSrc;
    if (!src) {
      setResolvedSrc('');
      return;
    }

    if (isIdbRef(src)) {
      resolveMediaSrc(src).then((url) => {
        if (url) {
          prevBlobUrl.current = url;
          setResolvedSrc(url);
        }
      });
    } else {
      setResolvedSrc(src);
    }

    return () => {
      if (prevBlobUrl.current) {
        revokeMediaUrl(prevBlobUrl.current);
        prevBlobUrl.current = '';
      }
    };
  }, [layer.imageSrc]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    onPointerDown?.(e, layer.id);
  }, [layer.id, onPointerDown]);

  if (!layer.visible || !resolvedSrc) return null;

  const filterCSS = buildFilterCSS(layer.imageFilters);
  const height = layer.imageHeight || layer.width; // default to square
  const crop = layer.imageCrop;
  const clipPath = crop ? `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)` : undefined;

  return (
    <div
      data-layer-id={layer.id}
      className="absolute select-none"
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: layer.width,
        height,
        transform: `translate(${layer.x}px, ${layer.y}px)${layer.rotation !== 0 ? ` rotate(${layer.rotation}deg)` : ''}`,
        transformOrigin: 'center center',
        opacity: layer.opacity,
        cursor: layer.locked ? 'not-allowed' : 'move',
        pointerEvents: 'auto',
        willChange: isSelected ? 'transform' : 'auto',
        borderRadius: 4,
        overflow: 'hidden',
        clipPath,
        mixBlendMode: (layer.blendMode || 'normal') as React.CSSProperties['mixBlendMode'],
      }}
    >
      {/* Invisible touch target expander — ensures at least 44px screen-space tap area */}
      {zoom < 1 && (() => {
        const expandY = Math.max(0, (MIN_TOUCH_TARGET / zoom - height) / 2);
        return expandY > 0 ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: -expandY,
              bottom: -expandY,
            }}
          />
        ) : null;
      })()}
      {/* Image */}
      <img
        src={resolvedSrc}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: layer.imageFit || 'cover',
          filter: filterCSS,
          display: 'block',
        }}
      />

      {/* Overlay color if specified */}
      {layer.imageFilters && layer.imageFilters.overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: layer.imageFilters.overlayColor,
            opacity: layer.imageFilters.overlayOpacity,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});

ImageElement.displayName = 'ImageElement';
