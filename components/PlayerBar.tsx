import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MusicMix } from '../types';

interface PlayerBarProps {
  currentMix: MusicMix | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  videoId: string | undefined;
  onVideoEnd: () => void;
  currentIndex: number;
  totalTracks: number;
  onSavePlaylist: () => void;
  isSavingPlaylist: boolean;
  shuffle: boolean;
  onToggleShuffle: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ 
  currentMix, isPlaying, onPlayPause, onNext, onPrev,
  videoId, onVideoEnd, currentIndex, totalTracks,
  onSavePlaylist, isSavingPlaylist, shuffle, onToggleShuffle
}) => {
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const onVideoEndRef = useRef(onVideoEnd);
  const videoIdRef = useRef(videoId);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showVolume, setShowVolume] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs updated
  useEffect(() => { onVideoEndRef.current = onVideoEnd; }, [onVideoEnd]);
  useEffect(() => { videoIdRef.current = videoId; }, [videoId]);

  // Create YouTube player ONCE on mount
  useEffect(() => {
    const createPlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('yt-player-element', {
        width: 280,
        height: 158,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
          fs: 0,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            playerRef.current?.setVolume(80);
            if (videoIdRef.current) {
              playerRef.current.loadVideoById(videoIdRef.current);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onVideoEndRef.current();
            }
            if (event.data === window.YT.PlayerState.PLAYING) {
              const dur = playerRef.current?.getDuration?.() || 0;
              if (dur > 0) setDuration(dur);
            }
          },
          onError: () => {
            setTimeout(() => onVideoEndRef.current(), 1000);
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        createPlayer();
      };
    }

    return () => {
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
        setPlayerReady(false);
      }
    };
  }, []);

  // Load video when videoId changes
  useEffect(() => {
    if (!playerReady || !playerRef.current || !videoId) return;
    try {
      playerRef.current.loadVideoById(videoId);
      setCurrentTime(0);
      setDuration(0);
    } catch (e) {
      console.error('Error cargando video:', e);
    }
  }, [videoId, playerReady]);

  // Play/pause
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    try {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch (_) {}
  }, [isPlaying, playerReady]);

  // Progress polling
  useEffect(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    if (isPlaying && playerReady && playerRef.current) {
      progressInterval.current = setInterval(() => {
        try {
          const ct = playerRef.current?.getCurrentTime?.() || 0;
          const dur = playerRef.current?.getDuration?.() || 0;
          setCurrentTime(ct);
          if (dur > 0) setDuration(dur);
        } catch (_) {}
      }, 500);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [isPlaying, playerReady]);

  // Seek on progress bar click
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = fraction * duration;
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [duration]);

  // Volume change
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(v);
    }
  }, []);

  const isVisible = !!currentMix;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      {/* Top seekable progress bar */}
      <div 
        className="h-1 bg-zinc-800 cursor-pointer group hover:h-2 transition-all"
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 relative transition-all duration-200"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
        </div>
      </div>
      
      <div className="bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 p-3">
          
          {/* YouTube mini player — off-screen on mobile, visible on sm+ */}
          <div 
            className="shrink-0 rounded-lg overflow-hidden bg-black shadow-lg fixed sm:relative sm:left-auto sm:top-auto -left-[9999px] -top-[9999px]"
            style={{ width: 280, height: 158 }}
          >
            <div id="yt-player-element" />
          </div>

          {/* Track info + mini progress */}
          <div className="flex-1 min-w-0">
            {currentMix && (
              <div className="mb-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-bold truncate text-sm leading-tight">
                    {currentMix.artist}
                  </h4>
                  {isPlaying && (
                    <div className="flex gap-[2px] items-end h-3 shrink-0">
                      <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite] h-1.5"></div>
                      <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] h-3"></div>
                      <div className="w-[2px] bg-indigo-400 rounded-full animate-[bounce_0.5s_infinite] h-2"></div>
                    </div>
                  )}
                  {totalTracks > 0 && (
                    <span className="text-zinc-600 text-[10px] font-mono shrink-0 ml-auto">
                      {currentIndex + 1} / {totalTracks}
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-xs truncate">
                  {currentMix.style} · {currentMix.country} · {currentMix.year} · {currentMix.bpm} BPM
                </p>
              </div>
            )}
            
            {/* Time + inline progress bar */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
              <span className="w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div className="flex-1 h-[3px] bg-zinc-800 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                <div className="h-full bg-zinc-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="w-8 tabular-nums">{formatTime(duration)}</span>
            </div>
            
            {!videoId && currentMix && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-3 h-3 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-indigo-400 text-xs">Buscando video...</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Shuffle */}
            <button 
              onClick={onToggleShuffle}
              className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center transition-colors ${
                shuffle ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-600 hover:text-zinc-300'
              }`}
              title={shuffle ? "Aleatorio activado" : "Aleatorio desactivado"}
              aria-label="Alternar modo aleatorio"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>
            
            {/* Prev */}
            <button 
              onClick={onPrev}
              className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
              title="Anterior"
              aria-label="Pista anterior"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            
            {/* Play/Pause */}
            <button 
              onClick={onPlayPause}
              className="w-11 h-11 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
              title={isPlaying ? "Pausar" : "Reproducir"}
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            
            {/* Next */}
            <button 
              onClick={onNext}
              className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
              title="Siguiente"
              aria-label="Siguiente pista"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>

            {/* Volume */}
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setShowVolume(!showVolume)}
                className="w-8 h-8 rounded-full text-zinc-600 hover:text-zinc-300 flex items-center justify-center transition-colors"
                title="Volumen"
                aria-label="Ajustar volumen"
              >
                {volume === 0 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : volume < 50 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 5.05a10 10 0 010 13.9" />
                  </svg>
                )}
              </button>
              {showVolume && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-zinc-800 border border-zinc-700/50 rounded-xl p-3 shadow-2xl min-w-[140px]">
                  <input 
                    type="range" min="0" max="100" value={volume}
                    onChange={handleVolumeChange}
                    aria-label="Volumen"
                    title="Volumen"
                    className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 cursor-pointer accent-indigo-500"
                  />
                  <div className="text-[10px] text-zinc-500 text-center mt-1.5 font-mono">{volume}%</div>
                </div>
              )}
            </div>

            {/* Save playlist */}
            <button 
              onClick={onSavePlaylist} 
              disabled={isSavingPlaylist}
              className="w-8 h-8 rounded-full text-zinc-600 hover:text-emerald-400 hidden sm:flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:text-zinc-600"
              title="Guardar como playlist en YouTube"
              aria-label="Guardar como playlist en YouTube"
            >
              {isSavingPlaylist ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M19 11v6M16 14h6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
