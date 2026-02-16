import { useState, useMemo, useCallback } from 'react';
import type { MusicMix, SearchCriteria } from '@/types';
import { DEMO_MIXES } from '@/constants/demo-mixes';
import { generateStrangeMixes } from '@/services/gemini';

const STORAGE_KEY = 'atlas_sonico_mixes';

function loadPersistedMixes(): MusicMix[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEMO_MIXES;
}

function persistMixes(mixes: MusicMix[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mixes));
  } catch {
    // ignore quota errors
  }
}

export function useMixes() {
  const [mixes, setMixesRaw] = useState<MusicMix[]>(loadPersistedMixes);
  const [loading, setLoading] = useState(false);

  const [criteria, setCriteria] = useState<SearchCriteria>({
    continent: '',
    country: '',
    style: '',
    year: '',
    bpm: '',
    descriptiveQuery: '',
    songCount: 15,
  });

  const filteredMixes = useMemo(() => {
    return mixes.filter((mix) => {
      // Continente: comparación normalizada (sin acentos)
      if (criteria.continent) {
        const norm = (s: string) =>
          s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (norm(mix.continent) !== norm(criteria.continent)) return false;
      }

      // País: búsqueda parcial normalizada
      if (criteria.country) {
        const norm = (s: string) =>
          s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (!norm(mix.country).includes(norm(criteria.country))) return false;
      }

      // Estilo: búsqueda parcial case-insensitive
      if (criteria.style) {
        if (!mix.style.toLowerCase().includes(criteria.style.toLowerCase())) return false;
      }

      // Década: ej. criteria.year = "1980s" → rango 1980-1989
      if (criteria.year) {
        const decadeMatch = criteria.year.match(/^(\d{4})/);
        if (decadeMatch) {
          const decadeStart = parseInt(decadeMatch[1], 10);
          const mixYear = parseInt(mix.year, 10);
          if (!isNaN(mixYear) && (mixYear < decadeStart || mixYear > decadeStart + 9)) return false;
        }
      }

      // BPM: rango ej. criteria.bpm = "90-120"
      if (criteria.bpm) {
        const parts = criteria.bpm.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          if (mix.bpm < parts[0] || mix.bpm > parts[1]) return false;
        }
      }

      return true;
    });
  }, [mixes, criteria]);

  const setMixes = useCallback((updater: MusicMix[] | ((prev: MusicMix[]) => MusicMix[])) => {
    setMixesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistMixes(next);
      return next;
    });
  }, []);

  /** Actualizar criterios parcialmente (para campos custom como songCount) */
  const updateCriteria = useCallback((updates: Partial<SearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...updates }));
  }, []);

  const generate = useCallback(
    async (
      geminiKey: string,
      options: {
        notify: (msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => string;
        update: (id: string, msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => void;
        openSettings: () => void;
        onReset: () => void;
      }
    ) => {
      if (!geminiKey) {
        options.notify('Falta la clave de Gemini.', 'error');
        options.openSettings();
        return;
      }

      setLoading(true);
      options.onReset();
      const desc = criteria.descriptiveQuery ? ` — "${criteria.descriptiveQuery}"` : '';
      const toastId = options.notify(`Generando ${criteria.songCount} descubrimientos musicales con IA${desc}...`, 'loading');

      try {
        const newMixes = await generateStrangeMixes(geminiKey, criteria);
        setMixes(newMixes);
        options.update(toastId, `${newMixes.length} descubrimientos generados`, 'success');
      } catch (error) {
        console.error(error);
        options.update(toastId, 'Error generando mezclas. Verifica tu clave de Gemini.', 'error');
        options.openSettings();
      } finally {
        setLoading(false);
      }
    },
    [criteria, setMixes]
  );

  const handleCriteriaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setCriteria(prev => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  return {
    mixes,
    filteredMixes,
    setMixes,
    loading,
    criteria,
    setCriteria,
    updateCriteria,
    handleCriteriaChange,
    generate,
  };
}
