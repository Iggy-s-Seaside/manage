import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Undo2, Redo2, Download, Save, Upload, RectangleVertical, Square,
  Loader2, Image, Sliders, Type, Heading1, Heading2, Tag, Megaphone, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Canvas, type CanvasHandle } from '../components/editor/Canvas';
import { PropertyPanel } from '../components/editor/PropertyPanel';
import { LayerPanel } from '../components/editor/LayerPanel';
import { ImageLibrary } from '../components/editor/ImageLibrary';
import { ImageAdjustments } from '../components/editor/ImageAdjustments';
import { MobileToolbar } from '../components/editor/MobileToolbar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Modal } from '../components/ui/Modal';
import { useEditorState } from '../hooks/useEditorState';
import { useImageUpload } from '../hooks/useImageUpload';
import { useSupabaseCRUD } from '../hooks/useSupabaseCRUD';
import { useDraftPersistence } from '../hooks/useDraftPersistence';
import { useTouchCanvas } from '../hooks/useTouchCanvas';
import { TEMPLATES } from '../data/templates';
import { DEFAULT_IMAGE_FILTERS } from '../types';
import type { Special, TextLayer } from '../types';

// Text presets for quick add
const TEXT_PRESETS = [
  { label: 'Heading', icon: Heading1, overrides: { text: 'HEADING', fontSize: 96, fontFamily: 'Bebas Neue', fontStyle: 'bold', fill: '#ffffff', letterSpacing: 4 } },
  { label: 'Subtitle', icon: Heading2, overrides: { text: 'Subtitle text', fontSize: 36, fontFamily: 'Montserrat', fill: '#94a3b8', letterSpacing: 2 } },
  { label: 'Price', icon: Tag, overrides: { text: '$5', fontSize: 72, fontFamily: 'Anton', fill: '#f59e0b', fontStyle: 'bold' } },
  { label: 'CTA', icon: Megaphone, overrides: { text: 'JOIN US!', fontSize: 48, fontFamily: 'Oswald', fill: '#2dd4bf', fontStyle: 'bold', letterSpacing: 3 } },
];

type RightTab = 'properties' | 'adjustments';
type MobileSheet = 'layers' | 'properties' | 'adjustments' | null;

export function SpecialEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canvasRef = useRef<CanvasHandle>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const { state, selectedLayer, canUndo, canRedo, dispatch, addTextLayer } = useEditorState();
  const { upload, uploading } = useImageUpload();
  const { data: specials, create, update } = useSupabaseCRUD<Special>('specials');
  const { containerStyle, handlers: touchHandlers, resetTransform } = useTouchCanvas();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('properties');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [zoom, setZoom] = useState<number | undefined>(undefined); // undefined = auto-fit
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

  // Load draft on mount
  useEffect(() => {
    if (hasDraft()) {
      const draft = loadDraft();
      if (draft) {
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
                toast.success('Draft restored!');
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

  const handleExport = useCallback(() => {
    dispatch({ type: 'SELECT_LAYER', id: null });
    resetTransform();
    setTimeout(() => {
      const dataUrl = canvasRef.current?.exportImage();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `iggy-special-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Image exported!');
    }, 100);
  }, [dispatch, resetTransform]);

  const handleSave = async () => {
    setSaving(true);

    dispatch({ type: 'SELECT_LAYER', id: null });
    resetTransform();
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

  const handleDuplicate = useCallback((layer: TextLayer) => {
    addTextLayer({
      ...layer,
      x: layer.x + 20,
      y: layer.y + 20,
      text: layer.text,
    });
  }, [addTextLayer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedLayerId) {
          const layer = state.layers.find(l => l.id === state.selectedLayerId);
          if (layer && !layer.locked) {
            dispatch({ type: 'REMOVE_LAYER', id: state.selectedLayerId });
          }
        }
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT_LAYER', id: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, state.selectedLayerId, state.layers]);

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col -m-6 lg:-m-8">
      {/* Desktop Toolbar — hidden on mobile (MobileToolbar handles it) */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-border shrink-0 overflow-x-auto">
        <button onClick={() => navigate('/specials')} className="btn-ghost text-xs py-1.5 px-2">
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-6 bg-border" />

        {/* Text Tools */}
        <button onClick={() => addTextLayer()} className="btn-secondary text-xs py-1.5 px-3">
          <Plus size={14} /> Text
        </button>

        {/* Text Presets dropdown */}
        <div className="relative group">
          <button className="btn-secondary text-xs py-1.5 px-3">
            <Type size={14} /> Presets
          </button>
          <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-modal p-1.5 hidden group-hover:block z-30 min-w-[140px]">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => addTextLayer(preset.overrides as Partial<TextLayer>)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover rounded-md transition-colors"
              >
                <preset.icon size={13} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Background Tools */}
        <button onClick={() => setLibraryOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
          <Image size={14} /> Library
        </button>
        <button onClick={() => bgInputRef.current?.click()} className="btn-secondary text-xs py-1.5 px-3" disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

        <div className="w-px h-6 bg-border" />

        {/* Canvas size */}
        <button
          onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1080 })}
          className={`p-1.5 rounded-lg transition-colors ${state.canvasHeight === 1080 ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title="Square (1080x1080)"
        >
          <Square size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1920 })}
          className={`p-1.5 rounded-lg transition-colors ${state.canvasHeight === 1920 ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}
          title="Story (1080x1920)"
        >
          <RectangleVertical size={16} />
        </button>

        <div className="w-px h-6 bg-border" />

        <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted disabled:opacity-30" title="Undo (Cmd+Z)">
          <Undo2 size={16} />
        </button>
        <button onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted disabled:opacity-30" title="Redo (Cmd+Shift+Z)">
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Zoom controls */}
        <button
          onClick={() => setZoom(z => Math.max(0.25, (z ?? canvasRef.current?.getScale() ?? 0.5) - 0.1))}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-text-muted w-10 text-center tabular-nums">
          {Math.round((zoom ?? canvasRef.current?.getScale() ?? 1) * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(2, (z ?? canvasRef.current?.getScale() ?? 0.5) + 0.1))}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(undefined)}
          className={`p-1.5 rounded-lg hover:bg-surface-hover transition-colors ${zoom === undefined ? 'text-primary' : 'text-text-muted'}`}
          title="Fit to Screen"
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
            className="w-7 h-7 rounded cursor-pointer border border-border"
          />
        </div>

        <div className="w-px h-6 bg-border" />

        <button onClick={handleExport} className="btn-secondary text-xs py-1.5 px-3">
          <Download size={14} /> Export
        </button>
        <button onClick={() => setSaveModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
          <Save size={14} /> Save
        </button>
      </div>

      {/* Mobile header — clean: back + title + canvas size + BG color */}
      <div className="flex md:hidden items-center gap-3 px-4 py-2.5 bg-surface border-b border-border shrink-0">
        <button onClick={() => navigate('/specials')} className="p-1.5 rounded-lg hover:bg-surface-hover">
          <ArrowLeft size={18} className="text-text-primary" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary flex-1 truncate">
          {isEdit ? 'Edit Special' : 'New Special'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1080 })}
              className={`p-1.5 rounded transition-colors ${state.canvasHeight === 1080 ? 'bg-primary text-white' : 'text-text-muted bg-surface-hover'}`}
            >
              <Square size={14} />
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_CANVAS_SIZE', width: 1080, height: 1920 })}
              className={`p-1.5 rounded transition-colors ${state.canvasHeight === 1920 ? 'bg-primary text-white' : 'text-text-muted bg-surface-hover'}`}
            >
              <RectangleVertical size={14} />
            </button>
          </div>
          <input
            type="color"
            value={state.backgroundColor}
            onChange={(e) => dispatch({ type: 'SET_BACKGROUND_COLOR', color: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-border"
          />
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Layers (desktop only) */}
        <div className="w-56 bg-surface border-r border-border p-3 overflow-y-auto hidden md:block">
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

        {/* Canvas Area — with touch gestures on mobile */}
        <div
          className="flex-1 bg-surface-active p-4 pb-24 md:pb-4 overflow-auto flex items-start justify-center"
          {...touchHandlers}
        >
          <div style={containerStyle} className="transition-transform duration-75 w-full h-full">
            <Canvas
              ref={canvasRef}
              state={state}
              onSelectLayer={(id) => dispatch({ type: 'SELECT_LAYER', id })}
              onUpdateLayer={(id, changes) => dispatch({ type: 'UPDATE_LAYER', id, changes })}
              zoomOverride={zoom}
              onLayerTapped={() => {
                // Don't auto-open properties on tap — let users drag freely.
                // Properties are auto-opened only when ADDING a new layer from presets.
              }}
            />
          </div>
        </div>

        {/* Right Panel - Properties / Adjustments (desktop only) */}
        <div className="w-72 bg-surface border-l border-border flex-col hidden lg:flex">
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
        onOpenLibrary={() => setLibraryOpen(true)}
        onUpload={() => bgInputRef.current?.click()}
        onOpenLayers={() => setMobileSheet('layers')}
        onOpenProperties={() => setMobileSheet('properties')}
        onOpenAdjustments={() => setMobileSheet('adjustments')}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onSave={() => setSaveModalOpen(true)}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
        uploading={uploading}
        hasSelection={!!selectedLayer}
        activeSheet={mobileSheet}
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
        title="Text Properties"
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

      <BottomSheet
        open={mobileSheet === 'adjustments'}
        onClose={() => setMobileSheet(null)}
        title="Image Adjustments"
      >
        <ImageAdjustments
          filters={state.imageFilters}
          hasBackground={!!state.backgroundImage}
          onUpdate={(filters) => dispatch({ type: 'SET_IMAGE_FILTERS', filters })}
          onReset={() => dispatch({ type: 'RESET_IMAGE_FILTERS' })}
        />
      </BottomSheet>

      {/* Image Library Drawer */}
      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
      />

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
              disabled={saving || !saveForm.title}
              className="btn-primary"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
