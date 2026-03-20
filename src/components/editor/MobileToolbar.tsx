import { useState, memo } from 'react';
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

const GLASS_STYLE = {
  background: 'rgba(30, 30, 30, 0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
} as const;

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
  gestureActive?: boolean;
}

export const MobileToolbar = memo(function MobileToolbar({
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
  gestureActive = false,
}: MobileToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div
      className="md:hidden fixed z-40"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: gestureActive ? 0.3 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      {/* Preset strip — floating above the main pill */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 mb-2 overflow-x-auto scrollbar-hide rounded-2xl"
        style={{
          ...GLASS_STYLE,
          maxWidth: '92vw',
        }}
      >
        <button
          onClick={() => onAddText()}
          className="flex items-center gap-1.5 shrink-0 px-3 min-h-[44px] rounded-full bg-primary text-white text-[13px] font-medium active:scale-[0.92] transition-transform"
        >
          <Plus size={12} /> Text
        </button>
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onAddText(preset.overrides as Partial<TextLayer>)}
            className="shrink-0 px-3 min-h-[44px] rounded-full text-text-secondary text-[13px] font-medium transition-all active:scale-[0.92]"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main toolbar pill */}
      <div className="relative">
        {/* More popover — less-frequent actions */}
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
            <div
              className="absolute bottom-full right-0 mb-2 z-50 rounded-2xl p-1.5 flex gap-1 animate-fade-in"
              style={GLASS_STYLE}
            >
              <ToolButton icon={LayoutTemplate} label="Tmpl" onClick={() => { onOpenTemplates(); setMoreOpen(false); }} />
              <ToolButton icon={Image} label="Library" onClick={() => { onOpenLibrary(); setMoreOpen(false); }} />
              <ToolButton icon={Sliders} label="Adjust" onClick={() => { onOpenAdjustments(); setMoreOpen(false); }} highlighted={activeSheet === 'adjustments'} />
              <ToolButton icon={Undo2} label="Undo" onClick={() => { onUndo(); setMoreOpen(false); }} disabled={!canUndo} />
              <ToolButton icon={Redo2} label="Redo" onClick={() => { onRedo(); setMoreOpen(false); }} disabled={!canRedo} />
              <ToolButton icon={Download} label="Export" onClick={() => { onExport(); setMoreOpen(false); }} />
            </div>
          </>
        )}

        <div
          className="flex items-center justify-around px-2 py-1 rounded-full"
          style={GLASS_STYLE}
        >
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
});

MobileToolbar.displayName = 'MobileToolbar';

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
      className={`flex items-center justify-center rounded-full transition-all active:scale-[0.92] ${
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
      style={{ width: 44, height: 44 }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
    </button>
  );
}
