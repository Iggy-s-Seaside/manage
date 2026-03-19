// ── Menu table types (mirrored from react-app) ──

export interface Appetizer {
  id: number;
  created_at: string;
  name: string;
  description: string | null;
  price: string;
}

export interface OnTapBeer {
  id: number;
  created_at: string;
  name: string;
  type: string;
  description: string | null;
  abv: string;
  price: string;
  brewery: string;
}

export interface OffTapBeer {
  id: number;
  created_at: string;
  name: string;
  type: string;
  price: string;
  'description ': string | null; // trailing space matches Supabase column
  abv: string | null;
}

export interface Cocktail {
  id: number;
  created_at: string;
  name: string;
  ingredients: string;
  price: string;
}

export interface Shot {
  id: number;
  created_at: string;
  name: string;
  ingredients: string;
  price: string;
}

export interface HappyHourItem {
  id: number;
  created_at: string;
  name: string;
  description: string;
  price: string;
  type: 'drink' | 'food' | 'app';
}

// ── Events & Specials ──

export interface IggyEvent {
  id: number;
  created_at: string;
  title: string;
  description: string;
  date: string;
  time: string;
  image_url: string | null;
  is_recurring: boolean;
  recurring_day: string | null;
  category: string | null;
  active: boolean;
}

export interface Special {
  id: number;
  created_at: string;
  title: string;
  description: string;
  type: 'drink' | 'food' | 'seasonal';
  price: string | null;
  image_url: string | null;
  active: boolean;
}

// ── Canvas Editor types ──

export interface ImageFilters {
  brightness: number;   // 0-200, default 100
  contrast: number;     // 0-200, default 100
  saturation: number;   // 0-200, default 100
  blur: number;         // 0-20, default 0
  overlayColor: string; // rgba color for overlay
  overlayOpacity: number; // 0-1
  preset: string | null;  // name of active preset or null
}

export const DEFAULT_IMAGE_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  overlayColor: '#000000',
  overlayOpacity: 0,
  preset: null,
};

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontStyle: string; // 'normal', 'bold', 'italic', 'bold italic'
  textDecoration: string; // '' or 'underline'
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  rotation: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
}

export interface EditorState {
  backgroundImage: string | null;
  backgroundColor: string;
  imageFilters: ImageFilters;
  layers: TextLayer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

export interface SpecialTemplate {
  id: string;
  name: string;
  category: string;
  backgroundColor: string;
  backgroundGradient?: string;
  canvasWidth: number;
  canvasHeight: number;
  defaultLayers: Omit<TextLayer, 'id'>[];
}

// ── Media Library ──

export interface MediaItem {
  name: string;
  folder: string;
  url: string;
  created_at: string | null;
  size: number;
}

// ── Draft Persistence ──

export interface DraftState {
  editorState: EditorState;
  saveForm: {
    title: string;
    description: string;
    type: 'drink' | 'food' | 'seasonal';
    price: string;
  };
  updatedAt: string;
  specialId?: number;
}

// ── Filter Presets ──

export interface FilterPreset {
  id: string;
  name: string;
  filters: Partial<ImageFilters>;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', name: 'Original', filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, overlayOpacity: 0, preset: null } },
  { id: 'moody', name: 'Moody', filters: { brightness: 80, contrast: 130, saturation: 60, blur: 0, overlayColor: '#1a1a2e', overlayOpacity: 0.2, preset: 'moody' } },
  { id: 'warm', name: 'Warm', filters: { brightness: 110, contrast: 105, saturation: 120, blur: 0, overlayColor: '#f59e0b', overlayOpacity: 0.1, preset: 'warm' } },
  { id: 'neon', name: 'Neon', filters: { brightness: 105, contrast: 140, saturation: 160, blur: 0, overlayColor: '#2dd4bf', overlayOpacity: 0.05, preset: 'neon' } },
  { id: 'vintage', name: 'Vintage', filters: { brightness: 95, contrast: 90, saturation: 50, blur: 0, overlayColor: '#92400e', overlayOpacity: 0.15, preset: 'vintage' } },
  { id: 'clean', name: 'Clean', filters: { brightness: 115, contrast: 110, saturation: 105, blur: 0, overlayOpacity: 0, preset: 'clean' } },
  { id: 'dark-overlay', name: 'Dark', filters: { brightness: 90, contrast: 110, saturation: 80, blur: 0, overlayColor: '#000000', overlayOpacity: 0.4, preset: 'dark-overlay' } },
  { id: 'dreamy', name: 'Dreamy', filters: { brightness: 110, contrast: 90, saturation: 110, blur: 1, overlayColor: '#8b5cf6', overlayOpacity: 0.08, preset: 'dreamy' } },
];

// ── Menu schema config ──

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface TableSchema {
  table: string;
  label: string;
  columns: ColumnConfig[];
}

export const EVENT_CATEGORIES = [
  'DJ Night',
  'Live Music',
  'Private Party',
  'Holiday Party',
  'Karaoke',
  'Trivia Night',
  'Themed Night',
] as const;

export const MENU_SCHEMAS: TableSchema[] = [
  {
    table: 'appetizers',
    label: 'Appetizers',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'price', label: 'Price', type: 'text', required: true },
    ],
  },
  {
    table: 'on_tap',
    label: 'On Tap',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'abv', label: 'ABV', type: 'text' },
      { key: 'price', label: 'Price', type: 'text', required: true },
      { key: 'brewery', label: 'Brewery', type: 'text', required: true },
    ],
  },
  {
    table: 'off_tap',
    label: 'Bottles & Cans',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'text', required: true },
      { key: 'description ', label: 'Description', type: 'textarea' },
      { key: 'abv', label: 'ABV', type: 'text' },
      { key: 'price', label: 'Price', type: 'text', required: true },
    ],
  },
  {
    table: 'cocktails',
    label: 'Cocktails',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea', required: true },
      { key: 'price', label: 'Price', type: 'text', required: true },
    ],
  },
  {
    table: 'shots',
    label: 'Shots',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea', required: true },
      { key: 'price', label: 'Price', type: 'text', required: true },
    ],
  },
  {
    table: 'happy_hour',
    label: 'Happy Hour',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'price', label: 'Price', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['drink', 'food', 'app'], required: true },
    ],
  },
];

export const EDITOR_FONTS = [
  'Inter',
  'Playfair Display',
  'Lobster',
  'Bebas Neue',
  'Oswald',
  'Pacifico',
  'Montserrat',
  'Raleway',
  'Poppins',
  'Anton',
] as const;

export const BRAND_COLORS = [
  '#2dd4bf', // Iggy's teal
  '#f59e0b', // Iggy's amber
  '#ffffff',
  '#000000',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#3b82f6',
  '#22c55e',
] as const;

// ── Inventory ──

export interface InventoryCategory {
  id: number;
  created_at: string;
  name: string;
  sort_order: number;
}

export interface InventoryItem {
  id: number;
  created_at: string;
  name: string;
  category_id: number | null;
  current_quantity: number;
  unit: string;
  par_level: number;
  cost_per_unit: number | null;
  supplier: string | null;
  notes: string | null;
  active: boolean;
  // Joined field
  inventory_categories?: { name: string } | null;
}

export interface InventoryLog {
  id: number;
  created_at: string;
  item_id: number;
  user_email: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  reason: string | null;
}

export const INVENTORY_UNITS = ['units', 'bottles', 'cases', 'lbs', 'oz', 'kegs', 'bags', 'cans'] as const;
export const LOG_REASONS = ['restock', 'usage', 'waste', 'count_adjustment'] as const;
