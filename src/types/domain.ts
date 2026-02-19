export interface MusicMix {
  id: string;
  style: string;
  country: string;
  continent: ContinentKey;
  artist: string;
  songTitle?: string;
  year: string;
  bpm: number;
  description: string;
  searchQuery: string;
  videoId?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export type ContinentKey =
  | 'África'
  | 'Africa'
  | 'Asia'
  | 'Europa'
  | 'Europe'
  | 'América del Norte'
  | 'North America'
  | 'América del Sur'
  | 'South America'
  | 'Oceanía'
  | 'Oceania';

export interface SearchCriteria {
  continent: string;
  country: string;
  style: string;
  year: string;
  bpm: string;
  descriptiveQuery: string;
  songCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  date: string;
  criteria: SearchCriteria;
  mixes: MusicMix[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'loading';
  duration?: number;
}
