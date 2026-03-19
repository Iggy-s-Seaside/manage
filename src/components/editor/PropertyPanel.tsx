import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import type { TextLayer } from '../../types';
import { EDITOR_FONTS, BRAND_COLORS } from '../../types';

interface PropertyPanelProps {
  layer: TextLayer;
  onUpdate: (changes: Partial<TextLayer>) => void;
  onDelete: () => void;
}

export function PropertyPanel({ layer, onUpdate, onDelete }: PropertyPanelProps) {
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
      <Section title="Text">
        <textarea
          className="input-field min-h-[60px] resize-y text-xs"
          value={layer.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
        />
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <select
          className="input-field mb-2"
          value={layer.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        >
          {EDITOR_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <label className="text-xs text-text-muted">Size</label>
            <input
              type="range"
              min={8}
              max={200}
              value={layer.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <input
            type="number"
            className="input-field w-16 text-xs text-center"
            value={layer.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
          />
        </div>

        <div className="flex gap-1 mb-2">
          <button onClick={() => toggleFontStyle('bold')} className={`p-2.5 rounded-lg transition-colors ${isBold ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <Bold size={14} />
          </button>
          <button onClick={() => toggleFontStyle('italic')} className={`p-2.5 rounded-lg transition-colors ${isItalic ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <Italic size={14} />
          </button>
          <button onClick={() => onUpdate({ textDecoration: isUnderline ? '' : 'underline' })} className={`p-2.5 rounded-lg transition-colors ${isUnderline ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <Underline size={14} />
          </button>
          <div className="w-px bg-border mx-1" />
          <button onClick={() => onUpdate({ align: 'left' })} className={`p-2.5 rounded-lg transition-colors ${layer.align === 'left' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <AlignLeft size={14} />
          </button>
          <button onClick={() => onUpdate({ align: 'center' })} className={`p-2.5 rounded-lg transition-colors ${layer.align === 'center' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <AlignCenter size={14} />
          </button>
          <button onClick={() => onUpdate({ align: 'right' })} className={`p-2.5 rounded-lg transition-colors ${layer.align === 'right' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}>
            <AlignRight size={14} />
          </button>
        </div>

        <div>
          <label className="text-xs text-text-muted">Letter Spacing</label>
          <input
            type="range"
            min={-5}
            max={30}
            value={layer.letterSpacing}
            onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
            className="w-full accent-primary"
          />
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
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${layer.fill === c ? 'border-primary scale-110' : 'border-border'}`}
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
              value={layer.shadowColor.startsWith('rgba') ? '#000000' : layer.shadowColor}
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

      <button onClick={onDelete} className="btn-danger w-full text-xs">
        <Trash2 size={14} /> Delete Layer
      </button>
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
