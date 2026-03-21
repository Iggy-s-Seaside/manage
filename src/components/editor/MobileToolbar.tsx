import { useState, memo } from 'react';
import {
  Plus, Image, Upload, Layers, SlidersHorizontal,
  Undo2, Redo2, Save, Download, Loader2, MoreHorizontal, LayoutTemplate,
  Square, RectangleVertical, RectangleHorizontal, Type as TypeIcon, Blend
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
  onAddImage: () => void;
  onOpenLibrary: () => void;
  onUpload: () => void;
  onOpenLayers: () => void;
  onOpenProperties: () => void;
  onOpenFontPicker: () => void;
  onOpenBlendPicker: () => void;
  onOpenAdjustments: () => void;
  onOpenTemplates: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  onSetCanvasSize?: (width: number, height: number) => void;
  onSetBgColor?: (color: string) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  bgColor?: string;
  canUndo: boolean;
  canRedo: boolean;
  uploading: boolean;
  hasSelection: boolean;
  isImageSelected?: boolean;
  activeSheet?: string | null;
  gestureActive?: boolean;
}

export const MobileToolbar = memo(function MobileToolbar({
  onAddText,
  onAddImage,
  onOpenLibrary,
  onUpload,
  onOpenLayers,
  onOpenProperties,
  onOpenFontPicker,
  onOpenBlendPicker,
  onOpenAdjustments,
  onOpenTemplates,
  onUndo,
  onRedo,
  onSave,
  onExport,
  onSetCanvasSize,
  onSetBgColor,
  canvasWidth = 1080,
  canvasHeight = 1080,
  bgColor = '#0a0f0f',
  canUndo,
  canRedo,
  uploading: _uploading,
  hasSelection,
  isImageSelected = false,
  activeSheet,
  gestureActive = false,
}: MobileToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] safe-area-bottom"
      style={{
        opacity: gestureActive ? 0.2 : 1,
        transform: gestureActive ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        pointerEvents: gestureActive ? 'none' : 'auto',
      }}
    >
      {/* Add element popover */}
      {addMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
          <div
            className="absolute bottom-full left-3 mb-2 z-50 bg-surface/95 backdrop-blur-xl border border-border/30 rounded-2xl shadow-modal p-1.5 min-w-[160px]"
            style={{ animation: 'popUp 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
            <button
              onClick={() => { onAddText(); setAddMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover rounded-xl transition-colors active:scale-[0.98]"
            >
              <Plus size={16} className="text-primary" /> Plain Text
            </button>
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => { onAddText(preset.overrides as Partial<TextLayer>); setAddMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover rounded-xl transition-colors active:scale-[0.98]"
              >
                <span className="w-4" /> {preset.label}
              </button>
            ))}
            <div className="h-px bg-border/40 my-1 mx-2" />
            <button
              onClick={() => { onAddImage(); setAddMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover rounded-xl transition-colors active:scale-[0.98]"
            >
              <Image size={16} className="text-primary" /> Image Layer
            </button>
          </div>
        </>
      )}

      {/* More popover */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
          <div
            className="absolute bottom-full right-3 mb-2 z-50 bg-surface/95 backdrop-blur-xl border border-border/30 rounded-2xl shadow-modal p-1.5 min-w-[180px]"
            style={{ animation: 'popUp 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
            <PopoverButton icon={LayoutTemplate} label="Templates" onClick={() => { onOpenTemplates(); setMoreOpen(false); }} />
            <PopoverButton icon={Image} label="Library" onClick={() => { onOpenLibrary(); setMoreOpen(false); }} />
            <PopoverButton icon={Upload} label="Upload" onClick={() => { onUpload(); setMoreOpen(false); }} />
            <PopoverButton icon={SlidersHorizontal} label="Adjustments" onClick={() => { onOpenAdjustments(); setMoreOpen(false); }} />
            <div className="h-px bg-border/40 my-1 mx-2" />
            {/* Canvas size shortcuts */}
            {onSetCanvasSize && (
              <div className="flex items-center gap-1 px-3 py-2">
                <span className="text-xs text-text-muted mr-auto">Size</span>
                {([
                  { w: 1080, h: 1080, icon: Square, label: '1:1' },
                  { w: 1080, h: 1350, icon: RectangleVertical, label: '4:5' },
                  { w: 1080, h: 1920, icon: RectangleVertical, label: '9:16' },
                  { w: 1920, h: 1080, icon: RectangleHorizontal, label: '16:9' },
                ] as const).map(({ w, h, icon: SIcon, label: sLabel }) => (
                  <button
                    key={sLabel}
                    onClick={() => { onSetCanvasSize(w, h); }}
                    className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                      canvasWidth === w && canvasHeight === h
                        ? 'bg-primary text-white'
                        : 'text-text-muted hover:bg-surface-hover'
                    }`}
                    aria-label={sLabel}
                  >
                    <SIcon size={14} className={sLabel === '9:16' ? 'scale-y-125' : ''} />
                  </button>
                ))}
              </div>
            )}
            {/* Background color */}
            {onSetBgColor && (
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs text-text-muted mr-auto">BG</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => onSetBgColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-border"
                />
              </div>
            )}
            <div className="h-px bg-border/40 my-1 mx-2" />
            <PopoverButton icon={Undo2} label="Undo" onClick={() => { onUndo(); setMoreOpen(false); }} disabled={!canUndo} />
            <PopoverButton icon={Redo2} label="Redo" onClick={() => { onRedo(); setMoreOpen(false); }} disabled={!canRedo} />
            <PopoverButton icon={Download} label="Export" onClick={() => { onExport(); setMoreOpen(false); }} />
          </div>
        </>
      )}

      {/* Main toolbar — single row, anchored to bottom */}
      <div className="flex items-center justify-around px-2 py-1.5 bg-surface/95 backdrop-blur-xl border-t border-border/30">
        <ToolButton icon={Plus} label="Add" onClick={() => setAddMenuOpen(!addMenuOpen)} active={addMenuOpen} />
        <ToolButton icon={Layers} label="Layers" onClick={onOpenLayers} highlighted={activeSheet === 'layers'} />
        {hasSelection && !isImageSelected && (
          <ToolButton
            icon={TypeIcon}
            label="Font"
            onClick={onOpenFontPicker}
          />
        )}
        {hasSelection && isImageSelected && (
          <ToolButton
            icon={Blend}
            label="Blend"
            onClick={onOpenBlendPicker}
          />
        )}
        <ToolButton
          icon={SlidersHorizontal}
          label="Edit"
          onClick={onOpenProperties}
          active={hasSelection}
          highlighted={activeSheet === 'properties'}
        />
        <ToolButton icon={Save} label="Save" onClick={onSave} primary />
        <ToolButton icon={MoreHorizontal} label="More" onClick={() => setMoreOpen(!moreOpen)} active={moreOpen} />
      </div>

      {/* Inline keyframes for popover animation */}
      <style>{`
        @keyframes popUp {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
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
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all min-h-[48px] min-w-[48px] px-2 active:scale-90 ${
        highlighted
          ? 'text-primary bg-primary/10'
          : primary
          ? 'text-primary'
          : active
          ? 'text-primary'
          : disabled
          ? 'text-text-muted opacity-30'
          : 'text-text-muted'
      }`}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
      <span className="text-[10px] leading-none font-medium">{label}</span>
    </button>
  );
}

function PopoverButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-xl transition-all active:scale-[0.98] ${
        disabled ? 'text-text-muted opacity-40' : 'text-text-secondary hover:bg-surface-hover'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
