import React from 'react';
import { MusicMix } from '../types';

interface MixCardProps {
  mix: MusicMix;
  accessToken: string | null;
  onAddToPlaylist: (mix: MusicMix) => void;
  onPlay: (mix: MusicMix) => void;
  isAdding: boolean;
  isPlaying: boolean;
  isCurrent: boolean;
}

export const MixCard: React.FC<MixCardProps> = ({ mix, accessToken, onAddToPlaylist, onPlay, isAdding, isPlaying, isCurrent }) => {
  return (
    <div className={`bg-zinc-900 border rounded-lg p-5 flex flex-col justify-between h-full transition-all duration-300 group relative overflow-hidden ${isCurrent ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-800 hover:border-zinc-600'}`}>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <span className="text-6xl font-black text-white">{mix.continent.substring(0,2).toUpperCase()}</span>
      </div>

      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
            {mix.country}
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
            {mix.bpm} BPM
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
            {mix.year}
          </span>
        </div>
        
        <div className="text-zinc-500 text-xs font-mono mb-1">{mix.style}</div>
        
        <div className="flex items-center justify-between mb-2">
           <h3 className={`text-xl font-bold transition-colors ${isCurrent ? 'text-indigo-400' : 'text-white group-hover:text-indigo-300'}`}>
            {mix.artist}
          </h3>
          {isCurrent && isPlaying && (
            <div className="flex gap-0.5 items-end h-4">
              <div className="w-1 bg-indigo-500 animate-[bounce_1s_infinite] h-2"></div>
              <div className="w-1 bg-indigo-500 animate-[bounce_1.2s_infinite] h-4"></div>
              <div className="w-1 bg-indigo-500 animate-[bounce_0.8s_infinite] h-3"></div>
            </div>
          )}
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-4">
          {mix.description}
        </p>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
        <button 
          onClick={() => onPlay(mix)}
          className={`flex-1 text-center text-xs font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 ${
            isCurrent && isPlaying ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
        >
          {isCurrent && isPlaying ? (
             <>
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
               Pausar
             </>
          ) : (
             <>
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
               {isCurrent ? "Reanudar" : "Reproducir"}
             </>
          )}
        </button>
        
        {accessToken && (
          <button
            onClick={() => onAddToPlaylist(mix)}
            disabled={isAdding}
            className={`flex-1 text-center text-xs font-medium py-2 px-4 rounded transition-colors ${
              isAdding 
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {isAdding ? "..." : "+ Playlist"}
          </button>
        )}
      </div>
    </div>
  );
};