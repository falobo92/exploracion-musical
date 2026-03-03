import React from 'react';
import { motion } from 'framer-motion';
import type { MusicMix } from '@/types';
import { getContinentStyle } from '@/constants/continents';

interface MixCardProps {
  mix: MusicMix;
  onPlay: (mix: MusicMix) => void;
  isPlaying: boolean;
  isCurrent: boolean;
  index: number;
}

export const MixCard: React.FC<MixCardProps> = React.memo(({ mix, onPlay, isPlaying, isCurrent, index }) => {
  const style = getContinentStyle(mix.continent);

  const ytMusicUrl = mix.videoId
    ? `https://music.youtube.com/watch?v=${mix.videoId}`
    : `https://music.youtube.com/search?q=${encodeURIComponent(mix.searchQuery)}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4), ease: [0.23, 1, 0.32, 1] }}
      className={`relative rounded-2xl flex items-stretch gap-4 p-3 group cursor-pointer transition-all duration-300 ${
        isCurrent
          ? 'bg-zinc-800/90 border border-emerald-500/50 shadow-[0_8px_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
          : 'bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 hover:border-white/10 hover:shadow-xl hover:-translate-y-[2px]'
      }`}
      onClick={() => onPlay(mix)}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-xl overflow-hidden shrink-0 bg-zinc-800 shadow-md">
        {mix.videoId ? (
          <img
            src={`https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`}
            alt=""
            className={`w-full h-full object-cover transition-transform duration-700 ${isCurrent ? 'scale-105' : 'group-hover:scale-110'}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800/80">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}

        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isCurrent && isPlaying ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform ${isCurrent ? 'bg-emerald-500 text-zinc-950' : 'bg-white/95 text-zinc-950 scale-90 group-hover:scale-100'}`}>
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
        {/* Header: continent + country */}
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: style.markerColor, boxShadow: `0 0 6px ${style.markerColor}` }}
          />
          <span className={`text-[9px] font-bold tracking-widest uppercase truncate ${style.textClass}`}>
            {mix.continent} <span className="text-zinc-600 mx-1">&middot;</span> <span className="text-zinc-400">{mix.country}</span>
          </span>
        </div>

        {/* Artist & EQ */}
        <div className="flex items-center gap-2 pr-8">
          <h3 className={`text-base sm:text-lg font-black truncate leading-tight transition-colors ${isCurrent ? 'text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-teal-400' : 'text-zinc-100 group-hover:text-white'}`}>
            {mix.artist}
          </h3>
          {isCurrent && isPlaying && (
            <div className="flex gap-[2px] items-end h-3 shrink-0 ml-auto">
              <div className="w-[2px] bg-emerald-400 rounded-full eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
              <div className="w-[2px] bg-emerald-400 rounded-full eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
              <div className="w-[2px] bg-emerald-400 rounded-full eq-bar" style={{ '--eq-duration': '0.45s', '--eq-delay': '0.2s' } as React.CSSProperties} />
            </div>
          )}
        </div>

        {/* Song Title */}
        {mix.songTitle && (
          <p className={`text-xs mt-0.5 truncate ${isCurrent ? 'text-emerald-200/90' : 'text-zinc-400'}`}>
            {mix.songTitle}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-zinc-300 text-[10px] font-bold tracking-wide">{mix.year}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-zinc-300 text-[10px] font-bold tracking-wide truncate max-w-[100px]">{mix.style}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-zinc-300 text-[10px] font-bold tracking-wide font-mono">{mix.bpm} BPM</span>
        </div>
      </div>

      {/* External Link (YT Music) */}
      <a
        href={ytMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 p-1.5 bg-zinc-900/80 hover:bg-red-500/90 rounded-lg text-zinc-400 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
        title="Abrir en YouTube Music"
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z" />
          <path d="M10 15l5-3-5-3v6z" />
        </svg>
      </a>
    </motion.div>
  );
});

MixCard.displayName = 'MixCard';
