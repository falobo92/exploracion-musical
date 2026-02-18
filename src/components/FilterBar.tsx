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
  'bg-zinc-950/80 border border-zinc-800/50 text-sm rounded-xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 block w-full p-2.5 transition-all hover:border-zinc-700/60';

const ddPanel =
  'absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/40 backdrop-blur-xl scrollbar-thin';

const ddItem = (active: boolean) =>
  `w-full text-left px-3 py-2 text-sm transition-colors ${
    active
      ? 'bg-indigo-500/15 text-indigo-300 font-medium'
      : 'text-zinc-300 hover:bg-indigo-500/10 hover:text-white'
  }`;

const ddClearBtn =
  'w-full text-left px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300 border-b border-zinc-800/40 transition-colors';

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
        className={ddBtnBase + ' flex items-center justify-between gap-1 cursor-pointer'}
        aria-label={ariaLabel}
      >
        <span className={`truncate ${value ? 'text-white' : 'text-zinc-500'}`}>
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
          className={ddBtnBase + ' text-white placeholder:text-zinc-600 !rounded-r-none border-r-0'}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="bg-zinc-950/80 border border-zinc-800/50 border-l-0 rounded-r-xl px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors shrink-0"
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
          className={ddBtnBase + ' text-white placeholder:text-zinc-600 !rounded-r-none border-r-0'}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="bg-zinc-950/80 border border-zinc-800/50 border-l-0 rounded-r-xl px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors shrink-0"
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
                <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-bold text-zinc-500 bg-zinc-900/95 uppercase tracking-widest border-b border-zinc-800/30 backdrop-blur-sm flex items-center gap-1.5">
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
    'bg-zinc-950/80 border border-zinc-800/50 text-white text-sm rounded-xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 block w-full p-2.5 placeholder:text-zinc-600 transition-all hover:border-zinc-700/60';

  return (
    <section className="mb-4 bg-zinc-900/30 p-4 sm:p-5 rounded-2xl border border-zinc-800/30 backdrop-blur-sm relative z-20">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Explorar sonidos</h2>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
          {resultCount === totalCount ? `${totalCount} resultados` : `${resultCount} de ${totalCount}`}
        </span>
      </div>

      {/* Búsqueda descriptiva con IA */}
      <div className="relative mb-3">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/70 pointer-events-none">
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <input
          type="text"
          name="descriptiveQuery"
          placeholder='Búsqueda descriptiva con IA... ej: "rock sin guitarras", "canciones sobre perros", "música triste bailable"'
          value={criteria.descriptiveQuery}
          onChange={onChange}
          className={inputClass + ' pl-10 py-3 text-sm border-indigo-500/20 focus:border-indigo-500/40 focus:ring-indigo-500/30'}
        />
      </div>

      {/* Filtros clásicos — todos con dropdown custom unificado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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

      {/* Quitar filtros */}
      {(criteria.continent || criteria.country || criteria.style || criteria.year || criteria.bpm || criteria.descriptiveQuery) && (
        <div className="mt-2.5 flex justify-end">
          <button
            onClick={() => onUpdateCriteria({ continent: '', country: '', style: '', year: '', bpm: '', descriptiveQuery: '' })}
            className="px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-white bg-zinc-800/40 hover:bg-zinc-700/60 rounded-lg transition-all flex items-center gap-1.5 border border-zinc-800/30 hover:border-zinc-600/50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Quitar filtros
          </button>
        </div>
      )}

      {/* Selector de cantidad + acciones */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Cantidad de canciones */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-500 font-medium mr-1">Canciones:</span>
            {SONG_COUNT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => onUpdateCriteria({ songCount: n })}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all ${
                  criteria.songCount === n
                    ? 'bg-indigo-600/80 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 border border-zinc-800/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            {/* Búsquedas guardadas */}
            <button
              onClick={onOpenSavedSearches}
              className="px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-300 font-semibold transition-all flex items-center justify-center gap-2 text-xs border border-zinc-700/30 hover:border-zinc-600/50 relative"
            >
              <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Guardadas
              {savedSearchCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {savedSearchCount}
                </span>
              )}
            </button>

            {hasMixes && (
              <>
                {/* Exportar texto */}
                <button
                  onClick={onExport}
                  className="px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-300 font-semibold transition-all flex items-center justify-center gap-2 text-xs border border-zinc-700/30 hover:border-zinc-600/50"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Exportar
                </button>

                {/* Playlist YouTube */}
                <button
                  onClick={onSavePlaylist}
                  disabled={isSavingPlaylist}
                  className="px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-300 font-semibold transition-all flex items-center justify-center gap-2 text-xs border border-zinc-700/30 hover:border-zinc-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPlaylist ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
                      </svg>
                      Playlist
                    </>
                  )}
                </button>

                {/* Reproducir todo */}
                <button
                  onClick={onPlayAll}
                  className="px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-300 font-semibold transition-all flex items-center justify-center gap-2 text-xs border border-zinc-700/30 hover:border-zinc-600/50"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Reproducir todo
                </button>
              </>
            )}

            {/* Generar con IA */}
            <button
              onClick={onGenerate}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generar con IA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
