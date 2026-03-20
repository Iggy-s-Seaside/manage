import { Type, Minus, ChevronUp, ChevronDown, Trash2, Copy, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import type { TextLayer } from '../../types';

interface LayerPanelProps {
  layers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (layers: TextLayer[]) => void;
  onDelete: (id: string) => void;
  onDuplicate: (layer: TextLayer) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
}

export function LayerPanel({
  layers, selectedId, onSelect, onReorder, onDelete, onDuplicate,
  onToggleVisibility, onToggleLock,
}: LayerPanelProps) {
  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const newLayers = [...layers];
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;
    [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
    onReorder(newLayers);
  };

  const displayLayers = [...layers].reverse();

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Layers</h3>
      {displayLayers.length === 0 ? (
        <p className="text-xs text-text-muted px-1 py-3">No layers yet. Click "Text" to start.</p>
      ) : (
        <div className="space-y-1">
          {displayLayers.map((layer) => {
            const realIndex = layers.findIndex((l) => l.id === layer.id);
            return (
              <div
                key={layer.id}
                onClick={() => onSelect(layer.id)}
                className={`group rounded-lg cursor-pointer transition-colors ${
                  selectedId === layer.id
                    ? 'bg-primary-50 border border-primary/30'
                    : 'hover:bg-surface-hover border border-transparent'
                } ${!layer.visible ? 'opacity-40' : ''}`}
              >
                {/* Layer name row */}
                <div className="flex items-center gap-1.5 px-2 py-2">
                  {onToggleVisibility && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                      className="p-0.5 rounded hover:bg-surface-active text-text-muted shrink-0"
                      title={layer.visible ? 'Hide' : 'Show'}
                    >
                      {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                  )}

                  {layer.elementType === 'divider'
                    ? <Minus size={13} className="text-text-muted shrink-0" />
                    : <Type size={13} className="text-text-muted shrink-0" />
                  }
                  <span className="text-xs text-text-primary truncate flex-1">
                    {layer.text || 'Empty'}
                  </span>

                  {layer.locked && <Lock size={10} className="text-amber-500 shrink-0" />}
                </div>

                {/* Action buttons — shown below text when selected */}
                {selectedId === layer.id && (
                  <div className="flex gap-0.5 px-2 pb-2 pt-0">
                    {onToggleLock && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                        className="p-1.5 rounded hover:bg-surface-active text-text-muted"
                        title={layer.locked ? 'Unlock' : 'Lock'}
                      >
                        {layer.locked ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(realIndex, 'up'); }} className="p-1.5 rounded hover:bg-surface-active text-text-muted" title="Move up">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(realIndex, 'down'); }} className="p-1.5 rounded hover:bg-surface-active text-text-muted" title="Move down">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(layer); }} className="p-1.5 rounded hover:bg-surface-active text-text-muted" title="Duplicate">
                      <Copy size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(layer.id); }} className="p-1.5 rounded hover:bg-danger-light text-text-muted hover:text-danger" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
