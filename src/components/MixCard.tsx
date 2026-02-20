import React from 'react';
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
    <div
      className={`animate-card-enter relative rounded-[1.25rem] flex flex-col justify-between h-full group cursor-pointer overflow-hidden transition-all duration-500 ${
        isCurrent
          ? 'glass-card bg-gradient-to-br from-indigo-500/15 to-purple-500/5 border-indigo-500/40 shadow-[0_8px_32px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/50 scale-[1.02] z-10'
          : 'glass-card hover:bg-white/5 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(255,255,255,0.05)] hover:-translate-y-1'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onPlay(mix)}
    >
      {/* Botón YouTube Music — Siempre visible para móvil */}
      <a
        href={ytMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-600 rounded-full text-white/90 shadow-lg backdrop-blur-sm transition-all z-20"
        title="Abrir en YouTube Music"
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z" />
          <path d="M10 15l5-3-5-3v6z" />
        </svg>
      </a>

      {/* Accent strip lateral */}
      <div
        className="card-accent"
        style={{ background: isCurrent ? '#6366f1' : style.markerColor }}
      />

      {/* Thumbnail background si hay videoId */}
      {mix.videoId && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500">
          <img
            src={`https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`}
            alt=""
            className="w-full h-full object-cover blur-sm"
            loading="lazy"
          />
        </div>
      )}

      <div className="relative p-5 pl-6">
        {/* Header: continent dot + tags */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: style.markerColor, boxShadow: `0 0 8px ${style.markerColor}40` }}
          />
          <span className={`text-xs font-semibold tracking-wider uppercase ${style.textClass}`}>
            {mix.continent}
          </span>
          <span className="text-zinc-600 text-xs">·</span>
          <span className="text-xs font-medium tracking-wide uppercase text-zinc-400">
            {mix.country}
          </span>
        </div>

        {/* Artista */}
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={`text-2xl font-extrabold transition-colors duration-300 leading-tight tracking-tight ${
              isCurrent ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 glow-text' : 'text-zinc-100 group-hover:text-white'
            }`}
          >
            {mix.artist}
          </h3>
          {isCurrent && isPlaying && (
            <div className="flex gap-[3px] items-end h-4 ml-1 shrink-0">
              <div className="w-[3px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
              <div className="w-[3px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
              <div className="w-[3px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.45s', '--eq-delay': '0.2s' } as React.CSSProperties} />
              <div className="w-[3px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.65s', '--eq-delay': '0.15s' } as React.CSSProperties} />
            </div>
          )}
        </div>

        {/* Canción */}
        {mix.songTitle && (
          <p className={`text-base font-medium mb-2 truncate transition-colors duration-300 ${isCurrent ? 'text-indigo-200/90' : 'text-zinc-300 group-hover:text-indigo-200/80'}`}>{mix.songTitle}</p>
        )}

        {/* Style + BPM + Year */}
        <div className="text-zinc-400 text-[13px] font-mono mb-3 flex items-center gap-1.5">
          <span className="text-zinc-300 font-semibold">{mix.year}</span>
          <span className="text-zinc-600">·</span>
          <span>{mix.style}</span>
          <span className="text-zinc-600">·</span>
          <span>{mix.bpm} BPM</span>
        </div>

        {/* Description */}
        <p className="text-zinc-300 text-[15px] leading-relaxed line-clamp-6">{mix.description}</p>
      </div>

      {/* Play button */}
      <div className="relative px-5 pl-6 pb-5 pt-0 mt-auto">
        <div className="pt-3">
          <button
            onClick={e => { e.stopPropagation(); onPlay(mix); }}
            className={`w-full text-center text-sm font-bold py-3 px-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
              isCurrent && isPlaying
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 hover:shadow-[0_5px_15px_rgba(0,0,0,0.3)]'
            }`}
          >
            {isCurrent && isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pausar
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {isCurrent ? 'Reanudar' : 'Reproducir'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

MixCard.displayName = 'MixCard';
