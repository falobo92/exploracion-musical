import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MusicMix, PlaybackStatus } from '@/types';
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
  nextMix: MusicMix | null;
  shuffle: boolean;
  onToggleShuffle: () => void;
  playbackStatus: PlaybackStatus;
  onPlaybackStateChange: (status: PlaybackStatus) => void;
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
  nextMix,
  shuffle,
  onToggleShuffle,
  playbackStatus,
  onPlaybackStateChange,
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
  const [showVideo, setShowVideo] = useState(false); // Nuevo estado para controlar visibilidad del video
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioRetryToken, setAudioRetryToken] = useState(0);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const audioRetryCountRef = useRef(0);

  // === Derived: ¿usar audio nativo o YouTube iframe? ===
  const useNativeAudio = !!audioSrc && !audioFailed;
  const isResolving = playbackStatus === 'resolving';
  const isBuffering = playbackStatus === 'buffering';
  const hasPlaybackError = playbackStatus === 'error';
  const statusLabel = isResolving
    ? 'Buscando fuente'
    : isBuffering
      ? 'Cargando audio'
      : hasPlaybackError
        ? 'Error de carga'
        : isPlaying
          ? 'Sonando'
          : 'En pausa';
  const sourceLabel = isResolving || isBuffering
    ? 'Preparando'
    : useNativeAudio
      ? 'Audio directo'
      : videoId
        ? 'Fallback YouTube'
        : 'Sin fuente';
  const nextTrackLabel = nextMix
    ? `${nextMix.artist}${nextMix.songTitle ? ` · ${nextMix.songTitle}` : ''}`
    : 'Fin de la cola';

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
            console.log(`[Player] Falló audio proxy para ${videoId}, reintentando ${audioRetryCountRef.current}...`);
            retryTimeout = setTimeout(() => {
              setAudioRetryToken(t => t + 1);
            }, 450);
          } else {
            console.warn(`[Player] Audio proxy falló permanentemente para ${videoId}. Usando YT como fallback.`);
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
    if (isPlayingRef.current) {
      onPlaybackStateChange('buffering');
      audioRef.current.play().catch(() => {
        setAudioFailed(true);
        onPlaybackStateChange('error');
      });
    } else {
      onPlaybackStateChange('paused');
    }
  }, [onPlaybackStateChange, volume]);

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
            enablejsapi: 1,
            widget_referrer: window.location.origin,
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
              onPlaybackStateChange('playing');
            }
            if (event.data === window.YT.PlayerState.PAUSED) {
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
              onPlaybackStateChange('paused');
            }
            if (event.data === window.YT.PlayerState.BUFFERING) {
              onPlaybackStateChange('buffering');
            }
          },
          onError: () => {
            onPlaybackStateChange('error');
            setTimeout(() => onVideoEndRef.current(), 1000);
          },
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
      console.log(`[Player] Cargando video en YT IFrame: ${videoId}`);
      try {
        if (isPlayingRef.current) {
          playerRef.current.loadVideoById(videoId);
        } else {
          playerRef.current.cueVideoById(videoId);
        }
        if (isPlaying) {
          onPlaybackStateChange('buffering');
          setTimeout(() => {
            if (playerRef.current && isPlayingRef.current) {
              playerRef.current.playVideo();
            }
          }, 300);
          setTimeout(() => {
            if (playerRef.current && isPlayingRef.current) {
              playerRef.current.playVideo();
            }
          }, 900);
        }
      } catch (e) {
        console.error('[Player] Error cargando video YT:', e);
      }
    }
  }, [videoId, playerReady, audioFailed, useNativeAudio, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ====================================================================
  // CONTROLES UNIFICADOS: Play/Pause, Seek, Volume
  // ====================================================================

  // Play/Pause — dirigir al player activo
  useEffect(() => {
    if (useNativeAudio) {
      if (!audioRef.current) return;
      if (isPlaying) {
        onPlaybackStateChange('buffering');
        audioRef.current.play().catch(() => {
          setAudioFailed(true);
          onPlaybackStateChange('error');
        });
      }
      else {
        audioRef.current.pause();
        onPlaybackStateChange('paused');
      }
    } else if (playerReady && playerRef.current && audioFailed) {
      try {
        const state = playerRef.current.getPlayerState?.();
        if (isPlaying) {
          if (state !== window.YT.PlayerState.PLAYING) {
            onPlaybackStateChange('buffering');
            playerRef.current.playVideo();
          }
        } else {
          if (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.BUFFERING) {
            playerRef.current.pauseVideo();
          }
        }
      } catch (e) {
        console.warn('[Player] Error enviando comando play/pause a YT:', e);
      }
    }
  }, [audioFailed, isPlaying, onPlaybackStateChange, playerReady, useNativeAudio]);

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

  useEffect(() => {
    setShowVideo(false);
    setIsDetailsOpen(false);
  }, [currentMix?.id]);

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
  const accentColor = currentMix ? getContinentStyle(currentMix.continent).markerColor : '#10b981';
  const trackPositionLabel = `${Math.max(currentIndex + 1, 1)}/${Math.max(totalTracks, 1)}`;

  return (
    <>
      {/* Elemento <audio> nativo — permite reproducción en segundo plano y pantalla bloqueada */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        preload="auto"
        autoPlay={isPlaying}
        playsInline
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoaded}
        onEnded={onVideoEnd}
        onError={handleAudioError}
        onPlay={() => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
          onPlaybackStateChange('playing');
          if (!isPlayingRef.current) onPlay();
        }}
        onPause={() => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
          onPlaybackStateChange('paused');
          if (isPlayingRef.current) onPause();
        }}
      />

      {/* El PlayerBar en sí, App.tsx se encarga de posicionarlo en fixed */}
      <div className={`w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] origin-bottom ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
      }`}>
        <div className="mx-auto w-full max-w-[1180px] rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,9,11,0.92),rgba(9,9,11,0.985))] shadow-2xl shadow-black/80 backdrop-blur-2xl">
          {/* Top progress bar */}
          <div className="relative z-10 h-1 cursor-pointer bg-white/5 transition-all group hover:h-1.5" onClick={handleSeek}>
            <div
              className="progress-glow relative h-full transition-all duration-200"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}, #14b8a6)` }}
            >
              <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform scale-100 group-hover:scale-110" />
            </div>
          </div>

          <div
            id="yt-player-wrapper"
            className={
              useNativeAudio || !showVideo
                ? 'fixed -left-[9999px] -top-[9999px] h-[180px] w-[320px] overflow-hidden pointer-events-none'
                : 'fixed left-3 right-3 top-[calc(var(--safe-top)+1rem)] z-[55] h-[200px] overflow-hidden rounded-2xl border border-zinc-700/60 shadow-2xl shadow-black/50 sm:left-auto sm:right-6 sm:top-auto sm:bottom-[calc(var(--safe-bottom)+8.5rem)] sm:h-[180px] sm:w-[320px]'
            }
          >
            <div className="relative h-full w-full bg-black">
              <div id="yt-player-element" className="h-full w-full" />
              <button
                onClick={() => setShowVideo(false)}
                aria-label="Cerrar video flotante"
                title="Cerrar video"
                className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <div className="flex items-start gap-3 sm:gap-4 lg:gap-5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 shadow-md sm:h-20 sm:w-20">
                {videoId ? (
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-6 w-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}

                {isPlaying && !isResolving && !isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex h-4 items-end gap-[2px]">
                      <div className="w-[2px] rounded-full bg-white eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
                      <div className="w-[2px] rounded-full bg-white eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
                      <div className="w-[2px] rounded-full bg-white eq-bar" style={{ '--eq-duration': '0.45s', '--eq-delay': '0.2s' } as React.CSSProperties} />
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {currentMix && (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="hidden h-1.5 w-1.5 rounded-full sm:block"
                            style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
                          />
                          <h4 className="truncate text-[13px] font-semibold text-white sm:text-base">
                            {currentMix.artist}
                          </h4>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-zinc-400 sm:text-sm">
                          {currentMix.songTitle || `${currentMix.style} · ${currentMix.country}`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                          {trackPositionLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDetailsOpen((prev) => !prev)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-400 transition-colors hover:text-white sm:hidden"
                          aria-label={isDetailsOpen ? 'Ocultar detalles del reproductor' : 'Mostrar detalles del reproductor'}
                        >
                          <svg className={`h-4 w-4 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${
                        hasPlaybackError
                          ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                          : isResolving || isBuffering
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                            : useNativeAudio
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                      }`}>
                        {statusLabel}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${
                        useNativeAudio
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                          : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                      }`}>
                        {sourceLabel}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                        {currentMix.style}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                        {currentMix.country}
                      </span>
                    </div>

                    <div className="mt-3 hidden items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 sm:flex">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          Siguiente en cola
                        </p>
                        <p className="mt-1 truncate text-[12px] text-zinc-300">
                          {nextTrackLabel}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          Estado
                        </p>
                        <p className="mt-1 text-[12px] text-zinc-300">
                          {statusLabel}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  <span className="hidden w-10 text-right tabular-nums sm:inline">{formatTime(currentTime)}</span>
                  <div className="h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/10 shadow-inner" onClick={handleSeek}>
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}dd, #14b8a6dd)` }}
                    />
                  </div>
                  <span className="hidden w-10 tabular-nums sm:inline">{formatTime(duration)}</span>
                  <span className="text-[9px] tabular-nums sm:hidden">{formatTime(currentTime)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 sm:hidden">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onPrev}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 transition-all hover:bg-zinc-700/70 hover:text-white active:scale-95"
                      aria-label="Pista anterior"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>
                    <button
                      onClick={onPlayPause}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl shadow-white/10 transition-all hover:bg-zinc-100 active:scale-95"
                      aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {isPlaying ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="ml-[1px] h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={onNext}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 transition-all hover:bg-zinc-700/70 hover:text-white active:scale-95"
                      aria-label="Siguiente pista"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>

                  <span className="text-[10px] font-semibold text-zinc-500">
                    {currentMix?.bpm} BPM
                  </span>
                </div>

                {isDetailsOpen && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
                    <button
                      onClick={onToggleShuffle}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        shuffle ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200' : 'border-white/8 bg-white/5 text-zinc-400'
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                      </svg>
                      Shuffle
                    </button>

                    {!useNativeAudio && videoId && (
                      <button
                        onClick={() => setShowVideo(true)}
                        className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300"
                        type="button"
                      >
                        Ver video
                      </button>
                    )}

                    {currentMix?.videoId && (
                      <a
                        href={`https://music.youtube.com/watch?v=${currentMix.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400"
                        title="Escuchar en YouTube Music"
                      >
                        YT Music
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex lg:gap-2.5">
                <button
                  onClick={onToggleShuffle}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all lg:h-11 lg:w-11 ${
                    shuffle ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                  aria-label="Modo aleatorio"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                </button>

                <button
                  onClick={onPrev}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 transition-all hover:bg-zinc-700/70 hover:text-white active:scale-95 lg:h-11 lg:w-11"
                  aria-label="Pista anterior"
                >
                  <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  onClick={onPlayPause}
                  className={`inline-flex h-[54px] w-[54px] items-center justify-center rounded-full shadow-xl transition-all active:scale-95 lg:h-[58px] lg:w-[58px] ${
                    isResolving || isBuffering
                      ? 'bg-amber-300 text-zinc-950 shadow-amber-500/15'
                      : 'bg-white text-zinc-900 shadow-white/10 hover:bg-zinc-100'
                  }`}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isResolving || isBuffering ? (
                    <svg className="h-[20px] w-[20px] animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v3m0 10v3m8-8h-3M7 12H4m13.657-5.657l-2.121 2.121M8.464 15.536l-2.121 2.121m0-11.314l2.121 2.121m7.072 7.072l2.121 2.121" />
                    </svg>
                  ) : isPlaying ? (
                    <svg className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="ml-[2px] h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={onNext}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 transition-all hover:bg-zinc-700/70 hover:text-white active:scale-95"
                  aria-label="Siguiente pista"
                >
                  <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>

                {!useNativeAudio && videoId && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:bg-white/10"
                    type="button"
                  >
                    Ver video
                  </button>
                )}

                <div className="flex items-center gap-1.5 rounded-full border border-white/6 bg-white/[0.03] px-2 py-1.5">
                  <button
                    onClick={() => {
                      const newVol = volume === 0 ? 80 : 0;
                      setVolume(newVol);
                      if (audioRef.current) audioRef.current.volume = newVol / 100;
                      playerRef.current?.setVolume?.(newVol);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label="Volumen"
                  >
                    {volume === 0 ? (
                      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        {volume >= 50 && <path strokeLinecap="round" strokeLinejoin="round" d="M17.95 5.05a10 10 0 010 13.9" />}
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    aria-label="Volumen"
                    className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
