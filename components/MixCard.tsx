import React from 'react';
import { MusicMix } from '../types';

interface MixCardProps {
  mix: MusicMix;
  onPlay: (mix: MusicMix) => void;
  isPlaying: boolean;
  isCurrent: boolean;
}

const continentAccent: Record<string, string> = {
  'África': 'text-amber-400',
  'Africa': 'text-amber-400',
  'Asia': 'text-red-400',
  'Europa': 'text-indigo-400',
  'Europe': 'text-indigo-400',
  'América del Norte': 'text-cyan-400',
  'North America': 'text-cyan-400',
  'América del Sur': 'text-emerald-400',
  'South America': 'text-emerald-400',
  'Oceanía': 'text-pink-400',
  'Oceania': 'text-pink-400',
};

export const MixCard: React.FC<MixCardProps> = ({ mix, onPlay, isPlaying, isCurrent }) => {
  const accent = continentAccent[mix.continent] || 'text-violet-400';

  return (
    <div 
      className={`relative rounded-xl p-5 flex flex-col justify-between h-full transition-all duration-200 group cursor-pointer overflow-hidden ${
        isCurrent 
          ? 'bg-zinc-900 border-2 border-indigo-500/70 shadow-lg shadow-indigo-500/10' 
          : 'bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-800/60'
      }`}
      onClick={() => onPlay(mix)}
    >
      <div>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-[10px] font-semibold tracking-wider uppercase ${accent} bg-white/5 px-2 py-0.5 rounded-full`}>
            {mix.continent}
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
            {mix.country}
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
            {mix.year}
          </span>
        </div>
        
        {/* Estilo musical */}
        <div className="text-zinc-500 text-xs font-mono mb-1 tracking-wide">{mix.style} · {mix.bpm} BPM</div>
        
        {/* Artista */}
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-bold transition-colors leading-tight ${
            isCurrent ? 'text-indigo-300' : 'text-white group-hover:text-indigo-200'
          }`}>
            {mix.artist}
          </h3>
          {isCurrent && isPlaying && (
            <div className="flex gap-[3px] items-end h-4 ml-2 shrink-0">
              <div className="w-[3px] bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite] h-2"></div>
              <div className="w-[3px] bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] h-4"></div>
              <div className="w-[3px] bg-indigo-400 rounded-full animate-[bounce_0.5s_infinite] h-3"></div>
              <div className="w-[3px] bg-indigo-400 rounded-full animate-[bounce_0.7s_infinite] h-2.5"></div>
            </div>
          )}
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed">
          {mix.description}
        </p>
      </div>

      {/* Botón reproducir */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60">
        <button 
          onClick={(e) => { e.stopPropagation(); onPlay(mix); }}
          className={`w-full text-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            isCurrent && isPlaying 
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
              : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white'
          }`}
        >
          {isCurrent && isPlaying ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              Pausar
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              {isCurrent ? "Reanudar" : "Reproducir"}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
