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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col overflow-x-hidden">
      <Header onOpenSettings={openSettings} hasGemini={apiKeys.hasGemini} hasGoogle={apiKeys.hasGoogle} />

      <main className="flex-1 flex flex-col px-3 sm:px-6 py-3 sm:py-4 pt-[60px] sm:pt-[64px] max-w-[1920px] mx-auto w-full">
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
          <div className="min-w-0 lg:flex-1">
            <WorldMap
              mixes={filteredMixes}
              onSelect={handleMapSelect}
              onPlay={player.handlePlayCard}
              selectedId={selectedMapMixId}
              playingId={player.currentMix?.id}
              className="w-full h-[42dvh] min-h-[260px] max-h-[480px] sm:h-[400px] sm:max-h-none lg:h-full rounded-2xl overflow-hidden border border-zinc-800/40 shadow-2xl shadow-black/20 relative z-0"
            />
          </div>

          {/* Panel lateral de canciones */}
          <div className="lg:w-[38%] xl:w-[34%] lg:flex-shrink-0">
            <div className="max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin lg:max-h-[calc(100vh-320px)]">
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
                {player.currentMix && (
                  <button
                    onClick={scrollToCurrent}
                    className="text-[11px] rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-1 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/15 transition-colors"
                    title="Ir a la canción sonando"
                  >
                    Sonando ahora
                  </button>
                )}
              </div>

              {loading ? (
                <SkeletonGrid count={6} />
              ) : filteredMixes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
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
