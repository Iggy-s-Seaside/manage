# Manager App Editor — Handoff Context

## Quick Start
- **Source**: `/Users/bradleybird/code_projects/Iggys2/Iggy-s-bar-seaside/manager-app/`
- **Dev server**: `npm run dev` (port 5174)
- **Dev URL**: https://dev--iggysmanagement.netlify.app
- **Prod URL**: https://iggysmanagement.netlify.app
- **Branch workflow**: Push to `dev` for testing, merge to `main` for production
- **Stack**: Vite + React 18 + TypeScript + Tailwind CSS v3

## What This App Is
A mobile-first **specials/poster editor** for Iggy's Seaside Bar. Staff create promotional images (cocktail specials, events) by compositing text layers, image layers, dividers, and background photos on a canvas. Think Canva/Instagram Stories but tailored for bar specials.

## Architecture

### Canvas System (DOM-based, not HTML Canvas)
- **DomCanvas.tsx** — Viewport with auto-fit scaling. Canvas is always centered and locked (no pan/zoom on mobile). Desktop allows wheel zoom.
- **Layers are positioned divs** with CSS transforms (`translate3d` + `rotate`). During drag/resize, direct DOM manipulation via `requestAnimationFrame` for 60fps. React state committed only on `pointerup`.
- **SelectionOverlay.tsx** — Teal selection box with 4 corner resize handles + rotation handle. Syncs position with element during drag via `syncSelectionOverlay()`.
- **Export**: `exportToCanvas.ts` renders to an offscreen `<canvas>` element for PNG/JPEG export.

### Layer Types (polymorphic `TextLayer`)
All layers share the `TextLayer` type with an `elementType` discriminator:
- `'text'` (default) — Styled text with font, color, shadow, stroke, alignment
- `'divider'` — Horizontal line with centered label (e.g., "DRINKS")
- `'image'` — Photo layer with blend modes, per-layer filters, opacity

Image-specific fields: `imageSrc`, `imageHeight`, `imageFilters`, `imageFit`, `blendMode`

### Mobile UI Pattern
- **MobileToolbar** — Fixed bottom bar: Add, Layers, Font/Blend, Edit, Save, More
- **Floating overlays** (z-65): MobileFontPicker, MobileBlendPicker, MobileFilterBar — compact bars that overlay the canvas so you see changes live
- **Bottom sheets** (z-50): Layers, Properties, Templates — full panels that slide up
- **Mutual exclusion**: `closeAllOverlays()` ensures only one overlay/sheet is open at a time. Every toolbar button calls it before opening its own UI.

### State Management
- `useEditorState.ts` — useReducer with undo/redo history (past/present/future pattern)
- `useDraftPersistence.ts` — Auto-saves to localStorage, prompts restore on return
- `useElementInteraction.ts` — All drag/move/resize/rotate logic with direct DOM manipulation
- `useCanvasGestures.ts` — Canvas viewport gestures (disabled on mobile, wheel zoom on desktop)

### Key Design Tokens
- Background: #0a0f0f, Surface: #111827
- Primary: #2dd4bf (teal), Accent: #f59e0b (amber)
- Glassmorphism: `bg-surface/95 backdrop-blur-xl border border-border/20`
- iOS spring animations: `cubic-bezier(0.32, 0.72, 0, 1)`

## What's Been Built (Complete)
1. **Text layers** — Full typography controls (font, size, B/I/U, alignment, color, shadow, stroke, letter spacing, line height)
2. **Divider layers** — Horizontal lines with configurable label, color, thickness, opacity, gap, padding
3. **Image layers** — Upload photos as layers with per-layer filters (brightness, contrast, saturation, blur) and color overlay
4. **Blend modes** — 13 CSS blend modes (screen, multiply, overlay, soft-light, etc.) via MobileBlendPicker floating overlay
5. **Background system** — Upload or pick from Supabase library, with global filters (MobileFilterBar) and gradient support
6. **Canvas controls** — Size presets (1:1, 4:5, 9:16, 16:9), background color picker, auto-fit scaling
7. **Selection handles** — Proportional resize from all 4 corners using diagonal projection math, rotation with 45° snapping
8. **Layer management** — Reorder, duplicate, delete, lock, toggle visibility
9. **Templates** — Built-in and user-saved templates
10. **Export** — PNG/JPEG with quality control, renders all layer types including blend modes
11. **Save** — Upload to Supabase as a "special" with title/description/type/price
12. **Draft persistence** — Auto-save/restore with StrictMode double-fire guard
13. **Overlay mutual exclusion** — Only one overlay/sheet open at a time

## What Needs Work (Priority Order)

### P0 — User-reported issues
- **Image resize handles UX** — User said handles feel unintuitive. The diagonal projection math was fixed (removed `projection * dirX` double-counting), but real-device touch testing is needed. Handles may need larger touch targets or visual feedback.
- **Responsive layout** — User reported "a lot of issues of the spirit of the design and placement going all over the place when changing to different views." The editor is mobile-first but desktop layout (side panels) may need polish.

### P1 — Feature gaps
- **Enlight-style compositing workflow** — User wants double-exposure effects. Blend modes exist but the UX flow could be more guided (e.g., "tap to blend two photos" wizard)
- **Image crop** — No way to crop image layers. Users can only use Fit (cover/contain/fill).
- **Pinch-to-resize on elements** — Users expect Instagram-style two-finger resize on elements. Currently only corner handles work.
- **Undo/Redo discoverability** — Buried in More menu. Could add shake-to-undo or visible buttons.
- **Filter presets for image layers** — Background has presets (Moody, Vintage, etc.) but image layers only have manual sliders.

### P2 — Polish
- **PropertyPanel for dividers** — Some controls (B/I/U, alignment, line height, stroke) show for dividers but likely don't do anything. Should be hidden.
- **Position slider max values** — Hardcoded to 1080/1920 instead of using actual canvas dimensions.
- **Layer reorder by drag** — Currently uses up/down arrows. Drag reorder would be more intuitive.
- **Image source swap** — No way to change an image layer's source photo after adding it.

## File Map (Key Files)

### Editor Core
- `src/pages/SpecialEditor.tsx` — Main editor page, wires everything together
- `src/hooks/useEditorState.ts` — State management with undo/redo
- `src/hooks/useElementInteraction.ts` — Drag/move/resize/rotate logic
- `src/hooks/useCanvasGestures.ts` — Canvas viewport gestures
- `src/types/index.ts` — All type definitions (TextLayer, ImageFilters, etc.)

### Canvas & Rendering
- `src/components/editor/DomCanvas.tsx` — Canvas viewport and layer rendering
- `src/components/editor/SelectionOverlay.tsx` — Selection handles
- `src/components/editor/ImageElement.tsx` — Image layer renderer
- `src/components/editor/exportToCanvas.ts` — PNG/JPEG export

### Mobile UI
- `src/components/editor/MobileToolbar.tsx` — Bottom toolbar with Add/More popovers
- `src/components/editor/MobileFontPicker.tsx` — Floating font selector overlay
- `src/components/editor/MobileBlendPicker.tsx` — Floating blend mode overlay
- `src/components/editor/MobileFilterBar.tsx` — Floating background filter overlay
- `src/components/editor/PropertyPanel.tsx` — Full property editor (in bottom sheet)
- `src/components/editor/LayerPanel.tsx` — Layer list with controls

### Data & Backend
- `src/hooks/useSupabaseCRUD.ts` — Generic Supabase table CRUD
- `src/hooks/useImageUpload.ts` — Upload to Supabase storage
- `src/hooks/useDraftPersistence.ts` — localStorage draft save/restore
- `src/data/templates.ts` — Built-in template definitions

## Recent Git History
```
7b7c402 Fix divider centering and overlay stacking conflicts
2e2d54e Code cleanup: fix resize direction bug, remove dead code, fix stale closures
40399d7 Add floating blend mode overlay for image layers
fd98b81 Fix canvas displacement during resize and constrain elements to canvas bounds
dd579c7 Add image layer support with per-layer filters and export
4f5401d Redesign font picker as compact horizontal bar with smart positioning
8861b01 Fix resize handles, selection overlay sync, and floating font picker
f287476 Add proportional resize and floating filter bar for real-time preview
```

## How to Test
1. `cd /Users/bradleybird/code_projects/Iggys2/Iggy-s-bar-seaside/manager-app`
2. `npm run dev` → opens on port 5174
3. Navigate to `/specials/editor`
4. Push to `dev` branch → auto-deploys to https://dev--iggysmanagement.netlify.app
5. Test on phone at that URL
6. When ready for prod: `git checkout main && git merge dev && git push origin main`
