import { memo, useCallback } from 'react';
import type { TextLayer } from '../../types';

interface ImageElementProps {
  layer: TextLayer;
  isSelected: boolean;
  onPointerDown?: (e: React.PointerEvent, layerId: string) => void;
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
}) => {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    onPointerDown?.(e, layer.id);
  }, [layer.id, onPointerDown]);

  if (!layer.visible || !layer.imageSrc) return null;

  const filterCSS = buildFilterCSS(layer.imageFilters);
  const height = layer.imageHeight || layer.width; // default to square

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
      }}
    >
      {/* Image */}
      <img
        src={layer.imageSrc}
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
