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
  const [selectedMapMixId, setSelectedMapMixId] = useState<string | undefined>();
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
    googleClientId: apiKeys.googleClientId,
    onMixesUpdate: setMixes,
    notify,
    update,
    openSettings,
  });

  // Playlist
  const playlist = usePlaylist({
    mixes: filteredMixes,
    googleClientId: apiKeys.googleClientId,
    setMixes,
    notify,
    update,
    openSettings,
  });

  const currentMixCardId = player.currentMix?.id ? `mix-card-${player.currentMix.id}` : null;

  const handleMapSelect = useCallback((mix: MusicMix) => {
    setSelectedMapMixId(mix.id);
  }, []);

  const scrollToCurrent = useCallback(() => {
    if (!currentMixCardId) return;
    const card = document.getElementById(currentMixCardId);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentMixCardId]);

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
    <div className="fixed inset-0 bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Background Map Layer */}
      <WorldMap
        mixes={filteredMixes}
        onSelect={handleMapSelect}
        onPlay={player.handlePlayCard}
        selectedId={selectedMapMixId}
        playingId={player.currentMix?.id}
        className="map-container-wrapper"
      />

      {/* Foreground UI Layer (pointer-events-none so map can be interacted with) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Top Area: Header + FilterBar */}
        <div className="pointer-events-none pt-4 px-4 sm:px-6 max-w-[1920px] mx-auto w-full flex flex-col gap-4 z-20">
          <div className="pointer-events-auto">
            <Header onOpenSettings={openSettings} hasGemini={apiKeys.hasGemini} hasYoutubeKey={apiKeys.hasYoutubeKey} />
          </div>
          <div className="pointer-events-auto">
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
          </div>
        </div>

        {/* Main Area: Mix List floating on the right */}
        <main className="flex-1 flex flex-col pointer-events-none p-4 sm:p-6 pb-32 max-w-[1920px] mx-auto w-full min-h-0 items-end justify-start">
            <div className="pointer-events-auto w-full lg:w-[400px] xl:w-[440px] flex flex-col glass-panel rounded-[2rem] overflow-hidden max-h-full shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
              {/* Header del panel */}
              <div className="relative flex items-center justify-between p-5 pb-4 border-b border-white/5 bg-zinc-950/30 backdrop-blur-xl z-10">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 uppercase tracking-widest">
                    {filteredMixes.length} canciones
                  </h3>
                </div>
                {player.currentMix && (
                  <button
                    onClick={scrollToCurrent}
                    className="text-[10px] uppercase font-bold tracking-wider rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)] hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    title="Ir a la canción sonando"
                  >
                    Sonando ahora
                  </button>
                )}
              </div>

              {/* Lista scrollable */}
              <div className="relative flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin z-10">
                {loading ? (
                  <SkeletonGrid count={6} />
                ) : filteredMixes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredMixes.map((mix, index) => (
                      <div key={mix.id} id={`mix-card-${mix.id}`}>
                        <MixCard
                          mix={mix}
                          onPlay={player.handlePlayCard}
                          isPlaying={player.currentMix?.id === mix.id && player.isPlaying}
                          isCurrent={player.currentMix?.id === mix.id}
                          index={index}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState onGenerate={handleGenerate} onOpenSettings={openSettings} hasApiKey={apiKeys.hasGemini} />
                )}
              </div>
            </div>
        </main>
      </div>

      {/* Floating Bottom Player */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto z-50">
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
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiKey={apiKeys.geminiKey}
        setGeminiKey={apiKeys.setGeminiKey}
        youtubeApiKey={apiKeys.youtubeApiKey}
        setYoutubeApiKey={apiKeys.setYoutubeApiKey}
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
