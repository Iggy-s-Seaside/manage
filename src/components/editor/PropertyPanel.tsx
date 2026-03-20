import { useState } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Minus, Plus } from 'lucide-react';
import type { TextLayer } from '../../types';
import { BRAND_COLORS } from '../../types';
import { FontPicker } from './FontPicker';

interface PropertyPanelProps {
  layer: TextLayer;
  onUpdate: (changes: Partial<TextLayer>) => void;
  onDelete: () => void;
}

/** Convert any CSS color (rgba, rgb, hex) to a hex string for <input type="color"> */
function toHex(color: string): string {
  if (color.startsWith('#')) return color.length === 4 || color.length === 7 ? color : color.slice(0, 7);
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, '0');
    const g = Number(m[2]).toString(16).padStart(2, '0');
    const b = Number(m[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return '#000000';
}

export function PropertyPanel({ layer, onUpdate, onDelete }: PropertyPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggleFontStyle = (style: 'bold' | 'italic') => {
    const parts = layer.fontStyle.split(' ').filter(Boolean);
    const has = parts.includes(style);
    const next = has ? parts.filter((p) => p !== style) : [...parts, style];
    onUpdate({ fontStyle: next.length === 0 ? 'normal' : next.join(' ') });
  };

  const isBold = layer.fontStyle.includes('bold');
  const isItalic = layer.fontStyle.includes('italic');
  const isUnderline = layer.textDecoration === 'underline';

  return (
    <div className="space-y-5 text-sm">
      {/* Text Content */}
      <Section title={layer.elementType === 'divider' ? 'Label' : 'Text'}>
        <textarea
          className="input-field min-h-[60px] resize-y text-xs"
          value={layer.elementType === 'divider' ? (layer.dividerLabel ?? layer.text) : layer.text}
          onChange={(e) => {
            if (layer.elementType === 'divider') {
              onUpdate({ text: e.target.value, dividerLabel: e.target.value });
            } else {
              onUpdate({ text: e.target.value });
            }
          }}
        />
      </Section>

      {/* Divider-specific properties */}
      {layer.elementType === 'divider' && (
        <Section title="Divider Line">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-text-muted">Line Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={layer.dividerLineColor || layer.fill}
                  onChange={(e) => onUpdate({ dividerLineColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-muted">Thickness</label>
              <input
                type="number"
                min={1}
                max={10}
                className="input-field text-xs"
                value={layer.dividerLineThickness ?? 1}
                onChange={(e) => onUpdate({ dividerLineThickness: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-text-muted">Line Opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={layer.dividerLineOpacity ?? 0.4}
                onChange={(e) => onUpdate({ dividerLineOpacity: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Gap</label>
              <input
                type="number"
                min={0}
                max={60}
                className="input-field text-xs"
                value={layer.dividerGap ?? 16}
                onChange={(e) => onUpdate({ dividerGap: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted">Side Padding</label>
            <input
              type="range"
              min={0}
              max={200}
              value={layer.dividerPadding ?? 40}
              onChange={(e) => onUpdate({ dividerPadding: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </Section>
      )}

      {/* Typography */}
      <Section title="Typography">
        <div className="mb-2">
          <FontPicker
            value={layer.fontFamily}
            onChange={(font) => onUpdate({ fontFamily: font })}
          />
        </div>

        <div className="mb-2">
          <label className="text-xs text-text-muted">Size</label>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onUpdate({ fontSize: Math.max(8, layer.fontSize - 2) })}
              className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-active transition-colors"
              aria-label="Decrease font size"
            >
              <Minus size={14} />
            </button>
            <input
              type="range"
              min={8}
              max={200}
              value={layer.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <button
              onClick={() => onUpdate({ fontSize: Math.min(400, layer.fontSize + 2) })}
              className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-active transition-colors"
              aria-label="Increase font size"
            >
              <Plus size={14} />
            </button>
            <input
              type="number"
              min={8}
              max={400}
              className="input-field w-14 text-xs text-center"
              value={layer.fontSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 400) onUpdate({ fontSize: v });
              }}
            />
          </div>
        </div>

        <div className="flex gap-1 mb-2">
          <button onClick={() => toggleFontStyle('bold')} aria-label="Bold" className={`p-2.5 rounded-lg transition-colors ${isBold ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <Bold size={14} />
          </button>
          <button onClick={() => toggleFontStyle('italic')} aria-label="Italic" className={`p-2.5 rounded-lg transition-colors ${isItalic ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <Italic size={14} />
          </button>
          <button onClick={() => onUpdate({ textDecoration: isUnderline ? '' : 'underline' })} aria-label="Underline" className={`p-2.5 rounded-lg transition-colors ${isUnderline ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <Underline size={14} />
          </button>
          <div className="w-px bg-border mx-1" />
          <button onClick={() => onUpdate({ align: 'left' })} aria-label="Align left" className={`p-2.5 rounded-lg transition-colors ${layer.align === 'left' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <AlignLeft size={14} />
          </button>
          <button onClick={() => onUpdate({ align: 'center' })} aria-label="Align center" className={`p-2.5 rounded-lg transition-colors ${layer.align === 'center' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <AlignCenter size={14} />
          </button>
          <button onClick={() => onUpdate({ align: 'right' })} aria-label="Align right" className={`p-2.5 rounded-lg transition-colors ${layer.align === 'right' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <AlignRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-text-muted">Weight</label>
            <select
              className="input-field text-xs w-full"
              value={layer.fontWeight || 400}
              onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) })}
            >
              <option value={300}>Light (300)</option>
              <option value={400}>Regular (400)</option>
              <option value={500}>Medium (500)</option>
              <option value={600}>Semi-bold (600)</option>
              <option value={700}>Bold (700)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted">Transform</label>
            <select
              className="input-field text-xs w-full"
              value={layer.textTransform || 'none'}
              onChange={(e) => onUpdate({ textTransform: e.target.value as TextLayer['textTransform'] })}
            >
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-text-muted">Letter Spacing</label>
            <input
              type="range"
              min={-5}
              max={30}
              step={0.5}
              value={layer.letterSpacing}
              onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Line Height</label>
            <input
              type="range"
              min={0.8}
              max={3}
              step={0.1}
              value={layer.lineHeight || 1.3}
              onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </Section>

      {/* Colors */}
      <Section title="Colors">
        <div className="mb-2">
          <label className="text-xs text-text-muted">Fill Color</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={layer.fill}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-border"
            />
            <div className="flex gap-1 flex-wrap">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate({ fill: c })}
                  className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${layer.fill === c ? 'border-primary scale-110' : 'border-border'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-text-muted">Stroke Color</label>
            <input
              type="color"
              value={layer.stroke || '#000000'}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
              className="w-full h-8 rounded cursor-pointer border border-border"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Stroke Width</label>
            <input
              type="number"
              min={0}
              max={10}
              className="input-field text-xs"
              value={layer.strokeWidth}
              onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
            />
          </div>
        </div>
      </Section>

      {/* Effects */}
      <Section title="Shadow">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-text-muted">Color</label>
            <input
              type="color"
              value={toHex(layer.shadowColor)}
              onChange={(e) => onUpdate({ shadowColor: e.target.value })}
              className="w-full h-8 rounded cursor-pointer border border-border"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Blur</label>
            <input
              type="range"
              min={0}
              max={30}
              value={layer.shadowBlur}
              onChange={(e) => onUpdate({ shadowBlur: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-text-muted">Offset X</label>
            <input type="number" className="input-field text-xs" value={layer.shadowOffsetX} onChange={(e) => onUpdate({ shadowOffsetX: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-text-muted">Offset Y</label>
            <input type="number" className="input-field text-xs" value={layer.shadowOffsetY} onChange={(e) => onUpdate({ shadowOffsetY: Number(e.target.value) })} />
          </div>
        </div>
      </Section>

      {/* Position */}
      <Section title="Position">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-text-muted">X</label>
            <input type="number" className="input-field text-xs" value={Math.round(layer.x)} onChange={(e) => onUpdate({ x: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-text-muted">Y</label>
            <input type="number" className="input-field text-xs" value={Math.round(layer.y)} onChange={(e) => onUpdate({ y: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-text-muted">Width</label>
            <input type="number" className="input-field text-xs" value={Math.round(layer.width)} onChange={(e) => onUpdate({ width: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-text-muted">Rotation</label>
            <input type="number" className="input-field text-xs" value={Math.round(layer.rotation)} onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-muted">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.opacity}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </Section>

      {confirmDelete ? (
        <div className="flex gap-2">
          <button
            onClick={() => { onDelete(); setConfirmDelete(false); }}
            className="btn-danger flex-1 text-xs"
          >
            Confirm Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="btn-secondary flex-1 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="btn-danger w-full text-xs" aria-label="Delete layer">
          <Trash2 size={14} /> Delete Layer
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}
