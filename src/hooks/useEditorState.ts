import { useReducer, useCallback } from 'react';
import type { EditorState, TextLayer, ImageFilters } from '../types';
import { DEFAULT_IMAGE_FILTERS } from '../types';

interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

type EditorAction =
  | { type: 'SET_BACKGROUND'; url: string | null }
  | { type: 'SET_BACKGROUND_COLOR'; color: string }
  | { type: 'SET_BACKGROUND_GRADIENT'; gradient: string | undefined }
  | { type: 'SET_IMAGE_FILTERS'; filters: Partial<ImageFilters> }
  | { type: 'RESET_IMAGE_FILTERS' }
  | { type: 'ADD_LAYER'; layer: TextLayer }
  | { type: 'UPDATE_LAYER'; id: string; changes: Partial<TextLayer> }
  | { type: 'REMOVE_LAYER'; id: string }
  | { type: 'SELECT_LAYER'; id: string | null }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; id: string }
  | { type: 'TOGGLE_LAYER_LOCK'; id: string }
  | { type: 'REORDER_LAYERS'; layers: TextLayer[] }
  | { type: 'LOAD_STATE'; state: EditorState }
  | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export type { EditorAction };

const MAX_HISTORY = 50;

function createInitialState(): EditorState {
  return {
    backgroundImage: null,
    backgroundColor: '#1a1a2e',
    imageFilters: { ...DEFAULT_IMAGE_FILTERS },
    layers: [],
    selectedLayerId: null,
    canvasWidth: 1080,
    canvasHeight: 1080,
  };
}

function editorReducer(state: HistoryState, action: EditorAction): HistoryState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }

  // SELECT_LAYER doesn't create history entries
  if (action.type === 'SELECT_LAYER') {
    return {
      ...state,
      present: { ...state.present, selectedLayerId: action.id },
    };
  }

  // All other actions push to history
  const newPresent = applyAction(state.present, action);
  return {
    past: [...state.past.slice(-MAX_HISTORY), state.present],
    present: newPresent,
    future: [],
  };
}

function applyAction(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_BACKGROUND':
      return { ...state, backgroundImage: action.url };

    case 'SET_BACKGROUND_COLOR':
      return { ...state, backgroundColor: action.color };

    case 'SET_BACKGROUND_GRADIENT':
      return { ...state, backgroundGradient: action.gradient };

    case 'SET_IMAGE_FILTERS':
      return { ...state, imageFilters: { ...state.imageFilters, ...action.filters } };

    case 'RESET_IMAGE_FILTERS':
      return { ...state, imageFilters: { ...DEFAULT_IMAGE_FILTERS } };

    case 'ADD_LAYER':
      return {
        ...state,
        layers: [...state.layers, action.layer],
        selectedLayerId: action.layer.id,
      };

    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, ...action.changes } : l
        ),
      };

    case 'REMOVE_LAYER':
      return {
        ...state,
        layers: state.layers.filter((l) => l.id !== action.id),
        selectedLayerId: state.selectedLayerId === action.id ? null : state.selectedLayerId,
      };

    case 'TOGGLE_LAYER_VISIBILITY':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, visible: !l.visible } : l
        ),
      };

    case 'TOGGLE_LAYER_LOCK':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, locked: !l.locked } : l
        ),
      };

    case 'REORDER_LAYERS':
      return { ...state, layers: action.layers };

    case 'LOAD_STATE':
      return action.state;

    case 'SET_CANVAS_SIZE':
      return { ...state, canvasWidth: action.width, canvasHeight: action.height };

    default:
      return state;
  }
}

export function useEditorState() {
  const [history, dispatch] = useReducer(editorReducer, {
    past: [],
    present: createInitialState(),
    future: [],
  });

  const state = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const selectedLayer = state.layers.find((l) => l.id === state.selectedLayerId) ?? null;

  const addTextLayer = useCallback((overrides?: Partial<TextLayer>) => {
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: 'New Text',
      x: state.canvasWidth / 2 - 150,
      y: state.canvasHeight / 2 - 30,
      width: 300,
      fontFamily: 'Inter',
      fontSize: 48,
      fill: '#ffffff',
      fontStyle: 'normal',
      textDecoration: '',
      align: 'center',
      letterSpacing: 0,
      rotation: 0,
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      stroke: '',
      strokeWidth: 0,
      opacity: 1,
      locked: false,
      visible: true,
      ...overrides,
    };
    dispatch({ type: 'ADD_LAYER', layer });
  }, [state.canvasWidth, state.canvasHeight]);

  return {
    state,
    selectedLayer,
    canUndo,
    canRedo,
    dispatch,
    addTextLayer,
  };
}
