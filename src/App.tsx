import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="fixed inset-0 bg-zinc-950 text-zinc-100 font-sans overflow-hidden flex flex-col lg:flex-row">
      
      {/* 
        ========================================================================
        MAIN MAP AREA
        ========================================================================
      */}
      <main className="flex-1 relative min-h-0 min-w-0 h-full z-10 order-first lg:order-last flex flex-col">
        {/* Toggle Panel Button */}
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="absolute top-6 left-6 z-[9999] px-4 py-3 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 text-white border border-white/10 shadow-2xl backdrop-blur-md transition-all flex items-center gap-2.5 group hover:scale-105"
          title={isSidebarOpen ? "Ocultar Listado" : "Ver Listado"}
        >
          <svg className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          <span className="text-sm font-bold tracking-wide">
            {isSidebarOpen ? "Ocultar Mixes" : "Ver Mixes"}
          </span>
        </button>

        <WorldMap
          mixes={filteredMixes}
          onSelect={handleMapSelect}
          onPlay={player.handlePlayCard}
          selectedId={selectedMapMixId}
          playingId={player.currentMix?.id}
          className="absolute inset-0 w-full h-full bg-[#0c0c10]"
        />

        {/* Floating Bottom Player over the map */}
        <AnimatePresence>
          {player.currentMix && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-4 sm:bottom-8 left-1/2 w-[calc(100%-2rem)] sm:w-auto z-[9999] pointer-events-auto"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 
        ========================================================================
        SIDEBAR AREA (Left on Desktop, Bottom on Mobile)
        ========================================================================
      */}
      <div 
        className={`z-20 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex shrink-0 ${
          isSidebarOpen 
            ? 'w-full lg:w-[480px] xl:w-[520px] h-[55vh] lg:h-full opacity-100' 
            : 'w-full lg:w-0 h-0 lg:h-full opacity-0 lg:opacity-100 overflow-hidden'
        }`}
      >
        <aside className="w-full lg:w-[480px] xl:w-[520px] h-[55vh] lg:h-full flex flex-col bg-zinc-950/95 backdrop-blur-3xl border-t lg:border-t-0 lg:border-r border-white/10 shadow-2xl shadow-black/80">
          
          {/* Top Sticky Container */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 bg-zinc-950/80 border-b border-white/5 z-20 shrink-0">
          <Header onOpenSettings={openSettings} hasGemini={apiKeys.hasGemini} hasYoutubeKey={apiKeys.hasYoutubeKey} />
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

        {/* List Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-900/50 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
              {filteredMixes.length} pistas encontradas
            </h3>
          </div>
          {player.currentMix && (
            <button
              onClick={scrollToCurrent}
              className="text-[10px] uppercase font-bold tracking-wider rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors shadow-sm"
              title="Ir a la canción sonando"
            >
              Sonando ahora
            </button>
          )}
        </div>

        {/* Scrollable Mix List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin relative bg-gradient-to-b from-zinc-950 to-zinc-900/50">
          {loading ? (
            <SkeletonGrid count={6} />
          ) : filteredMixes.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredMixes.map((mix, index) => (
                  <motion.div 
                    key={mix.id} 
                    id={`mix-card-${mix.id}`}
                    layout
                  >
                    <MixCard
                      mix={mix}
                      onPlay={player.handlePlayCard}
                      isPlaying={player.currentMix?.id === mix.id && player.isPlaying}
                      isCurrent={player.currentMix?.id === mix.id}
                      index={index}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <EmptyState onGenerate={handleGenerate} onOpenSettings={openSettings} hasApiKey={apiKeys.hasGemini} />
          )}
        </div>
      </aside>
      </div>

      {/* Modals & Toasts */}
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
