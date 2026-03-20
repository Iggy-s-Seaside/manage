import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react';
import { X, ChevronLeft } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  peekHeight?: number;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, isDragging: false });
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Close on escape
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

  // Detect keyboard open/close via visualViewport resize
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // If visualViewport height is significantly less than window height, keyboard is open
      const isKeyboard = vv.height < window.innerHeight * 0.75;
      setKeyboardVisible(isKeyboard);
    };

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, [open]);

  // Drag-to-close — only from the handle area
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
    <div className="fixed inset-0 z-[70] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Full-screen sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 top-0 bg-surface flex flex-col animate-sheet-up"
        style={{
          // When keyboard is visible, let the sheet resize with the visual viewport
          height: keyboardVisible ? `${window.visualViewport?.height ?? window.innerHeight}px` : '100%',
          transition: keyboardVisible ? 'none' : 'height 0.3s ease',
        }}
      >
        {/* Header with close */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="Close"
          >
            <ChevronLeft size={22} />
          </button>
          <h3 className="text-base font-bold text-text-primary flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag indicator (subtle, for gesture hint) */}
        <div
          className="flex justify-center py-1 cursor-grab shrink-0"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Content — fills remaining space, scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-20">
          {children}
        </div>
      </div>
    </div>
  );
}
