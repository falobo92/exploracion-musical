import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { WorldMap } from './components/WorldMap';
import { MixCard } from './components/MixCard';
import { PlayerBar } from './components/PlayerBar';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/Toast';
import { EmptyState } from './components/EmptyState';
import { SkeletonGrid } from './components/SkeletonCard';
import { ExportModal } from './components/ExportModal';
import { SavedSearchesModal } from './components/SavedSearchesModal';
import { useApiKeys } from './hooks/useApiKeys';
import { useNotifications } from './hooks/useNotifications';
import { useMixes } from './hooks/useMixes';
import { usePlayer } from './hooks/usePlayer';
import { usePlaylist } from './hooks/usePlaylist';
import { useSavedSearches } from './hooks/useSavedSearches';
import type { MusicMix, SearchCriteria } from './types';

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSavedSearchesOpen, setIsSavedSearchesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);

  // API Keys
  const apiKeys = useApiKeys();

  // Notificaciones
  const { toasts, notify, dismiss, update } = useNotifications();

  // Mixes y filtros
  const { mixes, filteredMixes, setMixes, loading, criteria, updateCriteria, handleCriteriaChange, generate } = useMixes();

  // Búsquedas guardadas
  const savedSearches = useSavedSearches();

  // Player
  const player = usePlayer({
    mixes: filteredMixes,
    googleKey: apiKeys.googleKey,
    onMixesUpdate: setMixes,
    notify,
    update,
    openSettings,
  });

  // Playlist
  const playlist = usePlaylist({
    mixes: filteredMixes,
    googleKey: apiKeys.googleKey,
    googleClientId: apiKeys.googleClientId,
    setMixes,
    notify,
    update,
    openSettings,
  });

  // Generar mixes con IA
  const handleGenerate = useCallback(() => {
    generate(apiKeys.geminiKey, {
      notify,
      update,
      openSettings,
      onReset: player.reset,
    });
  }, [apiKeys.geminiKey, generate, notify, update, openSettings, player.reset]);

  // Cargar búsqueda guardada
  const handleLoadSearch = useCallback((loadedCriteria: SearchCriteria, loadedMixes: MusicMix[]) => {
    setMixes(loadedMixes);
    updateCriteria(loadedCriteria);
    player.reset();
    notify('Búsqueda cargada', 'success', 2000);
  }, [setMixes, updateCriteria, player.reset, notify]);

  // Guardar búsqueda actual
  const handleSaveSearch = useCallback((name: string, c: SearchCriteria, m: MusicMix[]) => {
    savedSearches.save(name, c, m);
    notify('Búsqueda guardada', 'success', 2000);
  }, [savedSearches.save, notify]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col overflow-x-hidden">
      <Header onOpenSettings={openSettings} hasGemini={apiKeys.hasGemini} hasGoogle={apiKeys.hasGoogle} />

      <main className="flex-1 flex flex-col px-3 sm:px-6 py-3 sm:py-4 max-w-[1920px] mx-auto w-full">
        <FilterBar
          criteria={criteria}
          onChange={handleCriteriaChange}
          onUpdateCriteria={updateCriteria}
          onGenerate={handleGenerate}
          onPlayAll={player.handlePlayAll}
          onSavePlaylist={playlist.save}
          onExport={() => setIsExportOpen(true)}
          onOpenSavedSearches={() => setIsSavedSearchesOpen(true)}
          savedSearchCount={savedSearches.savedSearches.length}
          loading={loading}
          isSavingPlaylist={playlist.isSaving}
          resultCount={filteredMixes.length}
          totalCount={mixes.length}
          hasMixes={filteredMixes.length > 0}
        />

        {/* Contenido principal: Mapa + Lista lateral */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Mapa */}
          <div className={`transition-all duration-300 ease-out ${sidebarOpen ? 'lg:flex-1' : 'w-full'} min-w-0`}>
            <WorldMap
              mixes={filteredMixes}
              onSelect={player.handlePlayCard}
              selectedId={player.currentMix?.id}
              className={`w-full h-[42dvh] min-h-[260px] max-h-[480px] sm:h-[400px] ${sidebarOpen ? 'lg:h-[calc(100vh-320px)]' : 'lg:h-[calc(100vh-320px)]'} rounded-2xl overflow-hidden border border-zinc-800/40 shadow-2xl shadow-black/20 relative z-0`}
            />
          </div>

          {/* Toggle lista en móvil */}
          <div className="lg:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full mt-2 mb-1 rounded-xl border border-zinc-800/50 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
              aria-label={sidebarOpen ? 'Ocultar lista de canciones' : 'Mostrar lista de canciones'}
            >
              {sidebarOpen ? 'Ocultar lista de canciones' : 'Mostrar lista de canciones'}
            </button>
          </div>

          {/* Botón toggle panel lateral - solo desktop */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center justify-center w-5 h-20 self-center rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/30 hover:border-zinc-600/50 text-zinc-500 hover:text-zinc-200 transition-all shrink-0"
            aria-label={sidebarOpen ? 'Ocultar lista' : 'Mostrar lista'}
            title={sidebarOpen ? 'Ocultar lista de canciones' : 'Mostrar lista de canciones'}
          >
            <svg className={`w-3 h-3 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Panel lateral de canciones */}
          <div className={`transition-all duration-300 ease-out overflow-hidden ${
            sidebarOpen
              ? 'max-h-[2200px] opacity-100 lg:w-[45%] xl:w-[40%]'
              : 'max-h-0 opacity-0 pointer-events-none lg:w-0'
          }`}>
            <div className="lg:max-h-[calc(100vh-320px)] lg:overflow-y-auto lg:pr-1 scrollbar-thin">
              {/* Header del panel */}
              <div className="flex items-center justify-between mb-3 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm py-2 -mt-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {filteredMixes.length} canciones
                  </h3>
                </div>
                {/* Botón toggle en mobile */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {sidebarOpen ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {loading ? (
                <SkeletonGrid count={6} />
              ) : filteredMixes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                  {filteredMixes.map((mix, index) => (
                    <MixCard
                      key={mix.id}
                      mix={mix}
                      onPlay={player.handlePlayCard}
                      isPlaying={player.currentMix?.id === mix.id && player.isPlaying}
                      isCurrent={player.currentMix?.id === mix.id}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState onGenerate={handleGenerate} onOpenSettings={openSettings} hasApiKey={apiKeys.hasGemini} />
              )}
            </div>
          </div>
        </div>
      </main>

      <PlayerBar
        currentMix={player.currentMix}
        isPlaying={player.isPlaying}
        onPlayPause={() => player.setIsPlaying(!player.isPlaying)}
        onPlay={() => player.setIsPlaying(true)}
        onPause={() => player.setIsPlaying(false)}
        onNext={player.handleNext}
        onPrev={player.handlePrev}
        videoId={player.currentMix?.videoId}
        onVideoEnd={player.handleNext}
        currentIndex={player.currentIndex}
        totalTracks={filteredMixes.length}
        shuffle={player.shuffle}
        onToggleShuffle={() => player.setShuffle(!player.shuffle)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiKey={apiKeys.geminiKey}
        setGeminiKey={apiKeys.setGeminiKey}
        googleKey={apiKeys.googleKey}
        setGoogleKey={apiKeys.setGoogleKey}
        googleClientId={apiKeys.googleClientId}
        setGoogleClientId={apiKeys.setGoogleClientId}
        onClearAll={apiKeys.clearAll}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        mixes={filteredMixes}
        criteria={criteria}
      />

      <SavedSearchesModal
        isOpen={isSavedSearchesOpen}
        onClose={() => setIsSavedSearchesOpen(false)}
        savedSearches={savedSearches.savedSearches}
        onLoad={handleLoadSearch}
        onDelete={savedSearches.remove}
        onDeleteAll={savedSearches.removeAll}
        currentMixes={mixes}
        currentCriteria={criteria}
        onSave={handleSaveSearch}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
