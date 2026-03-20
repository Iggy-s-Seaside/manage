import { useState, memo } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import type { TextLayer } from '../../types';
import { BRAND_COLORS, DEFAULT_IMAGE_FILTERS } from '../../types';
import { FontPicker } from './FontPicker';

interface PropertyPanelProps {
  layer: TextLayer;
  onUpdate: (changes: Partial<TextLayer>) => void;
  onDelete: () => void;
}

/** Convert any CSS color to hex for <input type="color"> */
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

// Reusable slider row with label and live value
function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(value));
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-text-muted">{label}</label>
        <span className="text-xs font-medium text-text-secondary tabular-nums">{display}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-2 rounded-full"
      />
    </div>
  );
}

export const PropertyPanel = memo(function PropertyPanel({ layer, onUpdate, onDelete }: PropertyPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    <div className="space-y-4 text-sm">
      {/* ─── Text Content ─── */}
      <Section title={layer.elementType === 'divider' ? 'Label' : 'Text'}>
        <textarea
          className="input-field min-h-[56px] resize-y text-[13px] rounded-xl"
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

      {/* ─── Divider-specific ─── */}
      {layer.elementType === 'divider' && (
        <Section title="Divider Line">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-text-muted">Color</label>
            <input
              type="color"
              value={layer.dividerLineColor || layer.fill}
              onChange={(e) => onUpdate({ dividerLineColor: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-border ml-auto"
            />
          </div>
          <SliderRow label="Thickness" value={layer.dividerLineThickness ?? 1} min={1} max={10} onChange={(v) => onUpdate({ dividerLineThickness: v })} />
          <SliderRow label="Opacity" value={layer.dividerLineOpacity ?? 0.4} min={0} max={1} step={0.05} onChange={(v) => onUpdate({ dividerLineOpacity: v })} />
          <SliderRow label="Gap" value={layer.dividerGap ?? 16} min={0} max={60} onChange={(v) => onUpdate({ dividerGap: v })} />
          <SliderRow label="Side Padding" value={layer.dividerPadding ?? 40} min={0} max={200} onChange={(v) => onUpdate({ dividerPadding: v })} />
        </Section>
      )}

      {/* ─── Typography ─── */}
      <Section title="Typography">
        <div className="mb-3">
          <FontPicker
            value={layer.fontFamily}
            onChange={(font) => onUpdate({ fontFamily: font })}
          />
        </div>

        <SliderRow label="Size" value={layer.fontSize} min={8} max={200} unit="px" onChange={(v) => onUpdate({ fontSize: v })} />

        {/* Style buttons */}
        <div className="flex gap-1.5 mb-3">
          <StyleButton active={isBold} onClick={() => toggleFontStyle('bold')} label="Bold"><Bold size={14} /></StyleButton>
          <StyleButton active={isItalic} onClick={() => toggleFontStyle('italic')} label="Italic"><Italic size={14} /></StyleButton>
          <StyleButton active={isUnderline} onClick={() => onUpdate({ textDecoration: isUnderline ? '' : 'underline' })} label="Underline"><Underline size={14} /></StyleButton>
          <div className="w-px bg-border/40 mx-0.5" />
          <StyleButton active={layer.align === 'left'} onClick={() => onUpdate({ align: 'left' })} label="Left"><AlignLeft size={14} /></StyleButton>
          <StyleButton active={layer.align === 'center'} onClick={() => onUpdate({ align: 'center' })} label="Center"><AlignCenter size={14} /></StyleButton>
          <StyleButton active={layer.align === 'right'} onClick={() => onUpdate({ align: 'right' })} label="Right"><AlignRight size={14} /></StyleButton>
        </div>

        <SliderRow label="Letter Spacing" value={layer.letterSpacing} min={-5} max={30} step={0.5} onChange={(v) => onUpdate({ letterSpacing: v })} />
        <SliderRow label="Line Height" value={layer.lineHeight || 1.3} min={0.8} max={3} step={0.1} unit="×" onChange={(v) => onUpdate({ lineHeight: v })} />
      </Section>

      {/* ─── Colors ─── */}
      <Section title="Colors">
        <div className="mb-3">
          <label className="text-xs text-text-muted mb-1.5 block">Fill Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.fill}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-border"
            />
            <div className="flex gap-1.5 flex-wrap">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate({ fill: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all active:scale-90 ${layer.fill === c ? 'border-primary scale-110 shadow-md' : 'border-border/50'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs text-text-muted">Stroke</label>
          <input
            type="color"
            value={layer.stroke || '#000000'}
            onChange={(e) => onUpdate({ stroke: e.target.value })}
            className="w-7 h-7 rounded-lg cursor-pointer border border-border"
          />
        </div>
        <SliderRow label="Stroke Width" value={layer.strokeWidth} min={0} max={10} step={0.5} unit="px" onChange={(v) => onUpdate({ strokeWidth: v })} />
        <SliderRow label="Opacity" value={layer.opacity} min={0} max={1} step={0.05} onChange={(v) => onUpdate({ opacity: v })} />
      </Section>

      {/* ─── Shadow ─── */}
      <Section title="Shadow">
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs text-text-muted">Color</label>
          <input
            type="color"
            value={toHex(layer.shadowColor)}
            onChange={(e) => onUpdate({ shadowColor: e.target.value })}
            className="w-7 h-7 rounded-lg cursor-pointer border border-border"
          />
        </div>
        <SliderRow label="Blur" value={layer.shadowBlur} min={0} max={30} onChange={(v) => onUpdate({ shadowBlur: v })} />
        <SliderRow label="Offset X" value={layer.shadowOffsetX} min={-30} max={30} onChange={(v) => onUpdate({ shadowOffsetX: v })} />
        <SliderRow label="Offset Y" value={layer.shadowOffsetY} min={-30} max={30} onChange={(v) => onUpdate({ shadowOffsetY: v })} />
      </Section>

      {/* ─── Position (sliders) ─── */}
      <Section title="Position">
        <SliderRow label="X" value={Math.round(layer.x)} min={0} max={1080} onChange={(v) => onUpdate({ x: v })} />
        <SliderRow label="Y" value={Math.round(layer.y)} min={0} max={1920} onChange={(v) => onUpdate({ y: v })} />
        <SliderRow label="Width" value={Math.round(layer.width)} min={50} max={1080} onChange={(v) => onUpdate({ width: v })} />
        <SliderRow label="Rotation" value={Math.round(layer.rotation)} min={0} max={360} unit="°" onChange={(v) => onUpdate({ rotation: v })} />
      </Section>

      {/* ─── Advanced toggle ─── */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-surface-hover text-text-muted text-xs font-medium uppercase tracking-wider hover:bg-surface-active transition-all active:scale-[0.98]"
      >
        <Settings2 size={14} />
        Advanced
        {showAdvanced ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
      </button>

      {showAdvanced && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">Weight</label>
              <select
                className="input-field text-[13px] w-full rounded-lg"
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
                className="input-field text-[13px] w-full rounded-lg"
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
              <label className="text-xs text-text-muted">Font Size (exact)</label>
              <input type="number" min={1} max={400} className="input-field text-[13px] rounded-lg" value={layer.fontSize} onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= 400) onUpdate({ fontSize: v }); }} />
            </div>
            <div>
              <label className="text-xs text-text-muted">Letter Spacing</label>
              <input type="number" step={0.5} className="input-field text-[13px] rounded-lg" value={layer.letterSpacing} onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">X (exact)</label>
              <input type="number" className="input-field text-[13px] rounded-lg" value={Math.round(layer.x)} onChange={(e) => onUpdate({ x: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-text-muted">Y (exact)</label>
              <input type="number" className="input-field text-[13px] rounded-lg" value={Math.round(layer.y)} onChange={(e) => onUpdate({ y: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">Width (exact)</label>
              <input type="number" className="input-field text-[13px] rounded-lg" value={Math.round(layer.width)} onChange={(e) => onUpdate({ width: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-text-muted">Rotation (exact)</label>
              <input type="number" className="input-field text-[13px] rounded-lg" value={Math.round(layer.rotation)} onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">Stroke Width</label>
              <input type="number" min={0} max={20} step={0.5} className="input-field text-[13px] rounded-lg" value={layer.strokeWidth} onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-text-muted">Shadow Blur</label>
              <input type="number" min={0} max={50} className="input-field text-[13px] rounded-lg" value={layer.shadowBlur} onChange={(e) => onUpdate({ shadowBlur: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">Shadow X</label>
              <input type="number" className="input-field text-[13px] rounded-lg" value={layer.shadowOffsetX} onChange={(e) => onUpdate({ shadowOffsetX: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-text-muted">Shadow Y</label>
              <input type="number" className="input-field text-[13px] rounded-lg" value={layer.shadowOffsetY} onChange={(e) => onUpdate({ shadowOffsetY: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Layer Properties ─── */}
      {layer.elementType === 'image' && (
        <Section title="Image Filters">
          <SliderRow label="Brightness" value={(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS).brightness} min={0} max={200} unit="%" onChange={(v) => onUpdate({ imageFilters: { ...(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS), brightness: v } })} />
          <SliderRow label="Contrast" value={(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS).contrast} min={0} max={200} unit="%" onChange={(v) => onUpdate({ imageFilters: { ...(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS), contrast: v } })} />
          <SliderRow label="Saturation" value={(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS).saturation} min={0} max={200} unit="%" onChange={(v) => onUpdate({ imageFilters: { ...(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS), saturation: v } })} />
          <SliderRow label="Blur" value={(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS).blur} min={0} max={20} step={0.5} unit="px" onChange={(v) => onUpdate({ imageFilters: { ...(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS), blur: v } })} />
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-text-muted">Overlay</label>
            <input
              type="color"
              value={(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS).overlayColor}
              onChange={(e) => onUpdate({ imageFilters: { ...(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS), overlayColor: e.target.value } })}
              className="w-7 h-7 rounded-lg cursor-pointer border border-border ml-auto"
            />
          </div>
          <SliderRow label="Overlay Opacity" value={(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS).overlayOpacity} min={0} max={1} step={0.05} onChange={(v) => onUpdate({ imageFilters: { ...(layer.imageFilters ?? DEFAULT_IMAGE_FILTERS), overlayOpacity: v } })} />
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-text-muted">Fit</label>
            <div className="flex gap-1 ml-auto">
              {(['cover', 'contain', 'fill'] as const).map((fit) => (
                <button
                  key={fit}
                  onClick={() => onUpdate({ imageFit: fit })}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                    (layer.imageFit || 'cover') === fit
                      ? 'bg-primary text-white'
                      : 'bg-surface-hover text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {fit.charAt(0).toUpperCase() + fit.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onUpdate({ imageFilters: { ...DEFAULT_IMAGE_FILTERS } })}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            Reset Filters
          </button>
        </Section>
      )}

      {/* ─── Delete ─── */}
      {confirmDelete ? (
        <div className="flex gap-2">
          <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="btn-danger flex-1 text-[13px] rounded-xl">Confirm Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 text-[13px] rounded-xl">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="btn-danger w-full text-[13px] rounded-xl" aria-label="Delete layer">
          <Trash2 size={14} /> Delete Layer
        </button>
      )}
    </div>
  );
});

PropertyPanel.displayName = 'PropertyPanel';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function StyleButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 ${
        active ? 'bg-primary text-white shadow-sm' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'
      }`}
    >
      {children}
    </button>
  );
}
