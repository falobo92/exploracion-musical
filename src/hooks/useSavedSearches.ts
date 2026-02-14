import { useState, useCallback } from 'react';
import type { MusicMix, SearchCriteria, SavedSearch } from '@/types';

const STORAGE_KEY = 'atlas_sonico_saved_searches';

function loadFromStorage(): SavedSearch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function persistToStorage(searches: SavedSearch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // ignore quota
  }
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(loadFromStorage);

  const save = useCallback((name: string, criteria: SearchCriteria, mixes: MusicMix[]): SavedSearch => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: name.trim() || `Búsqueda ${new Date().toLocaleDateString('es-ES')}`,
      date: new Date().toISOString(),
      criteria,
      mixes,
    };
    setSavedSearches(prev => {
      const updated = [newSearch, ...prev];
      persistToStorage(updated);
      return updated;
    });
    return newSearch;
  }, []);

  const remove = useCallback((id: string) => {
    setSavedSearches(prev => {
      const updated = prev.filter(s => s.id !== id);
      persistToStorage(updated);
      return updated;
    });
  }, []);

  const removeAll = useCallback(() => {
    setSavedSearches([]);
    persistToStorage([]);
  }, []);

  return { savedSearches, save, remove, removeAll };
}
