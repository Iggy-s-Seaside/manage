import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Undo2, Redo2, Download, Save, Upload, RectangleVertical, RectangleHorizontal, Square,
  Loader2, Image, Sliders, Type, Heading1, Heading2, Tag, Megaphone, ZoomIn, ZoomOut, Maximize,
  LayoutTemplate, Ruler, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DomCanvas, type DomCanvasHandle } from '../components/editor/DomCanvas';
import { PropertyPanel } from '../components/editor/PropertyPanel';
import { LayerPanel } from '../components/editor/LayerPanel';
import { ImageLibrary } from '../components/editor/ImageLibrary';
import { ImageAdjustments } from '../components/editor/ImageAdjustments';
import { MobileToolbar } from '../components/editor/MobileToolbar';
import { MobileFilterBar } from '../components/editor/MobileFilterBar';
import { MobileFontPicker } from '../components/editor/MobileFontPicker';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useEditorState } from '../hooks/useEditorState';
import { useImageUpload } from '../hooks/useImageUpload';
import { useSupabaseCRUD } from '../hooks/useSupabaseCRUD';
import { useDraftPersistence } from '../hooks/useDraftPersistence';
// useTouchCanvas removed — browser/CSS zoom on the canvas wrapper caused the
// entire UI to scale and "disappear".  The Canvas component already handles its
// own internal fit-to-container scaling.  Browser pinch-zoom is blocked via
// touch-action CSS on the editor container.
import { TEMPLATES } from '../data/templates';
import type { Special, TextLayer, UserTemplate } from '../types';
import { DEFAULT_IMAGE_FILTERS } from '../types';

// Text presets for quick add
const TEXT_PRESETS = [
  { label: 'Heading', icon: Heading1, overrides: { text: 'HEADING', fontSize: 96, fontFamily: 'Bebas Neue', fontStyle: 'bold', fill: '#ffffff', letterSpacing: 4 } },
  { label: 'Subtitle', icon: Heading2, overrides: { text: 'Subtitle text', fontSize: 36, fontFamily: 'Montserrat', fill: '#94a3b8', letterSpacing: 2 } },
  { label: 'Item', icon: Type, overrides: { text: '$5 ITEM NAME', fontSize: 36, fontFamily: 'Oswald', fontStyle: 'bold', fill: '#ffffff', align: 'center' as const, letterSpacing: 1 } },
  { label: 'Price', icon: Tag, overrides: { text: '$5', fontSize: 72, fontFamily: 'Anton', fill: '#f59e0b', fontStyle: 'bold' } },
  { label: 'CTA', icon: Megaphone, overrides: { text: 'JOIN US!', fontSize: 48, fontFamily: 'Oswald', fill: '#2dd4bf', fontStyle: 'bold', letterSpacing: 3 } },
  { label: 'Divider', icon: Minus, overrides: { elementType: 'divider' as const, text: 'SECTION', dividerLabel: 'SECTION', fontSize: 20, fontFamily: 'Montserrat', fontWeight: 600, fill: '#2dd4bf', letterSpacing: 4, dividerLineColor: '#2dd4bf', dividerLineOpacity: 0.4, dividerLineThickness: 1, dividerPadding: 40, dividerGap: 16, width: 1080 } },
];

type RightTab = 'properties' | 'adjustments';
type MobileSheet = 'layers' | 'properties' | 'adjustments' | 'templates' | null;

export function SpecialEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canvasRef = useRef<DomCanvasHandle>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const imageLayerInputRef = useRef<HTMLInputElement>(null);
  const presetsButtonRef = useRef<HTMLButtonElement>(null);

  const { state, selectedLayer, canUndo, canRedo, dispatch, addTextLayer } = useEditorState();
  const { upload, uploading } = useImageUpload();
  const { data: specials, create, update } = useSupabaseCRUD<Special>('specials');
  const { data: userTemplates, create: createTemplate, remove: removeTemplate } = useSupabaseCRUD<UserTemplate>('user_templates');
  // No more CSS-transform zoom wrapper — canvas handles its own scale internally.

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('properties');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [zoom, setZoom] = useState<number | undefined>(undefined); // undefined = auto-fit
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [exportQuality, setExportQuality] = useState(92);
  const [currentScale, setCurrentScale] = useState(1);
  const [isGesturing, setIsGesturing] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileFontPickerOpen, setMobileFontPickerOpen] = useState(false);
  const [customSizeOpen, setCustomSizeOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const customSizeRef = useRef<HTMLButtonElement>(null);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', category: 'drink' });
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [saveForm, setSaveForm] = useState({
    title: '',
    description: '',
    type: 'drink' as 'drink' | 'food' | 'seasonal',
    price: '',
  });

  const isEdit = Boolean(id);

  // Draft persistence
  const { loadDraft, clearDraft, hasDraft } = useDraftPersistence(id, state, saveForm);

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Mark unsaved changes
  useEffect(() => {
    if (state.layers.length > 0 || state.backgroundImage) {
      setHasUnsavedChanges(true);
    }
  }, [state]);

  // Load draft on mount (ref guard prevents StrictMode double-fire)
  const draftPromptShown = useRef(false);
  useEffect(() => {
    if (draftPromptShown.current) return;
    if (hasDraft()) {
      const draft = loadDraft();
      if (draft) {
        draftPromptShown.current = true;
        toast((t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm">Resume your draft?</span>
            <button
              onClick={() => {
                const editorState = {
                  ...draft.editorState,
                  imageFilters: draft.editorState.imageFilters || { ...DEFAULT_IMAGE_FILTERS },
                };
                dispatch({ type: 'LOAD_STATE', state: editorState });
                setSaveForm(draft.saveForm);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              Restore
            </button>
            <button
              onClick={() => {
                clearDraft();
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 text-xs font-medium bg-surface-hover text-text-secondary rounded-lg hover:bg-surface-active"
            >
              Discard
            </button>
          </div>
        ), { duration: 10000 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load template on mount
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId) {
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        dispatch({
          type: 'LOAD_STATE',
          state: {
            backgroundImage: null,
            backgroundColor: template.backgroundColor,
            backgroundGradient: template.backgroundGradient,
            imageFilters: { ...DEFAULT_IMAGE_FILTERS },
            layers: template.defaultLayers.map((l) => ({ ...l, id: crypto.randomUUID(), locked: false, visible: true })),
            selectedLayerId: null,
            canvasWidth: template.canvasWidth,
            canvasHeight: template.canvasHeight,
          },
        });
      }
    }
  }, [searchParams, dispatch]);

  // Load existing special for editing
  useEffect(() => {
    if (isEdit && specials.length > 0) {
      const special = specials.find((s) => s.id === Number(id));
      if (special) {
        setSaveForm({
          title: special.title,
          description: special.description,
          type: special.type,
          price: special.price ?? '',
        });
        if (special.image_url) {
          dispatch({ type: 'SET_BACKGROUND', url: special.image_url });
        }
      }
    }
  }, [isEdit, id, specials, dispatch]);

  const handleBgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, 'editor-bg');
    if (url) {
      dispatch({ type: 'SET_BACKGROUND', url });
      toast.success('Background uploaded!');
    }
    if (bgInputRef.current) bgInputRef.current.value = '';
  }, [upload, dispatch]);

  const handleLibrarySelect = useCallback((url: string) => {
    dispatch({ type: 'SET_BACKGROUND', url });
    toast.success('Background set from library');
  }, [dispatch]);

  const handleExport = useCallback((format: 'png' | 'jpeg' = 'png', quality = 92) => {
    dispatch({ type: 'SELECT_LAYER', id: null });
    setTimeout(() => {
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const dataUrl = canvasRef.current?.exportImage(mimeType, quality / 100);
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `iggy-special-${Date.now()}.${ext}`;
      link.href = dataUrl;
      link.click();
      toast.success(`Image exported as ${ext.toUpperCase()}!`);
    }, 100);
  }, [dispatch]);

  const handleSave = async () => {
    setSaving(true);

    dispatch({ type: 'SELECT_LAYER', id: null });
    await new Promise((r) => setTimeout(r, 150));

    const dataUrl = canvasRef.current?.exportImage();
    let imageUrl: string | null = null;

    if (dataUrl) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `special-${Date.now()}.png`, { type: 'image/png' });
      imageUrl = await upload(file, 'specials');
    }

    const payload = {
      title: saveForm.title,
      description: saveForm.description,
      type: saveForm.type,
      price: saveForm.price || null,
      image_url: imageUrl,
      active: true,
    };

    const ok = isEdit
      ? await update(Number(id), payload)
      : await create(payload as Omit<Special, 'id' | 'created_at'>);

    setSaving(false);
    if (ok) {
      clearDraft();
      setHasUnsavedChanges(false);
      setSaveModalOpen(false);
      navigate('/specials');
    }
  };

  // Add image layer from file
  const handleAddImageLayer = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Create an image to get natural dimensions
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = Math.min(img.naturalWidth, state.canvasWidth * 0.8);
        const ratio = img.naturalHeight / img.naturalWidth;
        const layerWidth = Math.round(maxWidth);
        const layerHeight = Math.round(maxWidth * ratio);
        addTextLayer({
          elementType: 'image',
          text: file.name, // Store filename as label
          imageSrc: dataUrl,
          imageHeight: layerHeight,
          width: layerWidth,
          fontSize: 16, // Unused for image but required by type
          x: Math.round((state.canvasWidth - layerWidth) / 2),
          y: Math.round((state.canvasHeight - layerHeight) / 2),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [state.canvasWidth, state.canvasHeight, addTextLayer]);

  const handleDuplicate = useCallback((layer: TextLayer) => {
    const { id: _id, ...rest } = layer;
    addTextLayer({
      ...rest,
      x: layer.x + 20,
      y: layer.y + 20,
    });
  }, [addTextLayer]);

  // Back navigation with unsaved changes guard
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setLeaveConfirmOpen(true);
    } else {
      navigate('/specials');
    }
  }, [hasUnsavedChanges, navigate]);

  // Load a template into the editor
  const loadTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    dispatch({
      type: 'LOAD_STATE',
      state: {
        backgroundImage: null,
        backgroundColor: template.backgroundColor,
        backgroundGradient: template.backgroundGradient,
        imageFilters: { ...DEFAULT_IMAGE_FILTERS },
        layers: template.defaultLayers.map((l) => ({ ...l, id: crypto.randomUUID(), locked: false, visible: true })),
        selectedLayerId: null,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
      },
    });
    setTemplatePickerOpen(false);
    toast.success(`Loaded "${template.name}" template`);
  }, [dispatch]);

  const loadUserTemplate = useCallback((template: UserTemplate) => {
    dispatch({
      type: 'LOAD_STATE',
      state: {
        backgroundImage: null,
        backgroundColor: template.background_color,
        backgroundGradient: template.background_gradient ?? undefined,
        imageFilters: { ...DEFAULT_IMAGE_FILTERS },
        layers: template.layers.map((l) => ({ ...l, id: crypto.randomUUID(), locked: false, visible: true })),
        selectedLayerId: null,
        canvasWidth: template.canvas_width,
        canvasHeight: template.canvas_height,
      },
    });
    setTemplatePickerOpen(false);
    setMobileSheet(null);
    toast.success(`Loaded "${template.name}" template`);
  }, [dispatch]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateForm.name.trim()) return;
    setSavingTemplate(true);
    dispatch({ type: 'SELECT_LAYER', id: null });
    await new Promise((r) => setTimeout(r, 150));

    // Export and downscale thumbnail
    const fullDataUrl = canvasRef.current?.exportImage('image/jpeg', 0.7);
    let thumbnailUrl: string | null = null;
    if (fullDataUrl) {
      try {
        const img = new window.Image();
        img.src = fullDataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        const thumbCanvas = document.createElement('canvas');
        const thumbWidth = 300;
        const thumbHeight = Math.round((img.height / img.width) * thumbWidth);
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const ctx = thumbCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          const blob = await new Promise<Blob | null>((resolve) => thumbCanvas.toBlob(resolve, 'image/jpeg', 0.8));
          if (blob) {
            const file = new File([blob], `template-${Date.now()}.jpg`, { type: 'image/jpeg' });
            thumbnailUrl = await upload(file, 'templates');
          }
        }
      } catch { /* thumbnail is optional, continue without it */ }
    }

    // Strip IDs from layers for storage
    const layersForStorage = state.layers.map(({ id: _id, ...rest }) => rest);

    const ok = await createTemplate({
      name: templateForm.name.trim(),
      category: templateForm.category,
      canvas_width: state.canvasWidth,
      canvas_height: state.canvasHeight,
      background_color: state.backgroundColor,
      background_gradient: state.backgroundGradient ?? null,
      layers: layersForStorage,
      thumbnail_url: thumbnailUrl,
    } as Omit<UserTemplate, 'id' | 'created_at'>);

    setSavingTemplate(false);
    if (ok) {
      setSaveTemplateModalOpen(false);
      setTemplateForm({ name: '', category: 'drink' });
    }
  }, [templateForm, state, dispatch, upload, createTemplate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      // Cmd+Z / Cmd+Shift+Z — Undo / Redo
      if (mod && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
        return;
      }

      // Cmd+S — Save (open modal)
      if (mod && e.key === 's') {
        e.preventDefault();
        setSaveModalOpen(true);
        return;
      }

      // Cmd+D — Duplicate selected layer
      if (mod && e.key === 'd') {
        e.preventDefault();
        if (selectedLayer) {
          handleDuplicate(selectedLayer);
          toast.success('Layer duplicated');
        }
        return;
      }

      // Delete / Backspace — Remove selected (unlocked) layer
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedLayerId) {
          const layer = state.layers.find(l => l.id === state.selectedLayerId);
          if (layer && !layer.locked) {
            dispatch({ type: 'REMOVE_LAYER', id: state.selectedLayerId });
          }
        }
        return;
      }

      // Arrow keys — Nudge selected layer (1px, or 10px with Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (state.selectedLayerId) {
          const layer = state.layers.find(l => l.id === state.selectedLayerId);
          if (layer && !layer.locked) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const changes: Partial<TextLayer> = {};
            if (e.key === 'ArrowUp') changes.y = layer.y - step;
            if (e.key === 'ArrowDown') changes.y = layer.y + step;
            if (e.key === 'ArrowLeft') changes.x = layer.x - step;
            if (e.key === 'ArrowRight') changes.x = layer.x + step;
            dispatch({ type: 'UPDATE_LAYER', id: state.selectedLayerId, changes });
          }
        }
        return;
      }

      // Escape — Deselect
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT_LAYER', id: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, state.selectedLayerId, state.layers, selectedLayer, handleDuplicate]);

  // Hide the main app nav header on mobile when editor is open
  useEffect(() => {
    const navBar = document.querySelector('.lg\\:hidden.fixed.top-0') as HTMLElement;
    if (navBar) navBar.style.display = 'none';
    return () => {
      if (navBar) navBar.style.display = '';
    };
  }, []);

  return (
    <div className="md:h-[calc(100vh-3rem)] md:-m-6 lg:-m-8 md:relative md:flex md:flex-col fixed inset-0 z-50 flex flex-col bg-background">
      {/* Desktop Toolbar — hidden on mobile (MobileToolbar handles it) */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-border shrink-0 overflow-x-auto">
        <button onClick={handleBack} className="btn-ghost text-xs py-1.5 px-2" aria-label="Back to specials">
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-6 bg-border" />

        {/* Text Tools */}
        <button onClick={() => addTextLayer()} className="btn-secondary text-xs py-1.5 px-3">
          <Plus size={14} /> Text
        </button>

        {/* Text Presets dropdown — uses portal to escape toolbar overflow clipping */}
        <button
          ref={presetsButtonRef}
          className="btn-secondary text-xs py-1.5 px-3"
          onClick={() => setPresetsOpen(!presetsOpen)}
        >
          <Type size={14} /> Presets
        </button>
        {presetsOpen && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPresetsOpen(false)} />
            <div
              className="fixed z-50 bg-surface border border-border rounded-lg shadow-modal p-1.5 min-w-[140px]"
              style={(() => {
                const rect = presetsButtonRef.current?.getBoundingClientRect();
                return rect ? { top: rect.bottom + 4, left: rect.left } : {};
              })()}
            >
              {TEXT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    addTextLayer(preset.overrides as Partial<TextLayer>);
                    setPresetsOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover rounded-md transition-colors"
                >
                  <preset.icon size={13} />
                  {preset.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}

        <button
          onClick={() => setTemplatePickerOpen(!templatePickerOpen)}
          className="btn-secondary text-xs py-1.5 px-3"
          title="Start from a template"
        >
          <LayoutTemplate size={14} /> Templates
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Background Tools */}
        <button onClick={() => setLibraryOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
          <Image size={14} /> Library
        </button>
        <button onClick={() => bgInputRef.current?.click()} className="btn-secondary text-xs py-1.5 px-3" disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        <input ref={imageLayerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAddImageLayer(file);
          if (imageLayerInputRef.current) imageLayerInputRef.current.value = '';
        }} />

        <div className="w-px h-6 bg-border" />

        {/* Canvas size */}
        <button
          onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1080 })}
          className={`p-2 rounded-lg transition-colors ${state.canvasWidth === 1080 && state.canvasHeight === 1080 ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title="Square (1080×1080)"
          aria-label="Square canvas"
        >
          <Square size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1350 })}
          className={`p-2 rounded-lg transition-colors ${state.canvasWidth === 1080 && state.canvasHeight === 1350 ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title="Portrait (1080×1350)"
          aria-label="Portrait canvas"
        >
          <RectangleVertical size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1920 })}
          className={`p-2 rounded-lg transition-colors ${state.canvasWidth === 1080 && state.canvasHeight === 1920 ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title="Story (1080×1920)"
          aria-label="Story canvas"
        >
          <RectangleVertical size={16} className="scale-y-125" />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1920, height: 1080 })}
          className={`p-2 rounded-lg transition-colors ${state.canvasWidth === 1920 && state.canvasHeight === 1080 ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title="Landscape (1920×1080)"
          aria-label="Landscape canvas"
        >
          <RectangleHorizontal size={16} />
        </button>
        <button
          ref={customSizeRef}
          onClick={() => { setCustomWidth(state.canvasWidth); setCustomHeight(state.canvasHeight); setCustomSizeOpen(!customSizeOpen); }}
          className={`p-2 rounded-lg transition-colors ${![[1080,1080],[1080,1350],[1080,1920],[1920,1080]].some(([w,h]) => state.canvasWidth === w && state.canvasHeight === h) ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title={`Custom (${state.canvasWidth}×${state.canvasHeight})`}
          aria-label="Custom canvas size"
        >
          <Ruler size={16} />
        </button>
        {customSizeOpen && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCustomSizeOpen(false)} />
            <div
              className="fixed z-50 bg-surface border border-border rounded-lg shadow-modal p-3 w-56"
              style={(() => {
                const rect = customSizeRef.current?.getBoundingClientRect();
                return rect ? { top: rect.bottom + 4, left: rect.left } : {};
              })()}
            >
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Custom Size</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-[13px] text-text-muted">Width</label>
                  <input
                    type="number"
                    min={256}
                    max={4096}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="input-field text-xs w-full"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-text-muted">Height</label>
                  <input
                    type="number"
                    min={256}
                    max={4096}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="input-field text-xs w-full"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const w = Math.min(4096, Math.max(256, customWidth));
                  const h = Math.min(4096, Math.max(256, customHeight));
                  dispatch({ type: 'SET_CANVAS_SIZE', width: w, height: h });
                  setCustomSizeOpen(false);
                  toast.success(`Canvas set to ${w}×${h}`);
                }}
                className="btn-primary w-full text-xs"
              >
                Apply
              </button>
            </div>
          </>,
          document.body,
        )}

        <div className="w-px h-6 bg-border" />

        <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted disabled:opacity-30" title="Undo (Cmd+Z)" aria-label="Undo">
          <Undo2 size={16} />
        </button>
        <button onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted disabled:opacity-30" title="Redo (Cmd+Shift+Z)" aria-label="Redo">
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Zoom controls */}
        <button
          onClick={() => setZoom(z => Math.max(0.25, (z ?? canvasRef.current?.getScale() ?? 0.5) - 0.1))}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-text-muted w-10 text-center tabular-nums" aria-label={`Zoom ${Math.round(currentScale * 100)}%`}>
          {Math.round(currentScale * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(2, (z ?? canvasRef.current?.getScale() ?? 0.5) + 0.1))}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(undefined)}
          className={`p-1.5 rounded-lg hover:bg-surface-hover transition-colors ${zoom === undefined ? 'text-primary' : 'text-text-muted'}`}
          title="Fit to Screen"
          aria-label="Fit to screen"
        >
          <Maximize size={16} />
        </button>

        <div className="flex-1" />

        {/* Background color */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">BG:</span>
          <input
            type="color"
            value={state.backgroundColor}
            onChange={(e) => dispatch({ type: 'SET_BACKGROUND_COLOR', color: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-border"
          />
        </div>

        <div className="w-px h-6 bg-border" />

        <button onClick={() => setExportModalOpen(true)} className="btn-secondary text-xs py-1.5 px-3" aria-label="Export image">
          <Download size={14} /> Export
        </button>
        <button onClick={() => setSaveModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
          <Save size={14} /> Save
        </button>
      </div>

      {/* Mobile header — ultra-minimal, just back + title */}
      <div
        className="flex md:hidden items-center gap-3 px-3 py-1.5 shrink-0 bg-surface/90 backdrop-blur-xl border-b border-border/30"
        style={{
          opacity: isGesturing ? 0 : 1,
          transform: isGesturing ? 'translateY(-10px)' : 'translateY(0)',
          transition: 'opacity 200ms ease, transform 200ms ease',
          pointerEvents: isGesturing ? 'none' : 'auto',
        }}
      >
        <button onClick={handleBack} className="p-2 rounded-xl hover:bg-surface-hover active:scale-90 transition-all" aria-label="Back to specials">
          <ArrowLeft size={18} className="text-text-primary" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary flex-1 truncate">
          {isEdit ? 'Edit Special' : 'New Special'}
        </h2>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Layers (desktop only, narrower at md, wider at lg) */}
        <div className="w-44 lg:w-56 bg-surface border-r border-border p-2 lg:p-3 overflow-y-auto hidden md:block">
          <LayerPanel
            layers={state.layers}
            selectedId={state.selectedLayerId}
            onSelect={(id) => dispatch({ type: 'SELECT_LAYER', id })}
            onReorder={(layers) => dispatch({ type: 'REORDER_LAYERS', layers })}
            onDelete={(id) => dispatch({ type: 'REMOVE_LAYER', id })}
            onDuplicate={handleDuplicate}
            onToggleVisibility={(id) => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', id })}
            onToggleLock={(id) => dispatch({ type: 'TOGGLE_LAYER_LOCK', id })}
          />
        </div>

        {/* Canvas Area — DOM-based canvas with gesture handling */}
        <div className="flex-1 bg-black/40 md:bg-surface-active overflow-hidden">
          <DomCanvas
            ref={canvasRef}
            state={state}
            onSelectLayer={(id) => dispatch({ type: 'SELECT_LAYER', id })}
            onUpdateLayer={(id, changes) => dispatch({ type: 'UPDATE_LAYER', id, changes })}
            zoomOverride={zoom}
            onScaleChange={setCurrentScale}
            onGestureChange={setIsGesturing}
            onLayerTapped={() => {
              // Don't auto-open properties on tap — let users drag freely.
              // Properties are auto-opened only when ADDING a new layer from presets.
            }}
          />
        </div>

        {/* Right Panel - Properties / Adjustments (desktop only, narrower at md, wider at lg) */}
        <div className="w-60 lg:w-72 bg-surface border-l border-border flex-col hidden md:flex">
          {/* Tab switcher */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setRightTab('properties')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                rightTab === 'properties'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Type size={14} /> Properties
            </button>
            <button
              onClick={() => setRightTab('adjustments')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                rightTab === 'adjustments'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Sliders size={14} /> Adjust
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {rightTab === 'properties' ? (
              selectedLayer ? (
                <PropertyPanel
                  layer={selectedLayer}
                  onUpdate={(changes) => dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, changes })}
                  onDelete={() => dispatch({ type: 'REMOVE_LAYER', id: selectedLayer.id })}
                />
              ) : (
                <div className="text-center py-8">
                  <Type size={24} className="mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">Select a text layer to edit</p>
                  <p className="text-xs text-text-muted mt-1">or add one from the toolbar</p>
                </div>
              )
            ) : (
              <ImageAdjustments
                filters={state.imageFilters}
                hasBackground={!!state.backgroundImage}
                onUpdate={(filters) => dispatch({ type: 'SET_IMAGE_FILTERS', filters })}
                onReset={() => dispatch({ type: 'RESET_IMAGE_FILTERS' })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Toolbar — fixed at bottom */}
      <MobileToolbar
        onAddText={(overrides) => {
          addTextLayer(overrides);
          // Auto-open properties on mobile so user can immediately edit text/font
          setMobileSheet('properties');
        }}
        onAddImage={() => imageLayerInputRef.current?.click()}
        onOpenLibrary={() => setLibraryOpen(true)}
        onUpload={() => bgInputRef.current?.click()}
        onOpenLayers={() => setMobileSheet('layers')}
        onOpenProperties={() => setMobileSheet('properties')}
        onOpenFontPicker={() => { setMobileFontPickerOpen(true); setMobileSheet(null); }}
        onOpenAdjustments={() => { setMobileFiltersOpen(true); setMobileSheet(null); }}
        onOpenTemplates={() => setMobileSheet('templates')}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onSave={() => setSaveModalOpen(true)}
        onExport={() => setExportModalOpen(true)}
        onSetCanvasSize={(w, h) => dispatch({ type: 'SET_CANVAS_SIZE', width: w, height: h })}
        onSetBgColor={(color) => dispatch({ type: 'SET_BACKGROUND_COLOR', color })}
        canvasWidth={state.canvasWidth}
        canvasHeight={state.canvasHeight}
        bgColor={state.backgroundColor}
        canUndo={canUndo}
        canRedo={canRedo}
        uploading={uploading}
        hasSelection={!!selectedLayer}
        activeSheet={mobileSheet}
        gestureActive={isGesturing}
      />

      {/* Mobile Bottom Sheets */}
      <BottomSheet
        open={mobileSheet === 'layers'}
        onClose={() => setMobileSheet(null)}
        title="Layers"
      >
        <LayerPanel
          layers={state.layers}
          selectedId={state.selectedLayerId}
          onSelect={(id) => dispatch({ type: 'SELECT_LAYER', id })}
          onReorder={(layers) => dispatch({ type: 'REORDER_LAYERS', layers })}
          onDelete={(id) => dispatch({ type: 'REMOVE_LAYER', id })}
          onDuplicate={handleDuplicate}
          onToggleVisibility={(id) => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', id })}
          onToggleLock={(id) => dispatch({ type: 'TOGGLE_LAYER_LOCK', id })}
        />
      </BottomSheet>

      <BottomSheet
        open={mobileSheet === 'properties'}
        onClose={() => setMobileSheet(null)}
        title={selectedLayer?.elementType === 'divider' ? 'Divider Properties' : selectedLayer?.elementType === 'image' ? 'Image Properties' : 'Text Properties'}
      >
        {selectedLayer ? (
          <PropertyPanel
            layer={selectedLayer}
            onUpdate={(changes) => dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, changes })}
            onDelete={() => dispatch({ type: 'REMOVE_LAYER', id: selectedLayer.id })}
          />
        ) : (
          <div className="text-center py-8">
            <Type size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">Select a text layer first</p>
          </div>
        )}
      </BottomSheet>

      {/* Mobile floating filter bar — overlays canvas for real-time preview */}
      {mobileFiltersOpen && (
        <MobileFilterBar
          filters={state.imageFilters}
          hasBackground={!!state.backgroundImage}
          onUpdate={(filters) => dispatch({ type: 'SET_IMAGE_FILTERS', filters })}
          onReset={() => dispatch({ type: 'RESET_IMAGE_FILTERS' })}
          onClose={() => setMobileFiltersOpen(false)}
        />
      )}

      {/* Mobile floating font picker — overlays canvas for real-time preview */}
      {mobileFontPickerOpen && selectedLayer && (
        <MobileFontPicker
          layer={selectedLayer}
          onUpdate={(changes) => dispatch({ type: 'UPDATE_LAYER', id: selectedLayer.id, changes })}
          onClose={() => setMobileFontPickerOpen(false)}
          elementScreenY={(() => {
            // Calculate where the selected element is on screen (0=top, 1=bottom)
            const canvasEl = document.querySelector('[data-layer-id="' + selectedLayer.id + '"]');
            if (canvasEl) {
              const rect = canvasEl.getBoundingClientRect();
              return (rect.top + rect.height / 2) / window.innerHeight;
            }
            return 0.5;
          })()}
        />
      )}

      {/* Image Library Drawer */}
      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
      />

      {/* Leave confirmation */}
      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={() => navigate('/specials')}
        title="Unsaved Changes"
        message="You have unsaved changes. Your draft is auto-saved and you can resume later. Leave anyway?"
        confirmLabel="Leave"
        danger={false}
      />

      {/* Export Modal */}
      <Modal open={exportModalOpen} onClose={() => setExportModalOpen(false)} title="Export Image" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat('png')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${exportFormat === 'png' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}
              >
                PNG
              </button>
              <button
                onClick={() => setExportFormat('jpeg')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${exportFormat === 'jpeg' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:bg-surface-active'}`}
              >
                JPEG
              </button>
            </div>
            <p className="text-[13px] text-text-muted mt-1">
              {exportFormat === 'png' ? 'Lossless quality, larger file size. Best for graphics with text.' : 'Smaller file size, adjustable quality. Best for photos.'}
            </p>
          </div>
          {exportFormat === 'jpeg' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">Quality: {exportQuality}%</label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={exportQuality}
                onChange={(e) => setExportQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[12px] text-text-muted mt-0.5">
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          )}
          <button
            onClick={() => { handleExport(exportFormat, exportQuality); setExportModalOpen(false); }}
            className="btn-primary w-full"
          >
            <Download size={14} /> Download {exportFormat.toUpperCase()}
          </button>
        </div>
      </Modal>

      {/* Template Picker — shared grid used in both Modal (desktop) and BottomSheet (mobile) */}
      {(() => {
        const templateGrid = (
          <>
            <p className="text-xs text-text-muted mb-3">This will replace your current canvas. Your draft is auto-saved.</p>

            {/* User templates */}
            {userTemplates.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">My Templates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {userTemplates.map((t) => (
                    <div key={t.id} className="relative group">
                      <button
                        onClick={() => loadUserTemplate(t)}
                        className="text-left w-full p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-surface-hover transition-all"
                      >
                        <div
                          className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                          style={{ background: t.background_gradient || t.background_color }}
                        >
                          {t.thumbnail_url ? (
                            <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover rounded-lg" />
                          ) : t.name}
                        </div>
                        <p className="text-sm font-medium text-text-primary">{t.name}</p>
                        <p className="text-xs text-text-muted capitalize">{t.category}</p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTemplateId(t.id); }}
                        className="absolute top-2 right-2 p-1 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        aria-label="Delete template"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Built-in templates */}
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Built-in</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { loadTemplate(t.id); setMobileSheet(null); }}
                  className="text-left p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group"
                >
                  <div
                    className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: t.backgroundGradient || t.backgroundColor }}
                  >
                    {t.name}
                  </div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">{t.name}</p>
                  <p className="text-xs text-text-muted capitalize">{t.category}</p>
                </button>
              ))}
            </div>
          </>
        );
        return (
          <>
            <Modal open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} title="Start from Template" maxWidth="max-w-md">
              {templateGrid}
            </Modal>
            <BottomSheet open={mobileSheet === 'templates'} onClose={() => setMobileSheet(null)} title="Templates">
              {templateGrid}
            </BottomSheet>
          </>
        );
      })()}

      {/* Delete User Template Confirmation */}
      <ConfirmDialog
        open={deleteTemplateId !== null}
        onClose={() => setDeleteTemplateId(null)}
        onConfirm={() => { if (deleteTemplateId) removeTemplate(deleteTemplateId); setDeleteTemplateId(null); }}
        title="Delete Template"
        message="Are you sure you want to delete this template? This cannot be undone."
        confirmLabel="Delete"
      />

      {/* Save as Template Modal */}
      <Modal open={saveTemplateModalOpen} onClose={() => setSaveTemplateModalOpen(false)} title="Save as Template" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="label">Template Name *</label>
            <input
              className="input-field"
              value={templateForm.name}
              onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="My Happy Hour Template"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input-field"
              value={templateForm.category}
              onChange={(e) => setTemplateForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="drink">Drink</option>
              <option value="food">Food</option>
              <option value="event">Event</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>
          <p className="text-[13px] text-text-muted">Saves your current canvas layout as a reusable starting point.</p>
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || !templateForm.name.trim()}
            className="btn-primary w-full"
          >
            {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </Modal>

      {/* Save Modal */}
      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save Special">
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input-field"
              value={saveForm.title}
              onChange={(e) => setSaveForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Happy Hour Special"
              required
            />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              value={saveForm.description}
              onChange={(e) => setSaveForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="$5 well drinks and $3 draft beers..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                className="input-field"
                value={saveForm.type}
                onChange={(e) => setSaveForm((f) => ({ ...f, type: e.target.value as 'drink' | 'food' | 'seasonal' }))}
              >
                <option value="drink">Drink</option>
                <option value="food">Food</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>
            <div>
              <label className="label">Price</label>
              <input
                className="input-field"
                value={saveForm.price}
                onChange={(e) => setSaveForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="$8"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setSaveModalOpen(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !saveForm.title.trim() || !saveForm.description.trim()}
              className="btn-primary"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Update' : 'Save'}
            </button>
          </div>
          <div className="border-t border-border mt-4 pt-3 text-center">
            <button
              onClick={() => { setSaveModalOpen(false); setSaveTemplateModalOpen(true); }}
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Or save as reusable template →
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
