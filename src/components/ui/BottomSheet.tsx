import { useRef, useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  peekHeight?: number;
}

export function BottomSheet({ open, onClose, title, children, peekHeight = 280 }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, isDragging: false });

  // Close on escape — but don't fire if FontPicker (or similar) already handled it
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Drag-to-close — only from the handle area, NOT from content scroll
  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.isDragging = true;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - dragRef.current.startY;
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleDragEnd = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;
    dragRef.current.isDragging = false;
    const deltaY = e.changedTouches[0].clientY - dragRef.current.startY;
    sheetRef.current.style.transform = '';
    if (deltaY > 100) {
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — 55vh default so users can still see the canvas above */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-2xl shadow-modal animate-sheet-up"
        style={{ maxHeight: '55vh' }}
      >
        {/* Drag handle — only this area triggers drag-to-close */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted uppercase tracking-wider">Editor</span>
            <span className="text-text-muted">/</span>
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable independently of drag handle */}
        <div
          className="overflow-y-auto overscroll-contain p-4"
          style={{ maxHeight: `calc(55vh - 60px)`, minHeight: `${peekHeight}px` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
