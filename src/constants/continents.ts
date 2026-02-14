import type { ContinentKey } from '@/types';

export interface ContinentStyle {
  label: string;
  bg: string;
  border: string;
  glyph: string;
  textClass: string;
  markerColor: string;
}

const BASE_CONTINENTS: Record<string, ContinentStyle> = {
  África: {
    label: 'África',
    bg: '#f59e0b',
    border: '#d97706',
    glyph: '#ffffff',
    textClass: 'text-amber-400',
    markerColor: '#f59e0b',
  },
  Asia: {
    label: 'Asia',
    bg: '#ef4444',
    border: '#dc2626',
    glyph: '#ffffff',
    textClass: 'text-red-400',
    markerColor: '#ef4444',
  },
  Europa: {
    label: 'Europa',
    bg: '#6366f1',
    border: '#4f46e5',
    glyph: '#ffffff',
    textClass: 'text-indigo-400',
    markerColor: '#6366f1',
  },
  'América del Norte': {
    label: 'América del Norte',
    bg: '#0ea5e9',
    border: '#0284c7',
    glyph: '#ffffff',
    textClass: 'text-cyan-400',
    markerColor: '#0ea5e9',
  },
  'América del Sur': {
    label: 'América del Sur',
    bg: '#10b981',
    border: '#059669',
    glyph: '#ffffff',
    textClass: 'text-emerald-400',
    markerColor: '#10b981',
  },
  Oceanía: {
    label: 'Oceanía',
    bg: '#ec4899',
    border: '#db2777',
    glyph: '#ffffff',
    textClass: 'text-pink-400',
    markerColor: '#ec4899',
  },
};

// Alias en inglés apuntando al mismo estilo
const ALIASES: Record<string, string> = {
  Africa: 'África',
  Europe: 'Europa',
  'North America': 'América del Norte',
  'South America': 'América del Sur',
  Oceania: 'Oceanía',
};

const DEFAULT_STYLE: ContinentStyle = {
  label: 'Desconocido',
  bg: '#8b5cf6',
  border: '#7c3aed',
  glyph: '#ffffff',
  textClass: 'text-violet-400',
  markerColor: '#8b5cf6',
};

export function getContinentStyle(continent: ContinentKey | string): ContinentStyle {
  const resolved = ALIASES[continent] || continent;
  return BASE_CONTINENTS[resolved] || DEFAULT_STYLE;
}

export const CONTINENT_OPTIONS = [
  { value: '', label: 'Cualquier continente' },
  { value: 'Africa', label: 'África' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Europe', label: 'Europa' },
  { value: 'North America', label: 'América del Norte' },
  { value: 'South America', label: 'América del Sur' },
  { value: 'Oceania', label: 'Oceanía' },
];
