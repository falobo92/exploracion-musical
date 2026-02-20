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

/* ─── Estilos compartidos para TODOS los dropdowns ────────────────── */

const ddBtnBase =
  'bg-white/5 backdrop-blur-md border border-white/10 text-[15px] rounded-full focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/50 block w-full py-3 px-4 transition-all hover:bg-white/10 hover:border-white/20 shadow-inner shadow-white/5 cursor-pointer';

const ddPanel =
  'absolute top-full left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto bg-zinc-950/80 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-2xl scrollbar-thin overflow-hidden';

const ddItem = (active: boolean) =>
  `w-full text-left px-4 py-3 text-[15px] transition-colors ${
    active
      ? 'bg-indigo-500/15 text-indigo-300 font-medium'
      : 'text-zinc-300 hover:bg-indigo-500/10 hover:text-white'
  }`;

const ddClearBtn =
  'w-full text-left px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border-b border-zinc-800/40 transition-colors';

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

/* ─── Hook: cerrar al hacer clic fuera ────────────────────────────── */

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

/* ─── DropdownSelect: continente, década, BPM ─────────────────────── */

const DropdownSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  ariaLabel: string;
}> = ({ value, options, onSelect, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const label = options.find(o => o.value === value)?.label ?? '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={ddBtnBase + ' flex items-center justify-between gap-1'}
        aria-label={ariaLabel}
      >
        <span className={`truncate ${value ? 'text-white' : 'text-zinc-400'}`}>
          {label}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className={ddPanel}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
              className={ddItem(opt.value === value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── SearchableDropdown: estilo musical ──────────────────────────── */

const SearchableDropdown: React.FC<{
  value: string;
  suggestions: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect: (v: string) => void;
  placeholder: string;
  name: string;
}> = ({ value, suggestions, onChange, onSelect, placeholder, name }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const filterText = value.toLowerCase();
  const filtered = suggestions.filter(
    s => !filterText || s.toLowerCase().includes(filterText),
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex">
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setOpen(true)}
          className={ddBtnBase + ' text-white placeholder:text-zinc-400 !rounded-r-none border-r-0'}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="bg-white/5 border border-white/10 border-l-0 rounded-r-full px-4 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label={`Abrir lista de ${name}`}
        >
          <Chevron open={open} />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className={ddPanel}>
          {value && (
            <button
              onClick={() => { onSelect(''); setOpen(false); }}
              className={ddClearBtn}
            >
              Limpiar selección
            </button>
          )}
          {filtered.map(s => (
            <button
              key={s}
              onClick={() => { onSelect(s); setOpen(false); }}
              className={ddItem(s === value)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── CountrySelector: dropdown agrupado por continente ───────────── */

const CountrySelector: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect: (country: string) => void;
}> = ({ value, onChange, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const filterText = value.toLowerCase();

  return (
    <div ref={ref} className="relative">
      <div className="flex">
        <input
          type="text"
          name="country"
          placeholder="País..."
          value={value}
          onChange={onChange}
          onFocus={() => setOpen(true)}
          className={ddBtnBase + ' text-white placeholder:text-zinc-400 !rounded-r-none border-r-0'}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="bg-white/5 border border-white/10 border-l-0 rounded-r-full px-4 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Abrir lista de países"
        >
          <Chevron open={open} />
        </button>
      </div>

      {open && (
        <div className={ddPanel}>
          {value && (
            <button
              onClick={() => { onSelect(''); setOpen(false); }}
              className={ddClearBtn}
            >
              Limpiar selección
            </button>
          )}

          {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => {
            const filtered = countries.filter(
              c => !filterText || c.toLowerCase().includes(filterText),
            );
            if (filtered.length === 0) return null;
            return (
              <div key={continent}>
                <div className="sticky top-0 z-10 px-4 py-2 text-xs font-bold text-zinc-400 bg-zinc-900/95 uppercase tracking-widest border-b border-zinc-800/30 backdrop-blur-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                  {continent}
                </div>
                {filtered.map(country => (
                  <button
                    key={country}
                    onClick={() => { onSelect(country); setOpen(false); }}
                    className={ddItem(country === value)}
                  >
                    {country}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  FilterBar principal                                              */
/* ═══════════════════════════════════════════════════════════════════ */

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
  const inputClass =
    'bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-full focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 block w-full transition-all hover:bg-white/10 hover:border-white/20 shadow-inner shadow-white/5';

  return (
    <section className="glass-panel p-3 sm:p-4 rounded-2xl relative z-20 overflow-visible shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none rounded-2xl" />
      <div className="relative z-10 flex flex-col gap-3">
        
        {/* Top Row: Title & AI Search */}
        <div className="flex flex-col lg:flex-row gap-3 items-center z-20">
          <div className="flex items-center justify-between w-full lg:w-auto min-w-max">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <h2 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 uppercase tracking-widest whitespace-nowrap">Explorar sonidos</h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono tabular-nums lg:hidden">
              {resultCount === totalCount ? `${totalCount} resultados` : `${totalCount} de ${totalCount}`}
            </span>
          </div>

          <div className="relative flex-1 w-full flex items-center">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400/70 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <input
              type="text"
              name="descriptiveQuery"
              placeholder='Búsqueda descriptiva con IA... ej: "rock sin guitarras"'
              value={criteria.descriptiveQuery}
              onChange={onChange}
              className={inputClass + ' pl-10 py-2.5 text-sm placeholder-zinc-400/70 border-indigo-500/30 focus:border-indigo-500/60 focus:bg-indigo-500/10'}
            />
          </div>
          
          <button
            onClick={onGenerate}
            disabled={loading}
            className="hidden lg:flex px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 hover:bg-right hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all duration-500 bg-[length:200%_auto] items-center justify-center gap-2 text-sm glow-button disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-max"
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4" />
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generar con IA
              </>
            )}
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center z-10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1 relative min-w-0">
            <DropdownSelect
              value={criteria.continent}
              options={CONTINENT_OPTIONS}
              onSelect={v => onUpdateCriteria({ continent: v })}
              ariaLabel="Seleccionar continente"
            />
            <CountrySelector
              value={criteria.country}
              onChange={onChange}
              onSelect={country => onUpdateCriteria({ country })}
            />
            <SearchableDropdown
              value={criteria.style}
              suggestions={SUGGESTED_STYLES}
              onChange={onChange}
              onSelect={v => onUpdateCriteria({ style: v })}
              placeholder="Estilo..."
              name="style"
            />
            <DropdownSelect
              value={criteria.year}
              options={DECADE_OPTIONS}
              onSelect={v => onUpdateCriteria({ year: v })}
              ariaLabel="Seleccionar década"
            />
            <DropdownSelect
              value={criteria.bpm}
              options={BPM_RANGE_OPTIONS}
              onSelect={v => onUpdateCriteria({ bpm: v })}
              ariaLabel="Seleccionar rango de BPM"
            />
          </div>
          
          {/* Clear Filters Button */}
          {(criteria.continent || criteria.country || criteria.style || criteria.year || criteria.bpm || criteria.descriptiveQuery) && (
            <button
              onClick={() => onUpdateCriteria({ continent: '', country: '', style: '', year: '', bpm: '', descriptiveQuery: '' })}
              className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-700/60 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-zinc-800/30 w-full sm:w-auto"
              title="Quitar filtros"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Quitar
            </button>
          )}
        </div>

        {/* Bottom Row: Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 relative z-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider mr-1">Canciones:</span>
            {SONG_COUNT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => onUpdateCriteria({ songCount: n })}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  criteria.songCount === n
                    ? 'bg-indigo-600/80 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 border border-zinc-800/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="hidden lg:inline text-[11px] uppercase tracking-wider text-zinc-500 font-mono tabular-nums mr-2">
              {resultCount === totalCount ? `${totalCount} resultados` : `${resultCount} de ${totalCount}`}
            </span>
            
            {/* Búsquedas guardadas */}
            <button
              onClick={onOpenSavedSearches}
              className="px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-200 font-semibold transition-all flex items-center justify-center gap-1.5 text-xs border border-zinc-700/30 hover:border-zinc-600/50 relative"
            >
              <svg className="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Guardadas
              {savedSearchCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {savedSearchCount}
                </span>
              )}
            </button>

            {hasMixes && (
              <>
                {/* Exportar */}
                <button
                  onClick={onExport}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-200 font-semibold transition-all flex items-center justify-center gap-1.5 text-xs border border-zinc-700/30 hover:border-zinc-600/50"
                >
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Exportar
                </button>

                {/* Playlist YouTube */}
                <button
                  onClick={onSavePlaylist}
                  disabled={isSavingPlaylist}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-200 font-semibold transition-all flex items-center justify-center gap-1.5 text-xs border border-zinc-700/30 hover:border-zinc-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPlaylist ? (
                    <>
                      <Spinner className="w-3 h-3" />
                      Guardando
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
                      </svg>
                      Playlist
                    </>
                  )}
                </button>

                {/* Reproducir todo */}
                <button
                  onClick={onPlayAll}
                  className="px-4 py-1.5 rounded-full bg-zinc-800/50 hover:bg-indigo-500/20 text-zinc-100 font-bold transition-all flex items-center justify-center gap-1.5 text-xs border border-zinc-700/30 hover:border-indigo-500/50 hover:text-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Reproducir todo
                </button>
              </>
            )}

            {/* Generar con IA (Mobile only) */}
            <button
              onClick={onGenerate}
              disabled={loading}
              className="lg:hidden px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 text-white font-bold text-xs glow-button disabled:opacity-50 disabled:cursor-not-allowed w-full flex justify-center mt-2"
            >
              {loading ? 'Generando...' : 'Generar con IA (AI)'}
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
