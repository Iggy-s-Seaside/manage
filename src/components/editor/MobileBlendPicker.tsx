import { memo, useState } from 'react';
import { X, RotateCcw, Sun, Contrast, Droplets, CloudFog, Palette } from 'lucide-react';
import type { TextLayer, ImageFilters } from '../../types';
import { DEFAULT_IMAGE_FILTERS } from '../../types';

interface MobileBlendPickerProps {
  layer: TextLayer;
  onUpdate: (changes: Partial<TextLayer>) => void;
  onClose: () => void;
  /** 0–1 ratio of where the element is on screen vertically */
  elementScreenY?: number;
}

const BLEND_MODES: { value: string; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'No blending' },
  { value: 'screen', label: 'Screen', description: 'Lighten & merge' },
  { value: 'multiply', label: 'Multiply', description: 'Darken & merge' },
  { value: 'overlay', label: 'Overlay', description: 'Contrast blend' },
  { value: 'soft-light', label: 'Soft Light', description: 'Gentle glow' },
  { value: 'hard-light', label: 'Hard Light', description: 'Strong glow' },
  { value: 'difference', label: 'Difference', description: 'Invert colors' },
  { value: 'exclusion', label: 'Exclusion', description: 'Soft invert' },
  { value: 'color-dodge', label: 'Dodge', description: 'Brighten colors' },
  { value: 'color-burn', label: 'Burn', description: 'Deepen colors' },
  { value: 'luminosity', label: 'Luminosity', description: 'Light only' },
  { value: 'darken', label: 'Darken', description: 'Keep darks' },
  { value: 'lighten', label: 'Lighten', description: 'Keep lights' },
];

type ActiveSlider = 'brightness' | 'contrast' | 'saturation' | 'blur' | 'overlay' | null;

const SLIDER_CONFIG: { id: ActiveSlider; icon: typeof Sun; label: string; key: keyof ImageFilters; min: number; max: number }[] = [
  { id: 'brightness', icon: Sun, label: 'Bright', key: 'brightness', min: 0, max: 200 },
  { id: 'contrast', icon: Contrast, label: 'Contrast', key: 'contrast', min: 0, max: 200 },
  { id: 'saturation', icon: Droplets, label: 'Saturate', key: 'saturation', min: 0, max: 200 },
  { id: 'blur', icon: CloudFog, label: 'Blur', key: 'blur', min: 0, max: 20 },
];

export const MobileBlendPicker = memo(function MobileBlendPicker({
  layer,
  onUpdate,
  onClose,
  elementScreenY = 0.5,
}: MobileBlendPickerProps) {
  const [activeSlider, setActiveSlider] = useState<ActiveSlider>(null);
  const currentBlend = layer.blendMode || 'normal';
  const filters = layer.imageFilters ?? DEFAULT_IMAGE_FILTERS;

  // Smart positioning: show at top if element is in bottom half, and vice versa
  const showAtBottom = elementScreenY < 0.45;

  return (
    <div
      className={`fixed left-0 right-0 z-[65] md:hidden safe-area-top ${showAtBottom ? 'bottom-16' : 'top-12'}`}
      style={{ animation: showAtBottom ? 'slideUpIn 250ms cubic-bezier(0.32, 0.72, 0, 1)' : 'slideDownIn 250ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <div className="mx-3 mt-2 rounded-2xl bg-surface/95 backdrop-blur-xl border border-border/20 shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex-1">Blend & Adjust</span>
          <button
            onClick={() => onUpdate({ blendMode: 'normal', imageFilters: { ...DEFAULT_IMAGE_FILTERS } })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-text-muted hover:text-primary active:scale-95 transition-all"
          >
            <RotateCcw size={10} /> Reset
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-hover active:scale-90 transition-all"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Blend mode pills — horizontally scrollable */}
        <div
          className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {BLEND_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onUpdate({ blendMode: mode.value })}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                currentBlend === mode.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-hover text-text-secondary hover:bg-surface-active'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Opacity slider — always visible */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-muted w-12">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(layer.opacity * 100)}
              onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })}
              className="flex-1 accent-primary h-2"
            />
            <span className="text-xs font-medium text-text-secondary tabular-nums w-10 text-right">
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>
        </div>

        {/* Fine-tune filter pills */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {SLIDER_CONFIG.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveSlider(activeSlider === id ? null : id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                activeSlider === id
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-surface-hover/60 text-text-muted border border-transparent'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
          <button
            onClick={() => setActiveSlider(activeSlider === 'overlay' ? null : 'overlay')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
              activeSlider === 'overlay'
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-surface-hover/60 text-text-muted border border-transparent'
            }`}
          >
            <Palette size={12} /> Color
          </button>
        </div>

        {/* Expanded slider for active fine-tune option */}
        {activeSlider && activeSlider !== 'overlay' && (() => {
          const config = SLIDER_CONFIG.find(s => s.id === activeSlider);
          if (!config) return null;
          return (
            <div
              className="px-4 pb-3 pt-1 border-t border-border/20"
              style={{ animation: 'fadeSlideUp 150ms ease-out' }}
            >
              <div className="flex items-center gap-3">
                <config.icon size={14} className="text-text-muted shrink-0" />
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.key === 'blur' ? 0.5 : 1}
                  value={filters[config.key] as number}
                  onChange={(e) => onUpdate({ imageFilters: { ...filters, [config.key]: Number(e.target.value) } })}
                  className="flex-1 accent-primary h-2"
                />
                <span className="text-xs font-medium text-text-secondary tabular-nums w-8 text-right">
                  {config.key === 'blur' ? (filters[config.key] as number).toFixed(1) : Math.round(filters[config.key] as number)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Overlay color controls */}
        {activeSlider === 'overlay' && (
          <div
            className="px-4 pb-3 pt-1 border-t border-border/20"
            style={{ animation: 'fadeSlideUp 150ms ease-out' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={filters.overlayColor}
                onChange={(e) => onUpdate({ imageFilters: { ...filters, overlayColor: e.target.value } })}
                className="w-7 h-7 rounded-lg cursor-pointer border border-border shrink-0"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(filters.overlayOpacity * 100)}
                onChange={(e) => onUpdate({ imageFilters: { ...filters, overlayOpacity: Number(e.target.value) / 100 } })}
                className="flex-1 accent-primary h-2"
              />
              <span className="text-xs font-medium text-text-secondary tabular-nums w-8 text-right">
                {Math.round(filters.overlayOpacity * 100)}%
              </span>
            </div>
            <div className="flex gap-1.5">
              {['#000000', '#1a1a2e', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6'].map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate({ imageFilters: { ...filters, overlayColor: c, overlayOpacity: Math.max(filters.overlayOpacity, 0.2) } })}
                  className={`w-7 h-7 rounded-full border-2 transition-all active:scale-90 ${
                    filters.overlayColor === c ? 'border-primary scale-110' : 'border-border/50'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDownIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

MobileBlendPicker.displayName = 'MobileBlendPicker';
