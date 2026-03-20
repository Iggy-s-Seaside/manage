import type { SpecialTemplate, TextLayer } from '../types';

type LayerDef = Omit<TextLayer, 'id'>;

const baseLayer: LayerDef = {
  text: '',
  x: 0,
  y: 0,
  width: 800,
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 400,
  fill: '#ffffff',
  fontStyle: 'normal',
  textDecoration: '',
  textTransform: 'none',
  align: 'center',
  letterSpacing: 0,
  lineHeight: 1.3,
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
};

export const TEMPLATES: SpecialTemplate[] = [
  // ── Reference-accurate Happy Hour (1080×1350, 4:5 portrait) ──
  {
    id: 'happy-hour-reference',
    name: 'Happy Hour Menu',
    category: 'drink',
    backgroundColor: '#0d0a06',
    backgroundGradient: 'linear-gradient(180deg, #1a1008 0%, #0d0a06 40%, #1a1008 70%, #0d0a06 100%)',
    canvasWidth: 1080,
    canvasHeight: 1350,
    defaultLayers: [
      // Element 1: Title
      { ...baseLayer, text: 'HAPPY HOUR', x: 0, y: 60, width: 1080, fontFamily: 'Bebas Neue', fontSize: 72, fontWeight: 400, fill: '#2dd4bf', letterSpacing: 2, lineHeight: 1.0, textTransform: 'uppercase' },
      // Element 2: Subtitle
      { ...baseLayer, text: 'MONDAY - FRIDAY | 4PM - 6PM', x: 0, y: 148, width: 1080, fontFamily: 'Montserrat', fontSize: 16, fontWeight: 400, fill: '#ffffff', letterSpacing: 3, lineHeight: 1.5, textTransform: 'uppercase', opacity: 0.9 },
      // Element 3: Drinks section divider
      { ...baseLayer, elementType: 'divider', text: 'DRINKS', dividerLabel: 'DRINKS', x: 0, y: 210, width: 1080, fontFamily: 'Montserrat', fontSize: 20, fontWeight: 600, fill: '#2dd4bf', letterSpacing: 4, dividerLineColor: '#2dd4bf', dividerLineOpacity: 0.4, dividerLineThickness: 1, dividerPadding: 40, dividerGap: 16 },
      // Element 4: Drink item 1
      { ...baseLayer, text: '$5 MARGARITAS', x: 0, y: 260, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      // Element 5: Drink item 2
      { ...baseLayer, text: '$4 DRAFT BEERS', x: 0, y: 308, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      // Element 6: Drink item 3
      { ...baseLayer, text: '$6 HOUSE WINE', x: 0, y: 356, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      // Element 7: Food section divider
      { ...baseLayer, elementType: 'divider', text: 'FOOD', dividerLabel: 'FOOD', x: 0, y: 420, width: 1080, fontFamily: 'Montserrat', fontSize: 20, fontWeight: 600, fill: '#2dd4bf', letterSpacing: 4, dividerLineColor: '#2dd4bf', dividerLineOpacity: 0.4, dividerLineThickness: 1, dividerPadding: 40, dividerGap: 16 },
      // Element 8: Food item 1
      { ...baseLayer, text: '$8 FISH TACOS', x: 0, y: 470, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      // Element 9: Food item 2
      { ...baseLayer, text: '$6 LOADED NACHOS', x: 0, y: 518, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      // Element 10: Food item 3
      { ...baseLayer, text: '$7 SLIDERS', x: 0, y: 566, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      // Element 11: Logo
      { ...baseLayer, text: 'Iggys', x: 0, y: 1250, width: 1080, fontFamily: 'Pacifico', fontSize: 52, fontWeight: 400, fill: '#ffffff', lineHeight: 1.0, textTransform: 'none' },
    ],
  },
  // ── Taco Tuesday (1080×1080, square) ──
  {
    id: 'taco-tuesday',
    name: 'Taco Tuesday',
    category: 'food',
    backgroundColor: '#0d0500',
    backgroundGradient: 'linear-gradient(180deg, #1a0a00 0%, #0d0500 50%, #1a0a00 100%)',
    canvasWidth: 1080,
    canvasHeight: 1080,
    defaultLayers: [
      { ...baseLayer, text: 'TACO TUESDAY', x: 0, y: 60, width: 1080, fontFamily: 'Bebas Neue', fontSize: 72, fontWeight: 400, fill: '#f59e0b', letterSpacing: 2, lineHeight: 1.0, textTransform: 'uppercase' },
      { ...baseLayer, text: 'ALL DAY · EVERY TUESDAY', x: 0, y: 148, width: 1080, fontFamily: 'Montserrat', fontSize: 16, fontWeight: 400, fill: '#ffffff', letterSpacing: 3, lineHeight: 1.5, textTransform: 'uppercase', opacity: 0.9 },
      { ...baseLayer, elementType: 'divider', text: 'SPECIALS', dividerLabel: 'SPECIALS', x: 0, y: 210, width: 1080, fontFamily: 'Montserrat', fontSize: 20, fontWeight: 600, fill: '#f59e0b', letterSpacing: 4, dividerLineColor: '#f59e0b', dividerLineOpacity: 0.4, dividerLineThickness: 1, dividerPadding: 40, dividerGap: 16 },
      { ...baseLayer, text: '$3 STREET TACOS', x: 0, y: 260, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$5 PREMIUM TACOS', x: 0, y: 308, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$4 MARGARITAS', x: 0, y: 356, width: 1080, fontFamily: 'Oswald', fontSize: 28, fontWeight: 500, fill: '#ffffff', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: 'Iggys', x: 0, y: 980, width: 1080, fontFamily: 'Pacifico', fontSize: 52, fontWeight: 400, fill: '#ffffff', lineHeight: 1.0, textTransform: 'none' },
    ],
  },
  // ── Weekend Brunch (1080×1350, light theme) ──
  {
    id: 'weekend-brunch',
    name: 'Weekend Brunch',
    category: 'food',
    backgroundColor: '#f5f0e8',
    backgroundGradient: 'linear-gradient(180deg, #f5f0e8 0%, #ede5d8 100%)',
    canvasWidth: 1080,
    canvasHeight: 1350,
    defaultLayers: [
      { ...baseLayer, text: 'WEEKEND BRUNCH', x: 0, y: 60, width: 1080, fontFamily: 'Playfair Display', fontSize: 56, fontWeight: 700, fill: '#1a1a1a', letterSpacing: 1, lineHeight: 1.1, textTransform: 'uppercase' },
      { ...baseLayer, text: 'SATURDAY & SUNDAY · 10AM - 2PM', x: 0, y: 135, width: 1080, fontFamily: 'Montserrat', fontSize: 14, fontWeight: 500, fill: '#666666', letterSpacing: 3, lineHeight: 1.5, textTransform: 'uppercase' },
      { ...baseLayer, elementType: 'divider', text: 'FOOD', dividerLabel: 'FOOD', x: 0, y: 195, width: 1080, fontFamily: 'Montserrat', fontSize: 18, fontWeight: 600, fill: '#0d9488', letterSpacing: 4, dividerLineColor: '#0d9488', dividerLineOpacity: 0.3, dividerLineThickness: 1, dividerPadding: 60, dividerGap: 16 },
      { ...baseLayer, text: '$14 EGGS BENEDICT', x: 0, y: 245, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$12 AVOCADO TOAST', x: 0, y: 285, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$10 FRENCH TOAST', x: 0, y: 325, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$8 FRESH FRUIT BOWL', x: 0, y: 365, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$6 PASTRY BASKET', x: 0, y: 405, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, elementType: 'divider', text: 'DRINKS', dividerLabel: 'DRINKS', x: 0, y: 465, width: 1080, fontFamily: 'Montserrat', fontSize: 18, fontWeight: 600, fill: '#0d9488', letterSpacing: 4, dividerLineColor: '#0d9488', dividerLineOpacity: 0.3, dividerLineThickness: 1, dividerPadding: 60, dividerGap: 16 },
      { ...baseLayer, text: '$9 MIMOSA FLIGHT', x: 0, y: 515, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$7 BLOODY MARY', x: 0, y: 555, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$5 FRESH JUICE', x: 0, y: 595, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: '$4 COFFEE & TEA', x: 0, y: 635, width: 1080, fontFamily: 'Raleway', fontSize: 24, fontWeight: 500, fill: '#333333', letterSpacing: 0.5, lineHeight: 1.3, textTransform: 'uppercase' },
      { ...baseLayer, text: 'Iggys', x: 0, y: 1250, width: 1080, fontFamily: 'Pacifico', fontSize: 52, fontWeight: 400, fill: '#0d9488', lineHeight: 1.0, textTransform: 'none' },
    ],
  },
  // ── Original Happy Hour (1080×1080, gradient style) ──
  {
    id: 'happy-hour',
    name: 'Happy Hour',
    category: 'drink',
    backgroundColor: '#1a0a00',
    backgroundGradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    canvasWidth: 1080,
    canvasHeight: 1080,
    defaultLayers: [
      { ...baseLayer, text: 'HAPPY', x: 140, y: 180, width: 800, fontFamily: 'Bebas Neue', fontSize: 140, fill: '#ffffff', fontStyle: 'bold', shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' },
      { ...baseLayer, text: 'HOUR', x: 140, y: 320, width: 800, fontFamily: 'Bebas Neue', fontSize: 140, fill: '#fff7ed', fontStyle: 'bold', shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' },
      { ...baseLayer, text: 'Daily 3PM - 5PM', x: 140, y: 500, width: 800, fontFamily: 'Inter', fontSize: 36, fill: '#ffffff', opacity: 0.9 },
      { ...baseLayer, text: '$5 Well Drinks  |  $3 Draft Beers', x: 140, y: 580, width: 800, fontFamily: 'Inter', fontSize: 28, fill: '#fef3c7', opacity: 0.85 },
      { ...baseLayer, text: "IGGY'S SEASIDE", x: 140, y: 900, width: 800, fontFamily: 'Lobster', fontSize: 42, fill: '#ffffff', opacity: 0.7 },
    ],
  },
  {
    id: 'dj-night',
    name: 'DJ Night',
    category: 'event',
    backgroundColor: '#0f0520',
    backgroundGradient: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
    canvasWidth: 1080,
    canvasHeight: 1080,
    defaultLayers: [
      { ...baseLayer, text: 'DJ', x: 140, y: 150, width: 800, fontFamily: 'Anton', fontSize: 180, fill: '#ffffff', fontStyle: 'bold', shadowBlur: 20, shadowColor: 'rgba(124,58,237,0.6)' },
      { ...baseLayer, text: 'NIGHT', x: 140, y: 340, width: 800, fontFamily: 'Anton', fontSize: 120, fill: '#c4b5fd', fontStyle: 'bold' },
      { ...baseLayer, text: 'Saturday 9PM', x: 140, y: 520, width: 800, fontFamily: 'Inter', fontSize: 36, fill: '#e0e7ff' },
      { ...baseLayer, text: 'Featuring DJ Name', x: 140, y: 590, width: 800, fontFamily: 'Oswald', fontSize: 32, fill: '#a5b4fc', fontStyle: 'bold' },
      { ...baseLayer, text: "IGGY'S SEASIDE", x: 140, y: 900, width: 800, fontFamily: 'Lobster', fontSize: 42, fill: '#ffffff', opacity: 0.6 },
    ],
  },
  {
    id: 'holiday',
    name: 'Holiday Special',
    category: 'seasonal',
    backgroundColor: '#1a0000',
    backgroundGradient: 'linear-gradient(135deg, #dc2626 0%, #15803d 100%)',
    canvasWidth: 1080,
    canvasHeight: 1080,
    defaultLayers: [
      { ...baseLayer, text: 'Holiday', x: 140, y: 200, width: 800, fontFamily: 'Playfair Display', fontSize: 100, fill: '#fef2f2', fontStyle: 'italic' },
      { ...baseLayer, text: 'SPECIAL', x: 140, y: 330, width: 800, fontFamily: 'Bebas Neue', fontSize: 120, fill: '#ffffff', letterSpacing: 12 },
      { ...baseLayer, text: 'Festive cocktails & seasonal bites', x: 140, y: 500, width: 800, fontFamily: 'Inter', fontSize: 30, fill: '#fecaca' },
      { ...baseLayer, text: 'December 20 - January 1', x: 140, y: 570, width: 800, fontFamily: 'Inter', fontSize: 28, fill: '#bbf7d0' },
      { ...baseLayer, text: "IGGY'S SEASIDE", x: 140, y: 900, width: 800, fontFamily: 'Lobster', fontSize: 42, fill: '#ffffff', opacity: 0.6 },
    ],
  },
  {
    id: 'drink',
    name: 'Drink Special',
    category: 'drink',
    backgroundColor: '#042f2e',
    backgroundGradient: 'linear-gradient(135deg, #2dd4bf 0%, #0891b2 100%)',
    canvasWidth: 1080,
    canvasHeight: 1080,
    defaultLayers: [
      { ...baseLayer, text: 'DRINK', x: 140, y: 200, width: 800, fontFamily: 'Oswald', fontSize: 120, fill: '#ffffff', fontStyle: 'bold' },
      { ...baseLayer, text: 'SPECIAL', x: 140, y: 330, width: 800, fontFamily: 'Oswald', fontSize: 100, fill: '#f0fdfa', fontStyle: 'bold' },
      { ...baseLayer, text: '$8', x: 140, y: 490, width: 800, fontFamily: 'Bebas Neue', fontSize: 80, fill: '#ffffff' },
      { ...baseLayer, text: 'Seaside Margarita', x: 140, y: 590, width: 800, fontFamily: 'Playfair Display', fontSize: 40, fill: '#ccfbf1', fontStyle: 'italic' },
      { ...baseLayer, text: "IGGY'S SEASIDE", x: 140, y: 900, width: 800, fontFamily: 'Lobster', fontSize: 42, fill: '#ffffff', opacity: 0.6 },
    ],
  },
  {
    id: 'food',
    name: 'Food Special',
    category: 'food',
    backgroundColor: '#1c0800',
    backgroundGradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    canvasWidth: 1080,
    canvasHeight: 1080,
    defaultLayers: [
      { ...baseLayer, text: 'FOOD', x: 140, y: 200, width: 800, fontFamily: 'Anton', fontSize: 130, fill: '#ffffff' },
      { ...baseLayer, text: 'SPECIAL', x: 140, y: 340, width: 800, fontFamily: 'Anton', fontSize: 100, fill: '#fed7aa' },
      { ...baseLayer, text: '$12', x: 140, y: 500, width: 800, fontFamily: 'Bebas Neue', fontSize: 80, fill: '#ffffff' },
      { ...baseLayer, text: 'Fish & Chips Basket', x: 140, y: 600, width: 800, fontFamily: 'Inter', fontSize: 36, fill: '#fff7ed', fontStyle: 'bold' },
      { ...baseLayer, text: "IGGY'S SEASIDE", x: 140, y: 900, width: 800, fontFamily: 'Lobster', fontSize: 42, fill: '#ffffff', opacity: 0.6 },
    ],
  },
];
