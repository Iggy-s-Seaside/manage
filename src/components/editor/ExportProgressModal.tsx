import { memo } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';

interface ExportProgressModalProps {
  /** 0 to 1 */
  progress: number;
  /** Whether export is complete */
  done: boolean;
  /** The exported blob (available when done) */
  blob: Blob | null;
  /** File extension for download */
  format: 'gif' | 'webm';
  /** Cancel callback */
  onCancel: () => void;
  /** Close callback (after done) */
  onClose: () => void;
}

export const ExportProgressModal = memo<ExportProgressModalProps>(({
  progress,
  done,
  blob,
  format,
  onCancel,
  onClose,
}) => {
  const pct = Math.round(progress * 100);

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iggy-special-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!blob) return;
    const file = new File([blob], `iggy-special.${format}`, {
      type: format === 'gif' ? 'image/gif' : 'video/webm',
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        // User cancelled share — not an error
      }
    } else {
      // Fallback to download
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-surface border border-border/20 shadow-modal p-6"
        style={{ animation: 'slideUpIn 250ms cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        {!done ? (
          <>
            {/* Exporting state */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Exporting {format.toUpperCase()}...
              </h3>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-xl hover:bg-surface-hover active:scale-90 transition-all"
              >
                <X size={16} className="text-text-muted" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-text-muted text-center">{pct}%</p>

            <div className="flex items-center justify-center mt-4">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          </>
        ) : (
          <>
            {/* Done state */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Export Complete
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-surface-hover active:scale-90 transition-all"
              >
                <X size={16} className="text-text-muted" />
              </button>
            </div>

            {blob && (
              <p className="text-xs text-text-muted mb-4">
                {format.toUpperCase()} &middot; {(blob.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Download size={14} /> Download
              </button>
              {typeof navigator.share === 'function' && (
                <button
                  onClick={handleShare}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <Share2 size={14} /> Share
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

ExportProgressModal.displayName = 'ExportProgressModal';
