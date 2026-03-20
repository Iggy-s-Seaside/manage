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
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, isDragging: false });
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Slider peek-through: when a slider is being dragged, collapse sheet to show canvas
  const [sliderActive, setSliderActive] = useState(false);
  const [activeSliderLabel, setActiveSliderLabel] = useState('');
  const [activeSliderValue, setActiveSliderValue] = useState('');
  const activeSliderRef = useRef<HTMLInputElement | null>(null);
  const floatingSliderRef = useRef<HTMLDivElement>(null);

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
      const isKeyboard = vv.height < window.innerHeight * 0.75;
      setKeyboardVisible(isKeyboard);
    };

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, [open]);

  // Slider peek-through: detect range input interactions via event delegation
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const content = contentRef.current;

    const handleSliderStart = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName !== 'INPUT' || target.type !== 'range') return;

      activeSliderRef.current = target;

      // Find the label for this slider — look for a preceding label or parent's label
      const parent = target.closest('div');
      const label = parent?.querySelector('label')?.textContent
        || parent?.parentElement?.querySelector('label')?.textContent
        || '';

      setActiveSliderLabel(label);
      setActiveSliderValue(target.value);
      setSliderActive(true);
    };

    const handleSliderMove = (e: Event) => {
      if (!activeSliderRef.current) return;
      const target = e.target as HTMLInputElement;
      if (target === activeSliderRef.current) {
        setActiveSliderValue(target.value);
      }
    };

    const handleSliderEnd = () => {
      if (!activeSliderRef.current) return;
      activeSliderRef.current = null;
      setSliderActive(false);
    };

    // Use pointer events for broader compatibility
    content.addEventListener('pointerdown', handleSliderStart, { passive: true });
    content.addEventListener('input', handleSliderMove, { passive: true });
    content.addEventListener('pointerup', handleSliderEnd, { passive: true });
    content.addEventListener('pointercancel', handleSliderEnd, { passive: true });
    // Also listen on window for pointerup in case finger leaves the element
    window.addEventListener('pointerup', handleSliderEnd, { passive: true });

    return () => {
      content.removeEventListener('pointerdown', handleSliderStart);
      content.removeEventListener('input', handleSliderMove);
      content.removeEventListener('pointerup', handleSliderEnd);
      content.removeEventListener('pointercancel', handleSliderEnd);
      window.removeEventListener('pointerup', handleSliderEnd);
    };
  }, [open]);

  // When slider is active, clone & sync the range input into the floating bar
  useEffect(() => {
    if (!sliderActive || !activeSliderRef.current || !floatingSliderRef.current) return;

    const original = activeSliderRef.current;
    const container = floatingSliderRef.current;

    // Create a synced range input in the floating bar
    const clone = document.createElement('input');
    clone.type = 'range';
    clone.min = original.min;
    clone.max = original.max;
    clone.step = original.step || 'any';
    clone.value = original.value;
    clone.className = 'flex-1 accent-primary h-2';

    // Two-way sync: moving the floating slider updates the original
    const syncToOriginal = () => {
      original.value = clone.value;
      original.dispatchEvent(new Event('input', { bubbles: true }));
      original.dispatchEvent(new Event('change', { bubbles: true }));
      setActiveSliderValue(clone.value);
    };

    clone.addEventListener('input', syncToOriginal);
    clone.addEventListener('pointerup', () => {
      setSliderActive(false);
    });

    container.innerHTML = '';
    container.appendChild(clone);

    return () => {
      clone.removeEventListener('input', syncToOriginal);
      container.innerHTML = '';
    };
  }, [sliderActive]);

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

  // Format the slider value for display
  const displayValue = (() => {
    const num = Number(activeSliderValue);
    if (isNaN(num)) return activeSliderValue;
    return num % 1 === 0 ? String(num) : num.toFixed(2);
  })();

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      {/* Backdrop — transparent when slider is active so canvas is visible */}
      <div
        className="absolute inset-0 animate-fade-in transition-colors duration-200"
        style={{
          backgroundColor: sliderActive ? 'transparent' : 'rgba(0,0,0,0.6)',
        }}
        onClick={sliderActive ? undefined : onClose}
      />

      {/* Floating slider bar — visible only when slider is active */}
      {sliderActive && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[80] safe-area-bottom animate-fade-in"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="mx-3 mb-3 px-4 py-3 rounded-2xl bg-surface/85 backdrop-blur-xl border border-border/30 shadow-modal">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {activeSliderLabel || 'Adjust'}
              </span>
              <span className="text-sm font-bold text-primary tabular-nums">
                {displayValue}
              </span>
            </div>
            <div
              ref={floatingSliderRef}
              className="flex items-center"
            />
          </div>
        </div>
      )}

      {/* Full-screen sheet — hidden when slider is active */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 top-0 bg-surface flex flex-col animate-sheet-up"
        style={{
          height: keyboardVisible ? `${window.visualViewport?.height ?? window.innerHeight}px` : '100%',
          transition: sliderActive
            ? 'opacity 200ms ease, transform 200ms ease'
            : keyboardVisible ? 'none' : 'height 0.3s ease',
          opacity: sliderActive ? 0 : 1,
          transform: sliderActive ? 'translateY(100%)' : undefined,
          pointerEvents: sliderActive ? 'none' : 'auto',
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

        {/* Drag indicator */}
        <div
          className="flex justify-center py-1 cursor-grab shrink-0"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Content — fills remaining space, scrollable */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 pb-20"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
