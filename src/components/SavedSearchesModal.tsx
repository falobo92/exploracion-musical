import React, { useState } from 'react';
import type { MusicMix, SearchCriteria, SavedSearch } from '@/types';

interface SavedSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSearches: SavedSearch[];
  onLoad: (criteria: SearchCriteria, mixes: MusicMix[]) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  /** Para guardar la búsqueda actual */
  currentMixes: MusicMix[];
  currentCriteria: SearchCriteria;
  onSave: (name: string, criteria: SearchCriteria, mixes: MusicMix[]) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildDefaultName(criteria: SearchCriteria): string {
  const parts: string[] = [];
  if (criteria.descriptiveQuery) parts.push(criteria.descriptiveQuery.slice(0, 40));
  if (criteria.style) parts.push(criteria.style);
  if (criteria.country) parts.push(criteria.country);
  if (criteria.continent) parts.push(criteria.continent);
  if (parts.length === 0) parts.push('Exploración');
  const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${parts.join(' · ')} — ${date}`;
}

export const SavedSearchesModal: React.FC<SavedSearchesModalProps> = ({
  isOpen,
  onClose,
  savedSearches,
  onLoad,
  onDelete,
  onDeleteAll,
  currentMixes,
  currentCriteria,
  onSave,
}) => {
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const name = saveName.trim() || buildDefaultName(currentCriteria);
    onSave(name, currentCriteria, currentMixes);
    setSaveName('');
    setShowSaveInput(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleLoad = (search: SavedSearch) => {
    onLoad(search.criteria, search.mixes);
    onClose();
  };

  const handleDeleteAll = () => {
    if (confirmDeleteAll) {
      onDeleteAll();
      setConfirmDeleteAll(false);
    } else {
      setConfirmDeleteAll(true);
      setTimeout(() => setConfirmDeleteAll(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Búsquedas guardadas</h2>
              <p className="text-[11px] text-zinc-500">{savedSearches.length} búsqueda{savedSearches.length !== 1 ? 's' : ''} almacenada{savedSearches.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Guardar búsqueda actual */}
        {currentMixes.length > 0 && (
          <div className="px-5 py-3 border-b border-zinc-800/30 bg-zinc-800/20">
            {!showSaveInput ? (
              <button
                onClick={() => { setShowSaveInput(true); setSaveName(buildDefaultName(currentCriteria)); }}
                disabled={justSaved}
                className={`w-full py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  justSaved
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/15'
                }`}
              >
                {justSaved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Guardado!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Guardar búsqueda actual ({currentMixes.length} canciones)
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Nombre de la búsqueda..."
                  autoFocus
                  className="flex-1 bg-zinc-950/80 border border-zinc-700/50 text-white text-xs rounded-xl px-3 py-2 placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                />
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setShowSaveInput(false)}
                  className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/60 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lista de búsquedas guardadas */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3">
          {savedSearches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-500 mb-1">No hay búsquedas guardadas</p>
              <p className="text-xs text-zinc-600">Genera canciones y guárdalas para acceder después</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedSearches.map(search => {
                const desc = search.criteria.descriptiveQuery;
                const tags: string[] = [];
                if (search.criteria.continent) tags.push(search.criteria.continent);
                if (search.criteria.country) tags.push(search.criteria.country);
                if (search.criteria.style) tags.push(search.criteria.style);

                return (
                  <div
                    key={search.id}
                    className="group bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-800/40 hover:border-zinc-700/50 rounded-xl p-3 transition-all cursor-pointer"
                    onClick={() => handleLoad(search)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">
                          {search.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-500 font-mono">{formatDate(search.date)}</span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-[10px] text-indigo-400/70 font-medium">{search.mixes.length} canciones</span>
                        </div>
                        {desc && (
                          <p className="text-[11px] text-zinc-500 mt-1 truncate italic">"{desc}"</p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {tags.map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-700/40 text-zinc-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(search.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Eliminar búsqueda"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {savedSearches.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/50 shrink-0">
            <button
              onClick={handleDeleteAll}
              className={`text-[11px] font-medium transition-colors ${
                confirmDeleteAll
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {confirmDeleteAll ? '¿Confirmar eliminar todas?' : 'Eliminar todas'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/60 rounded-xl transition-all border border-zinc-700/30"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
