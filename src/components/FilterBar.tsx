import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SearchCriteria } from '@/types';
import { CONTINENT_OPTIONS, DECADE_OPTIONS, BPM_RANGE_OPTIONS } from '@/constants/continents';
import { COUNTRIES_BY_CONTINENT } from '@/constants/countries';
import { SUGGESTED_STYLES } from '@/constants/styles';
import { Spinner } from './icons/Spinner';

interface FilterBarProps {
  criteria: SearchCriteria;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onUpdateCriteria: (updates: Partial<SearchCriteria>) => void;
  onGenerate: () => void;
  onPlayAll: () => void;
  onSavePlaylist: () => void;
  onExport: () => void;
  onOpenSavedSearches: () => void;
  savedSearchCount: number;
  loading: boolean;
  isSavingPlaylist: boolean;
  resultCount: number;
  totalCount: number;
  hasMixes: boolean;
}

const SONG_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30];

function buildActiveFilterChips(criteria: SearchCriteria) {
  return [
    criteria.descriptiveQuery ? { key: 'descriptiveQuery', label: `Prompt: ${criteria.descriptiveQuery}` } : null,
    criteria.continent ? { key: 'continent', label: criteria.continent } : null,
    criteria.country ? { key: 'country', label: criteria.country } : null,
    criteria.style ? { key: 'style', label: criteria.style } : null,
    criteria.year ? { key: 'year', label: criteria.year } : null,
    criteria.bpm ? { key: 'bpm', label: `${criteria.bpm} BPM` } : null,
  ].filter((item): item is { key: keyof SearchCriteria; label: string } => Boolean(item));
}

/* ─── Estilos compartidos para TODOS los dropdowns ────────────────── */

const ddBtnBase =
  'bg-zinc-900/50 border border-white/5 text-[13px] sm:text-sm rounded-xl focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 block w-full py-2 px-2.5 sm:py-2.5 sm:px-3 transition-all hover:bg-zinc-800/80 hover:border-white/10 cursor-pointer flex-1 font-medium text-zinc-300';

const ddPanel =
  'absolute top-full left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto overscroll-contain touch-pan-y bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/80 scrollbar-thin overflow-hidden';

const ddItem = (active: boolean) =>
  `w-full text-left px-3 py-2.5 text-sm transition-colors ${
    active
      ? 'bg-emerald-500/15 text-emerald-400 font-bold'
      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
  }`;

const ddClearBtn =
  'w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-b border-zinc-800 transition-colors font-semibold uppercase tracking-wider';

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

function useClickOutside(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

const DropdownSelect: React.FC<{ value: string; options: { value: string; label: string }[]; onSelect: (v: string) => void; ariaLabel: string; }> = ({ value, options, onSelect, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const label = options.find(o => o.value === value)?.label ?? '';

  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" onClick={() => setOpen(o => !o)} className={ddBtnBase + ' flex items-center justify-between gap-1'} aria-label={ariaLabel}>
        <span className={`truncate ${value ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}`}>{label}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className={ddPanel}>
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onSelect(opt.value); setOpen(false); }} className={ddItem(opt.value === value)}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchableDropdown: React.FC<{ value: string; suggestions: string[]; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSelect: (v: string) => void; placeholder: string; name: string; }> = ({ value, suggestions, onChange, onSelect, placeholder, name }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const filtered = suggestions.filter(s => !value || s.toLowerCase().includes(value.toLowerCase()));

  return (
    <div ref={ref} className="relative min-w-0">
      <div className="flex bg-zinc-900/50 rounded-xl border border-white/5 transition-all focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 hover:border-white/10">
        <input type="text" name={name} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setOpen(true)} className="bg-transparent text-sm text-emerald-400 font-semibold placeholder:text-zinc-400 placeholder:font-normal w-full py-2.5 px-3 outline-none min-w-0" autoComplete="off" />
        <button type="button" onClick={() => setOpen(o => !o)} className="px-2 text-zinc-500 hover:text-white" aria-label={`Abrir lista de ${name}`}>
          <Chevron open={open} />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className={ddPanel}>
          {value && <button onClick={() => { onSelect(''); setOpen(false); }} className={ddClearBtn}>Limpiar selección</button>}
          {filtered.map(s => (
            <button key={s} onClick={() => { onSelect(s); setOpen(false); }} className={ddItem(s === value)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const CountrySelector: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSelect: (country: string) => void; }> = ({ value, onChange, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const filterText = value.toLowerCase();

  return (
    <div ref={ref} className="relative min-w-0">
      <div className="flex bg-zinc-900/50 rounded-xl border border-white/5 transition-all focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 hover:border-white/10">
        <input type="text" name="country" placeholder="País..." value={value} onChange={onChange} onFocus={() => setOpen(true)} className="bg-transparent text-sm text-emerald-400 font-semibold placeholder:text-zinc-400 placeholder:font-normal w-full py-2.5 px-3 outline-none min-w-0" autoComplete="off" />
        <button type="button" onClick={() => setOpen(o => !o)} className="px-2 text-zinc-500 hover:text-white" aria-label="Abrir lista de países">
          <Chevron open={open} />
        </button>
      </div>
      {open && (
        <div className={ddPanel}>
          {value && <button onClick={() => { onSelect(''); setOpen(false); }} className={ddClearBtn}>Limpiar selección</button>}
          {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => {
            const f = countries.filter(c => !filterText || c.toLowerCase().includes(filterText));
            if (f.length === 0) return null;
            return (
              <div key={continent}>
                <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-bold text-zinc-400 bg-zinc-800 uppercase tracking-widest border-y border-zinc-700/50 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />{continent}
                </div>
                {f.map(country => (
                  <button key={country} onClick={() => { onSelect(country); setOpen(false); }} className={ddItem(country === value)}>{country}</button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  criteria,
  onChange,
  onUpdateCriteria,
  onGenerate,
  onPlayAll,
  onSavePlaylist,
  onExport,
  onOpenSavedSearches,
  savedSearchCount,
  loading,
  isSavingPlaylist,
  resultCount,
  totalCount,
  hasMixes,
}) => {
  const activeChips = buildActiveFilterChips(criteria);
  const hasActiveFilters = activeChips.length > 0;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(hasActiveFilters || !hasMixes);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  useEffect(() => {
    if (hasActiveFilters) {
      setIsAdvancedOpen(true);
    }
  }, [hasActiveFilters]);

  return (
    <div className="flex w-full flex-col gap-3">
      <section className="rounded-[22px] border border-white/8 bg-zinc-900 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.32)] sm:p-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
              Exploración guiada
            </p>
            <h2 className="mt-1 text-sm font-black leading-snug text-white sm:text-base">
              Define la intención y refina solo cuando haga falta
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
              Primero genera una dirección musical. Después afina continente, década, estilo o BPM para depurar la lista.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-white/8 bg-zinc-950 px-2.5 py-1.5 text-right sm:w-auto">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Visibles
            </p>
            <p className="text-lg font-black text-white">{resultCount}</p>
            <p className="text-[10px] text-zinc-500">de {totalCount}</p>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-white/8 bg-zinc-950 p-3">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Prompt principal
          </label>
          <div className="relative w-full">
            <div className="absolute left-3 top-3 text-emerald-500/80">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              name="descriptiveQuery"
              placeholder="Ej: jazz japonés nocturno, psicodelia turca 70s o electrónica africana hipnótica"
              value={criteria.descriptiveQuery}
              onChange={onChange}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 py-3 pl-10 pr-3 text-[13px] font-medium text-white placeholder-zinc-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 sm:text-sm"
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
            Usa el prompt para marcar el carácter. Los filtros avanzados sirven para recortar la selección, no para reemplazar la intención inicial.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-3 text-[13px] font-black uppercase tracking-[0.06em] text-zinc-950 transition-all hover:from-emerald-300 hover:to-teal-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:text-sm"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4 text-zinc-950" />
                Generando…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Explorar con IA
              </>
            )}
          </button>

          <button
            onClick={onPlayAll}
            disabled={!hasMixes}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-[13px] font-semibold text-white transition-all hover:border-emerald-500/30 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-12 sm:text-sm"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Reproducir selección
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
              isAdvancedOpen
                ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200'
                : 'border-white/8 bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <svg className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Filtros avanzados
          </button>

          <button
            type="button"
            onClick={() => setIsToolsOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
              isToolsOpen
                ? 'border-cyan-500/25 bg-cyan-500/12 text-cyan-200'
                : 'border-white/8 bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <svg className={`h-4 w-4 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Herramientas
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => onUpdateCriteria({ [chip.key]: '' } as Partial<SearchCriteria>)}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
              >
                <span className="max-w-[220px] truncate">{chip.label}</span>
                <span className="text-emerald-400">×</span>
              </button>
            ))}
          </div>
        )}

        {isAdvancedOpen && (
          <div className="mt-3 rounded-[20px] border border-white/8 bg-zinc-950 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Afinado de resultados
                </p>
                <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">
                  Úsalos para recortar lo visible sin perder la intención del prompt.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <DropdownSelect value={criteria.continent} options={CONTINENT_OPTIONS} onSelect={v => onUpdateCriteria({ continent: v })} ariaLabel="Continente" />
              <CountrySelector value={criteria.country} onChange={onChange} onSelect={country => onUpdateCriteria({ country })} />
              <SearchableDropdown value={criteria.style} suggestions={SUGGESTED_STYLES} onChange={onChange} onSelect={v => onUpdateCriteria({ style: v })} placeholder="Estilo..." name="style" />
              <DropdownSelect value={criteria.year} options={DECADE_OPTIONS} onSelect={v => onUpdateCriteria({ year: v })} ariaLabel="Década" />
              <DropdownSelect value={criteria.bpm} options={BPM_RANGE_OPTIONS} onSelect={v => onUpdateCriteria({ bpm: v })} ariaLabel="Rango BPM" />
              <div className="rounded-xl border border-white/6 bg-zinc-900/60 px-2.5 py-2 sm:px-3 sm:py-2.5">
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px] sm:tracking-[0.24em]">
                  Cantidad
                </label>
                <select
                  aria-label="Cantidad de pistas a generar"
                  value={criteria.songCount}
                  onChange={(e) => onUpdateCriteria({ songCount: Number(e.target.value) })}
                  className="w-full bg-transparent text-[13px] font-semibold text-emerald-300 outline-none sm:text-sm"
                >
                  {SONG_COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n} className="bg-zinc-900 text-white">
                      {n} pistas
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {isToolsOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onOpenSavedSearches}
              className="relative flex items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-zinc-900/60 px-3 py-3 text-[12px] font-medium text-zinc-200 transition-all hover:bg-zinc-800 sm:text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Guardadas
              {savedSearchCount > 0 && (
                <span className="absolute right-2 top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-black text-zinc-950">
                  {savedSearchCount}
                </span>
              )}
            </button>

            <button
              onClick={onSavePlaylist}
              disabled={!hasMixes || isSavingPlaylist}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-500/15 bg-red-500/8 px-3 py-3 text-[12px] font-medium text-red-200 transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z" />
              </svg>
              {isSavingPlaylist ? 'Creando…' : 'Playlist'}
            </button>

            <button
              onClick={onExport}
              disabled={!hasMixes}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-zinc-900/60 px-3 py-3 text-[12px] font-medium text-zinc-200 transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Exportar
            </button>

            <button
              onClick={() => onUpdateCriteria({ continent: '', country: '', style: '', year: '', bpm: '', descriptiveQuery: '' })}
              disabled={!hasActiveFilters}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-zinc-900/60 px-3 py-3 text-[12px] font-medium text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
