import { memo } from 'react';
import { X } from 'lucide-react';
import { EDITOR_FONTS } from '../../types';

interface MobileFontPickerProps {
  currentFont: string;
  onSelect: (font: string) => void;
  onClose: () => void;
}

export const MobileFontPicker = memo(function MobileFontPicker({
  currentFont,
  onSelect,
  onClose,
}: MobileFontPickerProps) {
  return (
    <div
      className="fixed top-12 left-0 right-0 z-[65] md:hidden safe-area-top"
      style={{ animation: 'slideDownIn 250ms cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <div className="mx-3 mt-2 rounded-2xl bg-surface/95 backdrop-blur-xl border border-border/20 shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex-1">Font</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-hover active:scale-90 transition-all"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Font list — scrollable grid */}
        <div
          className="px-3 pb-3 pt-1 max-h-[240px] overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {EDITOR_FONTS.map((font) => {
              const isActive = currentFont === font;
              return (
                <button
                  key={font}
                  onClick={() => onSelect(font)}
                  className={`px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.97] ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-surface-hover/60 text-text-secondary border border-transparent hover:bg-surface-active'
                  }`}
                >
                  <span
                    style={{ fontFamily: font }}
                    className="text-sm font-medium truncate block"
                  >
                    {font}
                  </span>
                  <span
                    style={{ fontFamily: font }}
                    className={`text-[10px] block mt-0.5 ${isActive ? 'text-primary/70' : 'text-text-muted'}`}
                  >
                    The quick brown fox
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDownIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

MobileFontPicker.displayName = 'MobileFontPicker';
