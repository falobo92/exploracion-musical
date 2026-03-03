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
  'bg-zinc-900/50 border border-white/5 text-sm rounded-xl focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 block w-full py-2.5 px-3 transition-all hover:bg-zinc-800/80 hover:border-white/10 cursor-pointer flex-1 font-medium text-zinc-300';

const ddPanel =
  'absolute top-full left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/80 scrollbar-thin overflow-hidden';

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

export const FilterBar: React.FC<FilterBarProps> = ({ criteria, onChange, onUpdateCriteria, onGenerate, onPlayAll, onSavePlaylist, onExport, onOpenSavedSearches, savedSearchCount, loading, isSavingPlaylist, hasMixes }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search Input & Generate Button */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/80">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            name="descriptiveQuery"
            placeholder="¿Qué quieres escuchar? (ej: Jazz japonés 70s)"
            value={criteria.descriptiveQuery}
            onChange={onChange}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-700/60 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
          />
        </div>
        
        <button
          onClick={onGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed tracking-wide uppercase"
        >
          {loading ? (
            <><Spinner className="w-4 h-4 text-zinc-950" /> Creando Mix...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Explorar con IA</>
          )}
        </button>
      </div>

      {/* Grid of Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <DropdownSelect value={criteria.continent} options={CONTINENT_OPTIONS} onSelect={v => onUpdateCriteria({ continent: v })} ariaLabel="Continente" />
        <CountrySelector value={criteria.country} onChange={onChange} onSelect={country => onUpdateCriteria({ country })} />
        <SearchableDropdown value={criteria.style} suggestions={SUGGESTED_STYLES} onChange={onChange} onSelect={v => onUpdateCriteria({ style: v })} placeholder="Estilo..." name="style" />
        <DropdownSelect value={criteria.year} options={DECADE_OPTIONS} onSelect={v => onUpdateCriteria({ year: v })} ariaLabel="Década" />
      </div>

      {/* Bottom Tools Row */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-1">Cant:</span>
          <select 
            value={criteria.songCount} 
            onChange={(e) => onUpdateCriteria({ songCount: Number(e.target.value) })}
            className="bg-zinc-800 text-emerald-400 text-xs font-bold py-1 px-2 rounded-lg border border-zinc-700 outline-none cursor-pointer"
          >
            {SONG_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Searches */}
          <button onClick={onOpenSavedSearches} className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700/50 relative">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            {savedSearchCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-zinc-950 text-[9px] font-extrabold flex items-center justify-center">{savedSearchCount}</span>
            )}
          </button>

          {hasMixes && (
            <>
              {/* Play All */}
              <button onClick={onPlayAll} className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors border border-emerald-500/30">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
              
              {/* YouTube */}
              <button onClick={onSavePlaylist} disabled={isSavingPlaylist} className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-red-400 transition-colors border border-zinc-700/50">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
              </button>

              {/* Export */}
              <button onClick={onExport} className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 transition-colors border border-zinc-700/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </button>
            </>
          )}

          {/* Clear Filters */}
          {(criteria.continent || criteria.country || criteria.style || criteria.year || criteria.bpm || criteria.descriptiveQuery) && (
            <button onClick={() => onUpdateCriteria({ continent: '', country: '', style: '', year: '', bpm: '', descriptiveQuery: '' })} className="p-2 rounded-lg bg-zinc-800/50 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors border border-zinc-700/50" title="Quitar filtros">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
