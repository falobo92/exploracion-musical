import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileGuidedOpen, setIsMobileGuidedOpen] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);
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
    allMixes: mixes,
    visibleMixes: filteredMixes,
    googleClientId: apiKeys.googleClientId,
    youtubeApiKey: apiKeys.youtubeApiKey,
    onMixesUpdate: setMixes,
    notify,
    update,
    openSettings,
  });

  // Playlist
  const playlist = usePlaylist({
    visibleMixes: filteredMixes,
    googleClientId: apiKeys.googleClientId,
    setMixes,
    notify,
    update,
    openSettings,
  });

  const currentMixCardId = player.currentMix?.id ? `mix-card-${player.currentMix.id}` : null;
  const hasActiveFilters = Boolean(
    criteria.continent || criteria.country || criteria.style || criteria.year || criteria.bpm || criteria.descriptiveQuery,
  );
  const activeFilterCount = useMemo(() => {
    return [
      criteria.continent,
      criteria.country,
      criteria.style,
      criteria.year,
      criteria.bpm,
      criteria.descriptiveQuery,
    ].filter(Boolean).length;
  }, [criteria]);
  const hasResults = filteredMixes.length > 0;
  const mobilePlayerInSheet = Boolean(player.currentMix && !isDesktop && isSidebarOpen);
  const playerReserve = player.currentMix ? (isDesktop ? 204 : 164) : 28;
  const mapLeftInset = isDesktop && isSidebarOpen ? sidebarWidth + 32 : 24;
  const mapTopInset = isDesktop ? 28 : 84;
  const mapBottomInset = isDesktop
    ? (player.currentMix ? 210 : 36)
    : (isSidebarOpen ? 330 : (player.currentMix ? 180 : 92));

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const syncLayout = () => {
      setIsDesktop(query.matches);
      setIsSidebarOpen(query.matches);
    };
    syncLayout();
    query.addEventListener('change', syncLayout);
    return () => query.removeEventListener('change', syncLayout);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsMobileGuidedOpen(true);
      return;
    }

    if (loading || filteredMixes.length === 0) {
      setIsMobileGuidedOpen(true);
      return;
    }

    setIsMobileGuidedOpen(false);
  }, [filteredMixes.length, isDesktop, loading]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const updateSidebarWidth = () => setSidebarWidth(sidebar.offsetWidth);
    updateSidebarWidth();

    const observer = new ResizeObserver(updateSidebarWidth);
    observer.observe(sidebar);
    return () => observer.disconnect();
  }, [isDesktop, isSidebarOpen]);

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
      onGenerated: (newMixes) => {
        player.prefetchMixes(newMixes);
      },
    });
  }, [apiKeys.geminiKey, generate, notify, update, openSettings, player]);

  // Cargar búsqueda guardada
  const handleLoadSearch = useCallback((loadedCriteria: SearchCriteria, loadedMixes: MusicMix[]) => {
    setMixes(loadedMixes);
    updateCriteria(loadedCriteria);
    player.reset();
    player.prefetchMixes(loadedMixes);
    notify('Búsqueda cargada', 'success', 2000);
  }, [setMixes, updateCriteria, player, notify]);

  // Guardar búsqueda actual
  const handleSaveSearch = useCallback((name: string, c: SearchCriteria, m: MusicMix[]) => {
    savedSearches.save(name, c, m);
    notify('Búsqueda guardada', 'success', 2000);
  }, [savedSearches.save, notify]);

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_28%),#09090b] font-sans text-zinc-100"
      style={
        {
          '--app-player-reserve': `${playerReserve}px`,
          '--safe-top': 'env(safe-area-inset-top, 0px)',
          '--safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        } as React.CSSProperties
      }
    >
      <main className="relative z-0 h-full w-full isolate">
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="absolute z-[65] flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950 px-3 py-2 text-white shadow-2xl transition-all hover:bg-zinc-900 sm:px-4 sm:py-2.5"
          style={{
            top: isDesktop ? 'calc(var(--safe-top) + 1.5rem)' : 'calc(var(--safe-top) + 0.75rem)',
            left: isDesktop ? `${(isSidebarOpen ? sidebarWidth : 0) + 24}px` : '12px',
          }}
          title={isSidebarOpen ? 'Ocultar listado' : 'Ver listado'}
        >
          <svg className="h-5 w-5 text-emerald-300 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          <span className="text-xs font-bold uppercase tracking-[0.14em] sm:text-[11px]">
            {isSidebarOpen ? 'Ocultar mixes' : 'Ver mixes'}
          </span>
        </button>

        {isDesktop && (
          <div
            className="pointer-events-none absolute right-6 z-[45] hidden items-center gap-2 lg:flex"
            style={{ top: 'calc(var(--safe-top) + 1.5rem)' }}
          >
            <div className="rounded-full border border-white/10 bg-zinc-950/72 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 backdrop-blur-xl">
              {filteredMixes.length} visibles
            </div>
            <div className="rounded-full border border-white/10 bg-zinc-950/72 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 backdrop-blur-xl">
              {mixes.length} totales
            </div>
            {hasActiveFilters && (
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 backdrop-blur-xl">
                {activeFilterCount} filtros
              </div>
            )}
          </div>
        )}

        <WorldMap
          mixes={filteredMixes}
          onSelect={handleMapSelect}
          onPlay={player.handlePlayCard}
          selectedId={selectedMapMixId}
          playingId={player.currentMix?.id}
          className="absolute inset-0 h-full w-full bg-[#0c0c10]"
          leftInset={mapLeftInset}
          rightInset={24}
          topInset={mapTopInset}
          bottomInset={mapBottomInset}
          showLegend={isDesktop}
          zoomPosition={isDesktop ? 'bottomright' : 'topright'}
        />

        <AnimatePresence>
          {player.currentMix && !mobilePlayerInSheet && (
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 36 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="pointer-events-auto absolute z-[60]"
              style={{
                left: isDesktop ? `${(isSidebarOpen ? sidebarWidth : 0) + 24}px` : '12px',
                right: isDesktop ? '24px' : '12px',
                bottom: isDesktop ? 'calc(var(--safe-bottom) + 1.5rem)' : 'calc(var(--safe-bottom) + 0.75rem)',
              }}
            >
              <PlayerBar
                currentMix={player.currentMix}
                isPlaying={player.isPlaying}
                onPlayPause={player.togglePlayback}
                onPlay={player.play}
                onPause={player.pause}
                onNext={player.handleNext}
                onPrev={player.handlePrev}
                videoId={player.currentMix?.videoId}
                onVideoEnd={player.handleNext}
                currentIndex={player.currentIndex}
                totalTracks={player.queueLength}
                nextMix={player.nextMix}
                shuffle={player.shuffle}
                onToggleShuffle={() => player.setShuffle(!player.shuffle)}
                playbackStatus={player.playbackStatus}
                onPlaybackStateChange={player.setPlaybackStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div
        ref={sidebarRef}
        className={`absolute bottom-0 left-0 z-[55] flex w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:top-0 lg:w-[clamp(25rem,31vw,34rem)] ${
          isSidebarOpen
            ? `opacity-100 ${isDesktop ? 'translate-x-0' : 'h-[min(76dvh,780px)]'}`
            : `${isDesktop ? '-translate-x-[104%]' : 'h-0 overflow-hidden'} opacity-0`
        }`}
      >
        <aside className="relative z-[56] flex h-full min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-zinc-950 shadow-2xl shadow-black/80 lg:rounded-none lg:border-r lg:border-t-0">
          {!isDesktop && (
            <div className="flex shrink-0 justify-center pt-2.5">
              <div className="h-1 w-14 rounded-full bg-white/12" />
            </div>
          )}

          <div className="z-20 flex shrink-0 flex-col gap-3 border-b border-white/5 bg-zinc-950 px-3 pb-3 pt-3 sm:px-4 lg:px-5">
            <Header
              onOpenSettings={openSettings}
              hasGemini={apiKeys.hasGemini}
              hasYoutubeKey={apiKeys.hasYoutubeKey}
              hasClientId={apiKeys.hasClientId}
            />

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/8 bg-zinc-900 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Visibles</p>
                <p className="mt-1 text-lg font-black text-white">{filteredMixes.length}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-zinc-900 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Colección</p>
                <p className="mt-1 text-lg font-black text-white">{mixes.length}</p>
              </div>
              <div className={`rounded-2xl border px-3 py-2 ${
                activeFilterCount > 0
                  ? 'border-emerald-500/20 bg-emerald-950'
                  : 'border-white/8 bg-zinc-900'
              }`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Filtros</p>
                <p className={`mt-1 text-lg font-black ${activeFilterCount > 0 ? 'text-emerald-200' : 'text-white'}`}>
                  {activeFilterCount}
                </p>
              </div>
            </div>

            {!isDesktop && (
              <button
                type="button"
                onClick={() => setIsMobileGuidedOpen((prev) => !prev)}
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-zinc-900 px-3 py-2.5 text-left"
                aria-controls="mobile-guided-panel"
                aria-label={isMobileGuidedOpen ? 'Ocultar exploracion guiada' : 'Mostrar exploracion guiada'}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
                    Exploracion guiada
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {isMobileGuidedOpen
                      ? 'Edita prompt y filtros sin tapar toda la lista'
                      : hasResults
                        ? `${filteredMixes.length} pistas listas para navegar`
                        : 'Abre para preparar la búsqueda'}
                  </p>
                </div>
                <svg
                  className={`h-5 w-5 text-zinc-400 transition-transform ${isMobileGuidedOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}

            <div
              id="mobile-guided-panel"
              className={`${!isDesktop && !isMobileGuidedOpen ? 'hidden' : 'block'} ${!isDesktop ? 'max-h-[38dvh] overflow-y-auto pr-1' : ''}`}
            >
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

          <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-zinc-900 px-3 py-3 sm:px-4 lg:px-5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.85)] animate-pulse" />
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                  Lista activa
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {hasResults ? `${filteredMixes.length} pistas listas para reproducir` : 'Sin resultados visibles'}
                </p>
              </div>
            </div>

            {player.currentMix && (
              <button
                onClick={scrollToCurrent}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                title="Ir a la canción sonando"
              >
                Sonando ahora
              </button>
            )}
          </div>

          <div className={`scrollbar-thin relative flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y bg-gradient-to-b from-zinc-950 to-zinc-900 px-3 pt-3 sm:px-4 lg:px-5 ${mobilePlayerInSheet ? 'pb-4' : 'pb-[calc(var(--app-player-reserve)+1rem)]'}`}>
            {loading ? (
              <SkeletonGrid count={6} />
            ) : hasResults ? (
              <motion.div layout className="grid grid-cols-1 gap-3 pb-4">
                <AnimatePresence mode="popLayout">
                  {filteredMixes.map((mix, index) => (
                    <motion.div key={mix.id} id={`mix-card-${mix.id}`} layout>
                      <MixCard
                        mix={mix}
                        onPlay={player.handlePlayCard}
                        isPlaying={player.currentMix?.id === mix.id && player.isPlaying}
                        isCurrent={player.currentMix?.id === mix.id}
                        playbackStatus={player.currentMix?.id === mix.id ? player.playbackStatus : 'idle'}
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

          <AnimatePresence>
            {mobilePlayerInSheet && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                className="shrink-0 border-t border-white/8 bg-zinc-950 px-3 pb-[calc(var(--safe-bottom)+0.75rem)] pt-3"
              >
                <PlayerBar
                  currentMix={player.currentMix}
                  isPlaying={player.isPlaying}
                  onPlayPause={player.togglePlayback}
                  onPlay={player.play}
                  onPause={player.pause}
                  onNext={player.handleNext}
                  onPrev={player.handlePrev}
                  videoId={player.currentMix?.videoId}
                  onVideoEnd={player.handleNext}
                  currentIndex={player.currentIndex}
                  totalTracks={player.queueLength}
                  nextMix={player.nextMix}
                  shuffle={player.shuffle}
                  onToggleShuffle={() => player.setShuffle(!player.shuffle)}
                  playbackStatus={player.playbackStatus}
                  onPlaybackStateChange={player.setPlaybackStatus}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
