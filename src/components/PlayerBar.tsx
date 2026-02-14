import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MusicMix } from '@/types';
import { getContinentStyle } from '@/constants/continents';
import { getAudioUrl, clearAudioCache } from '@/services/audioProxy';

interface PlayerBarProps {
  currentMix: MusicMix | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  videoId: string | undefined;
  onVideoEnd: () => void;
  currentIndex: number;
  totalTracks: number;
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
  currentMix,
  isPlaying,
  onPlayPause,
  onPlay,
  onPause,
  onNext,
  onPrev,
  videoId,
  onVideoEnd,
  currentIndex,
  totalTracks,
  shuffle,
  onToggleShuffle,
}) => {
  // === Refs ===
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const onVideoEndRef = useRef(onVideoEnd);
  const videoIdRef = useRef(videoId);
  const isPlayingRef = useRef(isPlaying);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // === State ===
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showVolume, setShowVolume] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioRetryToken, setAudioRetryToken] = useState(0);
  const audioRetryCountRef = useRef(0);

  // === Derived: ¿usar audio nativo o YouTube iframe? ===
  const useNativeAudio = !!audioSrc && !audioFailed;

  // === Ref syncing ===
  useEffect(() => { onVideoEndRef.current = onVideoEnd; }, [onVideoEnd]);
  useEffect(() => { videoIdRef.current = videoId; }, [videoId]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ====================================================================
  // AUDIO NATIVO: Obtener URL de audio directa (Piped/Invidious)
  // Permite reproducción con pantalla bloqueada y en segundo plano
  // ====================================================================
  useEffect(() => {
    if (!videoId) {
      setAudioSrc(null);
      setAudioFailed(false);
      audioRetryCountRef.current = 0;
      return;
    }

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    setAudioSrc(null);
    setAudioFailed(false);
    setCurrentTime(0);
    setDuration(0);

    getAudioUrl(videoId)
      .then(url => {
        if (cancelled) return;
        if (url) {
          setAudioSrc(url);
          audioRetryCountRef.current = 0;
        } else {
          if (audioRetryCountRef.current < 2) {
            audioRetryCountRef.current += 1;
            retryTimeout = setTimeout(() => {
              setAudioRetryToken(t => t + 1);
            }, 450);
          } else {
            setAudioFailed(true);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (audioRetryCountRef.current < 2) {
          audioRetryCountRef.current += 1;
          retryTimeout = setTimeout(() => {
            setAudioRetryToken(t => t + 1);
          }, 450);
        } else {
          setAudioFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [videoId, audioRetryToken]);

  // Audio element: play cuando se carga el metadata
  const handleAudioLoaded = useCallback(() => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && !isNaN(dur)) setDuration(dur);
    audioRef.current.volume = volume / 100;
    if (isPlayingRef.current) audioRef.current.play().catch(() => {});
  }, [volume]);

  // Audio element: actualizar progreso
  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(ct);
    if (dur && !isNaN(dur) && dur > 0) {
      setDuration(dur);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            position: Math.min(ct, dur),
            playbackRate: 1,
          });
        } catch (_) {}
      }
    }
  }, []);

  // Audio element: error — URL expirada, usar YouTube como fallback
  const handleAudioError = useCallback(() => {
    if (videoIdRef.current) clearAudioCache(videoIdRef.current);
    if (audioRetryCountRef.current < 2) {
      audioRetryCountRef.current += 1;
      setAudioSrc(null);
      setAudioFailed(false);
      setAudioRetryToken(t => t + 1);
      return;
    }
    setAudioSrc(null);
    setAudioFailed(true);
  }, []);

  // ====================================================================
  // YOUTUBE IFRAME: Fallback cuando el audio nativo no está disponible
  // ====================================================================
  useEffect(() => {
    const createPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('yt-player-element', {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 0,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            playerRef.current?.setVolume(80);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) onVideoEndRef.current();
            if (event.data === window.YT.PlayerState.PLAYING) {
              const dur = playerRef.current?.getDuration?.() || 0;
              if (dur > 0) setDuration(dur);
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            }
            if (event.data === window.YT.PlayerState.PAUSED) {
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            }
          },
          onError: () => { setTimeout(() => onVideoEndRef.current(), 1000); },
        },
      });
    };

    if (window.YT?.Player) createPlayer();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); createPlayer(); };
    }

    return () => {
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
        setPlayerReady(false);
      }
    };
  }, []);

  // Cargar video en YouTube player SOLO cuando audio nativo falló
  useEffect(() => {
    if (!playerReady || !playerRef.current || !videoId) return;
    if (audioFailed && !useNativeAudio) {
      try {
        playerRef.current.loadVideoById(videoId);
      } catch (_) {}
    }
  }, [videoId, playerReady, audioFailed, useNativeAudio]);

  // ====================================================================
  // CONTROLES UNIFICADOS: Play/Pause, Seek, Volume
  // ====================================================================

  // Play/Pause — dirigir al player activo
  useEffect(() => {
    if (useNativeAudio) {
      if (!audioRef.current) return;
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    } else if (playerReady && playerRef.current && audioFailed) {
      try {
        if (isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } catch (_) {}
    }
  }, [isPlaying, playerReady, useNativeAudio, audioFailed]);

  // Media Session API — controles en lock screen / notificaciones
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    navigator.mediaSession.setActionHandler('previoustrack', onPrev);
    navigator.mediaSession.setActionHandler('nexttrack', onNext);

    navigator.mediaSession.setActionHandler('seekforward', () => {
      const t = Math.min(currentTime + 10, duration || Infinity);
      if (useNativeAudio && audioRef.current) {
        audioRef.current.currentTime = t;
      } else if (playerRef.current?.seekTo && duration > 0) {
        playerRef.current.seekTo(t, true);
      }
      setCurrentTime(t);
    });

    navigator.mediaSession.setActionHandler('seekbackward', () => {
      const t = Math.max(currentTime - 10, 0);
      if (useNativeAudio && audioRef.current) {
        audioRef.current.currentTime = t;
      } else if (playerRef.current?.seekTo) {
        playerRef.current.seekTo(t, true);
      }
      setCurrentTime(t);
    });

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack', 'seekforward', 'seekbackward'].forEach(a => {
        try { navigator.mediaSession.setActionHandler(a as any, null); } catch (_) {}
      });
    };
  }, [onPlay, onPause, onPrev, onNext, currentTime, duration, useNativeAudio]);

  // Media Session metadata
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentMix) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentMix.artist,
      artist: `${currentMix.style} — ${currentMix.country}`,
      album: 'Atlas Sónico',
      artwork: currentMix.videoId ? [
        { src: `https://img.youtube.com/vi/${currentMix.videoId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
        { src: `https://img.youtube.com/vi/${currentMix.videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
      ] : [],
    });
  }, [currentMix]);

  // Progress polling — solo para YouTube fallback (audio nativo usa onTimeUpdate)
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = null;

    if (!useNativeAudio && isPlaying && playerReady && playerRef.current) {
      progressInterval.current = setInterval(() => {
        try {
          const ct = playerRef.current?.getCurrentTime?.() || 0;
          const dur = playerRef.current?.getDuration?.() || 0;
          setCurrentTime(ct);
          if (dur > 0) setDuration(dur);
          if ('mediaSession' in navigator && dur > 0) {
            try {
              navigator.mediaSession.setPositionState({ duration: dur, position: ct, playbackRate: 1 });
            } catch (_) {}
          }
        } catch (_) {}
      }, 500);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying, playerReady, useNativeAudio]);

  // Silent audio keep-alive — solo para YouTube fallback
  useEffect(() => {
    if (useNativeAudio) return;
    if (isPlaying && playerReady) {
      if (!audioCtxRef.current) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(ctx.destination);
          source.start();
          audioCtxRef.current = ctx;
          silentSourceRef.current = source;
        } catch (_) {}
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(() => {});
      }
    }
  }, [isPlaying, playerReady, useNativeAudio]);

  useEffect(() => {
    return () => {
      try {
        silentSourceRef.current?.stop();
        audioCtxRef.current?.close();
      } catch (_) {}
    };
  }, []);

  // Visibility change handler — solo para YouTube fallback
  useEffect(() => {
    if (useNativeAudio) return;

    const handleVisibilityChange = () => {
      if (!playerRef.current || !isPlayingRef.current) return;

      if (document.hidden) {
        const retryPlay = () => {
          try {
            const state = playerRef.current?.getPlayerState?.();
            if (state !== window.YT?.PlayerState?.PLAYING && isPlayingRef.current) {
              playerRef.current?.playVideo();
            }
          } catch (_) {}
        };
        setTimeout(retryPlay, 200);
        setTimeout(retryPlay, 1000);
        setTimeout(retryPlay, 3000);
      } else {
        try {
          const state = playerRef.current.getPlayerState?.();
          if (
            (state === window.YT?.PlayerState?.PAUSED ||
             state === window.YT?.PlayerState?.BUFFERING ||
             state === window.YT?.PlayerState?.CUED) &&
            isPlayingRef.current
          ) {
            playerRef.current.playVideo();
          }
        } catch (_) {}

        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [useNativeAudio]);

  // ====================================================================
  // HANDLERS
  // ====================================================================

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = fraction * duration;

    if (useNativeAudio && audioRef.current) {
      audioRef.current.currentTime = newTime;
    } else if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(newTime, true);
    }
    setCurrentTime(newTime);
  }, [duration, useNativeAudio]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
    playerRef.current?.setVolume?.(v);
  }, []);

  // ====================================================================
  // RENDER
  // ====================================================================

  const isVisible = !!currentMix;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const accentColor = currentMix ? getContinentStyle(currentMix.continent).markerColor : '#6366f1';

  return (
    <>
      {/* Elemento <audio> nativo — permite reproducción en segundo plano y pantalla bloqueada */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        preload="auto"
        playsInline
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoaded}
        onEnded={onVideoEnd}
        onError={handleAudioError}
        onPlay={() => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
          if (!isPlayingRef.current) onPlay();
        }}
        onPause={() => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
          if (isPlayingRef.current) onPause();
        }}
      />

      {/* Spacer para que el contenido no quede detrás del player fijo */}
      {isVisible && <div className="h-[144px] sm:h-[120px]" />}

      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}>
        {/* Top progress bar */}
        <div className="h-1 bg-zinc-900 cursor-pointer group hover:h-1.5 transition-all" onClick={handleSeek}>
          <div
            className="h-full relative transition-all duration-200 progress-glow"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}, #8b5cf6)` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>

        <div className="player-glass player-safe-area">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-3 sm:gap-4">

              {/* YouTube iframe (fallback) — siempre oculto cuando audio nativo está activo */}
              <div
                id="yt-player-wrapper"
                className={
                  useNativeAudio
                    ? 'fixed -left-[9999px] -top-[9999px] w-[320px] h-[180px] overflow-hidden pointer-events-none'
                    : 'fixed -left-[9999px] -top-[9999px] w-[320px] h-[180px] overflow-hidden pointer-events-none sm:relative sm:left-auto sm:top-auto sm:w-[213px] sm:h-[120px] sm:overflow-hidden sm:pointer-events-auto sm:shrink-0 sm:rounded-lg sm:shadow-lg sm:shadow-black/30 sm:border sm:border-zinc-800/30'
                }
              >
                <div id="yt-player-element" className="w-full h-full" />
              </div>

              {/* Thumbnail desktop — visible cuando audio nativo está activo */}
              {useNativeAudio && (
                <div className="hidden sm:block shrink-0">
                  <div className="w-[120px] h-[120px] rounded-lg overflow-hidden bg-zinc-800 relative shadow-lg shadow-black/30 border border-zinc-800/30">
                    {videoId ? (
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="flex gap-[3px] items-end h-5">
                          <div className="w-[3px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
                          <div className="w-[3px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
                          <div className="w-[3px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.4s', '--eq-delay': '0.2s' } as React.CSSProperties} />
                          <div className="w-[3px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.6s', '--eq-delay': '0.15s' } as React.CSSProperties} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Thumbnail / Album art en mobile */}
              <div className="sm:hidden shrink-0">
                {currentMix && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 relative">
                    {currentMix.videoId ? (
                      <img src={`https://img.youtube.com/vi/${currentMix.videoId}/default.jpg`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="flex gap-[2px] items-end h-3">
                          <div className="w-[2px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
                          <div className="w-[2px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
                          <div className="w-[2px] bg-white rounded-full eq-bar" style={{ '--eq-duration': '0.4s', '--eq-delay': '0.2s' } as React.CSSProperties} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                {currentMix && (
                  <>
                    <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                      <div className="hidden sm:block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
                      <h4 className="text-white font-semibold truncate text-[13px] sm:text-sm">{currentMix.artist}</h4>
                      {isPlaying && (
                        <div className="hidden sm:flex gap-[2px] items-end h-3 shrink-0">
                          <div className="w-[2px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
                          <div className="w-[2px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
                          <div className="w-[2px] bg-indigo-400 rounded-full eq-bar" style={{ '--eq-duration': '0.4s', '--eq-delay': '0.2s' } as React.CSSProperties} />
                        </div>
                      )}
                      <span className="text-zinc-600 text-[10px] font-mono shrink-0 ml-auto tabular-nums">
                        {currentIndex + 1}/{totalTracks}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-[11px] sm:text-xs truncate mb-1 sm:mb-1.5">
                      {currentMix.style} · {currentMix.country}
                      <span className="hidden sm:inline"> · {currentMix.year} · {currentMix.bpm} BPM</span>
                    </p>
                  </>
                )}
                {/* Progress bar */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                  <span className="w-8 text-right tabular-nums hidden sm:inline">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1 bg-zinc-800/80 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                    <div className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}aa, #8b5cf6aa)` }} />
                  </div>
                  <span className="w-8 tabular-nums hidden sm:inline">{formatTime(duration)}</span>
                  <span className="text-[9px] tabular-nums sm:hidden">{formatTime(currentTime)}</span>
                </div>
              </div>

              {/* === CONTROLS === */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Shuffle */}
                <button
                  onClick={onToggleShuffle}
                  className={`w-8 h-8 rounded-full hidden sm:inline-flex items-center justify-center transition-all ${
                    shuffle ? 'bg-indigo-500/15 text-indigo-400' : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                  aria-label="Modo aleatorio"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                </button>

                {/* Prev */}
                <button
                  onClick={onPrev}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800/60 hover:bg-zinc-700/70 text-zinc-400 hover:text-white inline-flex items-center justify-center transition-all active:scale-95"
                  aria-label="Pista anterior"
                >
                  <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Play/Pause */}
                <button
                  onClick={onPlayPause}
                  className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-white text-zinc-900 inline-flex items-center justify-center hover:bg-zinc-100 active:scale-95 transition-all shadow-xl shadow-white/10"
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px] ml-[2px]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={onNext}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800/60 hover:bg-zinc-700/70 text-zinc-400 hover:text-white inline-flex items-center justify-center transition-all active:scale-95"
                  aria-label="Siguiente pista"
                >
                  <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>

                {/* Volume — solo desktop */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className="w-9 h-9 rounded-full text-zinc-500 hover:text-zinc-300 inline-flex items-center justify-center transition-colors"
                    aria-label="Volumen"
                  >
                    {volume === 0 ? (
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        {volume >= 50 && <path strokeLinecap="round" strokeLinejoin="round" d="M17.95 5.05a10 10 0 010 13.9" />}
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072" />
                      </svg>
                    )}
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-zinc-800/95 backdrop-blur-xl border border-zinc-700/40 rounded-xl p-3 shadow-2xl min-w-[140px]">
                      <input type="range" min="0" max="100" value={volume} onChange={handleVolumeChange}
                        aria-label="Volumen" className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 cursor-pointer" />
                      <div className="text-[10px] text-zinc-500 text-center mt-1.5 font-mono">{volume}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
