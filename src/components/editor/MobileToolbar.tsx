import { useState } from 'react';
import {
  Plus, Image, Upload, Layers, Sliders, SlidersHorizontal,
  Undo2, Redo2, Save, Download, Loader2, MoreHorizontal, LayoutTemplate
} from 'lucide-react';
import type { TextLayer } from '../../types';

// Same presets as SpecialEditor
const TEXT_PRESETS = [
  { label: 'Heading', overrides: { text: 'HEADING', fontSize: 96, fontFamily: 'Bebas Neue', fontStyle: 'bold', fill: '#ffffff', letterSpacing: 4 } },
  { label: 'Subtitle', overrides: { text: 'Subtitle text', fontSize: 36, fontFamily: 'Montserrat', fill: '#94a3b8', letterSpacing: 2 } },
  { label: 'Item', overrides: { text: '$5 ITEM NAME', fontSize: 36, fontFamily: 'Oswald', fontStyle: 'bold', fill: '#ffffff', align: 'center' as const, letterSpacing: 1 } },
  { label: 'Price', overrides: { text: '$5', fontSize: 72, fontFamily: 'Anton', fill: '#f59e0b', fontStyle: 'bold' } },
  { label: 'CTA', overrides: { text: 'JOIN US!', fontSize: 48, fontFamily: 'Oswald', fill: '#2dd4bf', fontStyle: 'bold', letterSpacing: 3 } },
  { label: 'Divider', overrides: { elementType: 'divider' as const, text: 'SECTION', dividerLabel: 'SECTION', fontSize: 20, fontFamily: 'Montserrat', fontWeight: 600, fill: '#2dd4bf', letterSpacing: 4, dividerLineColor: '#2dd4bf', dividerLineOpacity: 0.4, dividerLineThickness: 1, dividerPadding: 40, dividerGap: 16, width: 1080 } },
];

interface MobileToolbarProps {
  onAddText: (overrides?: Partial<TextLayer>) => void;
  onOpenLibrary: () => void;
  onUpload: () => void;
  onOpenLayers: () => void;
  onOpenProperties: () => void;
  onOpenAdjustments: () => void;
  onOpenTemplates: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  uploading: boolean;
  hasSelection: boolean;
  activeSheet?: string | null;
}

export function MobileToolbar({
  onAddText,
  onOpenLibrary,
  onUpload,
  onOpenLayers,
  onOpenProperties,
  onOpenAdjustments,
  onOpenTemplates,
  onUndo,
  onRedo,
  onSave,
  onExport,
  canUndo,
  canRedo,
  uploading,
  hasSelection,
  activeSheet,
}: MobileToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-area-bottom">
      {/* Preset strip — horizontal scroll */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onAddText()}
          className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium"
        >
          <Plus size={12} /> Text
        </button>
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onAddText(preset.overrides as Partial<TextLayer>)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-surface-hover text-text-secondary text-xs font-medium hover:bg-surface-active transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main toolbar — 5 primary + More */}
      <div className="relative">
        {/* More popover — less-frequent actions */}
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-full right-2 mb-2 z-50 bg-surface border border-border rounded-xl shadow-modal p-2 flex gap-1 animate-fade-in">
              <ToolButton icon={LayoutTemplate} label="Tmpl" onClick={() => { onOpenTemplates(); setMoreOpen(false); }} />
              <ToolButton icon={Image} label="Library" onClick={() => { onOpenLibrary(); setMoreOpen(false); }} />
              <ToolButton icon={Sliders} label="Adjust" onClick={() => { onOpenAdjustments(); setMoreOpen(false); }} highlighted={activeSheet === 'adjustments'} />
              <ToolButton icon={Undo2} label="Undo" onClick={() => { onUndo(); setMoreOpen(false); }} disabled={!canUndo} />
              <ToolButton icon={Redo2} label="Redo" onClick={() => { onRedo(); setMoreOpen(false); }} disabled={!canRedo} />
              <ToolButton icon={Download} label="Export" onClick={() => { onExport(); setMoreOpen(false); }} />
            </div>
          </>
        )}

        <div className="flex items-center justify-around px-3 py-2">
          <ToolButton icon={Upload} label="Upload" onClick={onUpload} loading={uploading} />
          <ToolButton icon={Layers} label="Layers" onClick={onOpenLayers} highlighted={activeSheet === 'layers'} />
          <ToolButton
            icon={SlidersHorizontal}
            label="Props"
            onClick={onOpenProperties}
            active={hasSelection}
            highlighted={activeSheet === 'properties'}
          />
          <ToolButton icon={Save} label="Save" onClick={onSave} primary />
          <ToolButton icon={MoreHorizontal} label="More" onClick={() => setMoreOpen(!moreOpen)} active={moreOpen} />
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  primary,
  loading,
  highlighted,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  loading?: boolean;
  highlighted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors w-12 ${
        highlighted
          ? 'text-primary bg-primary/15'
          : primary
          ? 'text-primary'
          : active
          ? 'text-primary bg-primary/10'
          : disabled
          ? 'text-text-muted opacity-30'
          : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}
