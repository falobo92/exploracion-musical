import React from 'react';
import { motion } from 'framer-motion';
import type { MusicMix, PlaybackStatus } from '@/types';
import { getContinentStyle } from '@/constants/continents';

interface MixCardProps {
  mix: MusicMix;
  onPlay: (mix: MusicMix) => void;
  isPlaying: boolean;
  isCurrent: boolean;
  playbackStatus: PlaybackStatus;
  index: number;
}

export const MixCard: React.FC<MixCardProps> = React.memo(({ mix, onPlay, isPlaying, isCurrent, playbackStatus, index }) => {
  const style = getContinentStyle(mix.continent);
  const isLoading = isCurrent && (playbackStatus === 'resolving' || playbackStatus === 'buffering');
  const hasError = isCurrent && playbackStatus === 'error';
  const statusLabel = isLoading
    ? (playbackStatus === 'resolving' ? 'Buscando fuente' : 'Cargando audio')
    : hasError
      ? 'Error al cargar'
      : isCurrent
        ? (isPlaying ? 'Sonando ahora' : 'Lista para reproducir')
        : 'Toca para escuchar';

  const ytMusicUrl = mix.videoId
    ? `https://music.youtube.com/watch?v=${mix.videoId}`
    : `https://music.youtube.com/search?q=${encodeURIComponent(mix.searchQuery)}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4), ease: [0.23, 1, 0.32, 1] }}
      className={`relative overflow-hidden rounded-[22px] border transition-all duration-300 ${
        isCurrent
          ? 'border-emerald-500/35 bg-[linear-gradient(180deg,rgba(18,30,27,0.98),rgba(9,9,11,0.98))] shadow-[0_14px_36px_rgba(16,185,129,0.14)] ring-1 ring-emerald-500/20'
          : 'border-white/6 bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(9,9,11,0.98))] hover:-translate-y-[2px] hover:border-white/12 hover:shadow-xl'
      }`}
    >
      <button
        type="button"
        onClick={() => onPlay(mix)}
        className="group flex w-full items-start gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        aria-label={`${isCurrent && isPlaying ? 'Pausar' : 'Reproducir'} ${mix.artist}${mix.songTitle ? `, ${mix.songTitle}` : ''}`}
      >
        <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-2xl bg-zinc-800 shadow-md sm:h-[96px] sm:w-[96px]">
          {mix.videoId ? (
            <img
              src={`https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`}
              alt=""
              className={`h-full w-full object-cover transition-transform duration-700 ${isCurrent ? 'scale-105' : 'group-hover:scale-110'}`}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800/80">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}

          <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-all duration-300 ${isCurrent ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
            {isLoading ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300 text-zinc-950 shadow-[0_0_18px_rgba(252,211,77,0.35)]">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v3m0 10v3m8-8h-3M7 12H4m13.657-5.657l-2.121 2.121M8.464 15.536l-2.121 2.121m0-11.314l2.121 2.121m7.072 7.072l2.121 2.121" />
                </svg>
              </div>
            ) : isCurrent && isPlaying ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 shadow-[0_0_18px_rgba(16,185,129,0.45)]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition-transform group-hover:scale-105">
                <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: style.markerColor, boxShadow: `0 0 6px ${style.markerColor}` }}
                />
                <span className={`truncate text-[9px] font-bold uppercase tracking-[0.16em] ${style.textClass}`}>
                  {mix.continent}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="truncate text-[10px] text-zinc-400">{mix.country}</span>
              </div>

              <h3 className={`line-clamp-2 text-sm font-black leading-tight break-words sm:text-base ${isCurrent ? 'bg-gradient-to-br from-emerald-300 to-teal-400 bg-clip-text text-transparent' : 'text-zinc-100 group-hover:text-white'}`}>
                {mix.artist}
              </h3>

              {mix.songTitle && (
                <p className={`mt-0.5 line-clamp-2 break-words text-[12px] ${isCurrent ? 'text-emerald-100/90' : 'text-zinc-400'}`}>
                  {mix.songTitle}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isCurrent && isPlaying && !isLoading && (
                <div className="flex h-3 items-end gap-[2px]">
                  <div className="w-[2px] rounded-full bg-emerald-400 eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
                  <div className="w-[2px] rounded-full bg-emerald-400 eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
                  <div className="w-[2px] rounded-full bg-emerald-400 eq-bar" style={{ '--eq-duration': '0.45s', '--eq-delay': '0.2s' } as React.CSSProperties} />
                </div>
              )}

              {hasError && (
                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-rose-200">
                  Error
                </span>
              )}

              <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                {mix.year || 's/f'}
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="max-w-[140px] truncate rounded-full border border-white/6 bg-zinc-800/70 px-2 py-1 text-[9px] font-bold tracking-wide text-zinc-300 sm:max-w-[180px]">
              {mix.style}
            </span>
            <span className="rounded-full border border-white/6 bg-zinc-800/70 px-2 py-1 text-[9px] font-bold tracking-wide text-zinc-300">
              {mix.bpm} BPM
            </span>
            {mix.songTitle && (
              <span className="rounded-full border border-white/6 bg-zinc-800/70 px-2 py-1 text-[9px] font-bold tracking-wide text-zinc-500">
                tema visible
              </span>
            )}
          </div>

          <p className="mt-2 line-clamp-3 break-words text-[11px] leading-relaxed text-zinc-500">
            {mix.description}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className={`inline-flex max-w-[65%] items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              hasError
                ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                : isLoading
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                  : 'border-white/8 bg-white/5 text-zinc-400'
            }`}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: hasError ? '#fb7185' : isLoading ? '#fbbf24' : style.markerColor,
                  boxShadow: `0 0 6px ${hasError ? '#fb7185' : isLoading ? '#fbbf24' : style.markerColor}`,
                }}
              />
              <span className="truncate">{statusLabel}</span>
            </div>

            <span className="max-w-[35%] truncate text-right text-[10px] font-semibold text-zinc-500">{mix.country}</span>
          </div>
        </div>
      </button>

      <a
        href={ytMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/8 bg-zinc-950/88 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-300 transition-all hover:border-red-500/35 hover:text-red-300"
        title="Abrir en YouTube Music"
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z" />
          <path d="M10 15l5-3-5-3v6z" />
        </svg>
        YT
      </a>
    </motion.article>
  );
});

MixCard.displayName = 'MixCard';
