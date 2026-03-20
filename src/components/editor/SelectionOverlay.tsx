import { memo, useMemo } from 'react';
import { Lock, Copy, Trash2 } from 'lucide-react';
import type { TextLayer } from '../../types';

interface SnapLines {
  x: number[];
  y: number[];
}

interface SelectionOverlayProps {
  layer: TextLayer;
  allLayers: TextLayer[];
  canvasWidth: number;
  canvasHeight: number;
  snapLines: SnapLines;
  zoom?: number;
  onHandlePointerDown: (e: React.PointerEvent, handle: string) => void;
  onDuplicate?: (layer: TextLayer) => void;
  onDelete?: (layerId: string) => void;
}

/** Estimate text height based on line count and fontSize */
function estimateHeight(layer: TextLayer): number {
  const lines = layer.text.split('\n');
  const lh = layer.lineHeight || 1.3;
  const lineHeight = layer.fontSize * lh;
  return lines.length > 1 ? (lines.length - 1) * lineHeight + layer.fontSize : layer.fontSize;
}

const HANDLE_SIZE = 12;
const TOUCH_SIZE = 44;
const ROTATION_OFFSET = 30;

type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'rotate';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export const SelectionOverlay = memo<SelectionOverlayProps>(({
  layer,
  canvasWidth,
  canvasHeight,
  snapLines,
  zoom = 1,
  onHandlePointerDown,
  onDuplicate,
  onDelete,
}) => {
  const height = estimateHeight(layer);
  const padding = 4;
  // Scale touch targets inversely with zoom so they stay ≥44px on screen
  const touchSize = Math.max(TOUCH_SIZE, TOUCH_SIZE / zoom);

  // Selection box position (with padding around text)
  const boxX = layer.x - padding;
  const boxY = layer.y - padding;
  const boxW = layer.width + padding * 2;
  const boxH = height + padding * 2;

  // Corner handle positions relative to box
  const handles = useMemo<{ id: HandleId; x: number; y: number; cursor: string }[]>(() => [
    { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
    { id: 'ne', x: boxW, y: 0, cursor: 'nesw-resize' },
    { id: 'sw', x: 0, y: boxH, cursor: 'nesw-resize' },
    { id: 'se', x: boxW, y: boxH, cursor: 'nwse-resize' },
  ], [boxW, boxH]);

  // Rotation handle position (above top-center)
  const rotateX = boxW / 2;
  const rotateY = -ROTATION_OFFSET;

  return (
    <>
      {/* Selection ring + handles (rotated with the layer) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: boxW,
          height: boxH,
          transform: `translate(${boxX}px, ${boxY}px)${layer.rotation !== 0 ? ` rotate(${layer.rotation}deg)` : ''}`,
          transformOrigin: `${layer.width / 2 + padding}px ${height / 2 + padding}px`,
        }}
      >
        {/* Dashed selection border with glow */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            border: '2px dashed #2dd4bf',
            boxShadow: '0 0 8px rgba(45, 212, 191, 0.3)',
          }}
        />

        {/* Rotation line (hidden on touch devices) */}
        {!isTouchDevice && (
          <div
            className="absolute"
            style={{
              left: boxW / 2 - 0.5,
              top: -ROTATION_OFFSET,
              width: 1,
              height: ROTATION_OFFSET,
              backgroundColor: '#2dd4bf',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Rotation handle (hidden on touch devices) */}
        {!isTouchDevice && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: rotateX - touchSize / 2,
              top: rotateY - touchSize / 2,
              width: touchSize,
              height: touchSize,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPointerDown={(e) => onHandlePointerDown(e, 'rotate')}
          >
            <div
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '2px solid #2dd4bf',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        )}

        {/* Corner resize handles */}
        {handles.map(({ id, x, y, cursor }) => (
          <div
            key={id}
            className="absolute pointer-events-auto"
            style={{
              left: x - touchSize / 2,
              top: y - touchSize / 2,
              width: touchSize,
              height: touchSize,
              cursor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPointerDown={(e) => onHandlePointerDown(e, id)}
          >
            <div
              className="transition-colors duration-100"
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '2px solid #2dd4bf',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        ))}

        {/* Lock indicator */}
        {layer.locked && (
          <div
            className="absolute flex items-center justify-center rounded bg-amber-500/90 p-0.5"
            style={{ top: -20, right: -20 }}
          >
            <Lock size={12} className="text-white" />
          </div>
        )}

        {/* Quick-action buttons (duplicate + delete) — below selection, scaled for visibility */}
        {!layer.locked && (onDuplicate || onDelete) && (
          <div
            className="absolute pointer-events-auto flex gap-1"
            style={{
              left: '50%',
              top: boxH + 8,
              transform: `translateX(-50%) scale(${1 / zoom})`,
              transformOrigin: 'top center',
            }}
          >
            {onDuplicate && (
              <button
                className="flex items-center justify-center rounded-lg bg-surface/90 border border-border backdrop-blur-sm shadow-md"
                style={{ width: 44, height: 44 }}
                onPointerDown={(e) => { e.stopPropagation(); onDuplicate(layer); }}
                aria-label="Duplicate"
              >
                <Copy size={16} className="text-primary" />
              </button>
            )}
            {onDelete && (
              <button
                className="flex items-center justify-center rounded-lg bg-surface/90 border border-border backdrop-blur-sm shadow-md"
                style={{ width: 44, height: 44 }}
                onPointerDown={(e) => { e.stopPropagation(); onDelete(layer.id); }}
                aria-label="Delete"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Snap guide lines (not rotated, full canvas span) */}
      {snapLines.x.map((x, i) => (
        <div
          key={`sx-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: x,
            top: 0,
            width: 1,
            height: canvasHeight,
            borderLeft: '1px dashed rgba(45, 212, 191, 0.6)',
            opacity: 0.7,
          }}
        />
      ))}
      {snapLines.y.map((y, i) => (
        <div
          key={`sy-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: y,
            width: canvasWidth,
            height: 1,
            borderTop: '1px dashed rgba(45, 212, 191, 0.6)',
            opacity: 0.7,
          }}
        />
      ))}
    </>
  );
});

SelectionOverlay.displayName = 'SelectionOverlay';
