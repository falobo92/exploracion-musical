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
      className={`animate-card-enter relative rounded-xl flex flex-col justify-between h-full transition-all duration-200 group cursor-pointer overflow-hidden ${
        isCurrent
          ? 'bg-zinc-900 border border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20'
          : 'bg-zinc-900/70 border border-zinc-800/50 hover:border-zinc-700/70 hover:bg-zinc-800/50 hover:shadow-lg hover:shadow-black/20'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onPlay(mix)}
    >
      {/* Botón YouTube Music */}
      <a
        href={ytMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-600/90 rounded-full text-white transition-all transform hover:scale-110 z-20 group/yt"
        title="Abrir en YouTube Music"
        onClick={(e) => e.stopPropagation()}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
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
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: style.markerColor, boxShadow: `0 0 8px ${style.markerColor}40` }}
          />
          <span className={`text-[10px] font-semibold tracking-wider uppercase ${style.textClass}`}>
            {mix.continent}
          </span>
          <span className="text-zinc-600 text-[10px]">·</span>
          <span className="text-[10px] font-medium tracking-wide uppercase text-zinc-500">
            {mix.country}
          </span>
          <span className="text-[10px] font-mono text-zinc-600 ml-auto">
            {mix.year}
          </span>
        </div>

        {/* Artista */}
        <div className="flex items-center gap-2 mb-0.5">
          <h3
            className={`text-lg font-bold transition-colors leading-tight ${
              isCurrent ? 'text-indigo-300' : 'text-white group-hover:text-indigo-200'
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
          <p className="text-indigo-300/70 text-sm italic mb-1.5 truncate">{mix.songTitle}</p>
        )}

        {/* Style + BPM */}
        <div className="text-zinc-500 text-xs font-mono mb-2.5 flex items-center gap-1.5">
          <span>{mix.style}</span>
          <span className="text-zinc-700">·</span>
          <span>{mix.bpm} BPM</span>
        </div>

        {/* Description */}
        <p className="text-zinc-400 text-[13px] leading-relaxed line-clamp-3">{mix.description}</p>
      </div>

      {/* Play button */}
      <div className="relative px-5 pl-6 pb-4 pt-0">
        <div className="border-t border-zinc-800/40 pt-3">
          <button
            onClick={e => { e.stopPropagation(); onPlay(mix); }}
            className={`w-full text-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              isCurrent && isPlaying
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                : 'bg-zinc-800/60 hover:bg-zinc-700/70 text-zinc-400 hover:text-white border border-transparent'
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
