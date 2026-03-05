import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { MusicMix, PlaybackStatus } from "@/types";
import { getAudioUrl } from "@/services/audioProxy";
import {
  batchSearchVideos,
  searchVideo,
  searchVideoWithApiKey,
  searchVideoWithToken,
  getGoogleAccessToken,
  isQuotaExhausted,
  YouTubeError,
} from "@/services/youtube";

interface UsePlayerOptions {
  allMixes: MusicMix[];
  visibleMixes: MusicMix[];
  googleClientId: string;
  youtubeApiKey: string;
  onMixesUpdate: (updater: (prev: MusicMix[]) => MusicMix[]) => void;
  notify: (
    msg: string,
    type?: "info" | "success" | "error" | "loading",
    duration?: number,
  ) => string;
  update: (
    id: string,
    msg: string,
    type?: "info" | "success" | "error" | "loading",
    duration?: number,
  ) => void;
  openSettings: () => void;
}

const FOREGROUND_PREFETCH_LIMIT = 10;
const QUEUE_PREFETCH_LIMIT = 4;
const AUDIO_WARM_LIMIT = 2;
const MAX_PREFETCH_PER_SESSION = 8;
const PREFETCH_DELAY_MS = 1_200;

export function usePlayer({
  allMixes,
  visibleMixes,
  googleClientId,
  youtubeApiKey,
  onMixesUpdate,
  notify,
  update,
  openSettings,
}: UsePlayerOptions) {
  const [currentMixId, setCurrentMixId] = useState<string | null>(null);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const prefetchSeenRef = useRef(new Set<string>());
  const prefetchCountRef = useRef(0);
  const requestIdRef = useRef(0);
  const currentMixIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const allMixesRef = useRef(allMixes);

  useEffect(() => {
    currentMixIdRef.current = currentMixId;
  }, [currentMixId]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    allMixesRef.current = allMixes;
  }, [allMixes]);

  const currentMix = useMemo(
    () => (currentMixId ? allMixes.find((mix) => mix.id === currentMixId) ?? null : null),
    [allMixes, currentMixId],
  );

  const currentIndex = useMemo(
    () => (currentMixId ? queueIds.findIndex((id) => id === currentMixId) : -1),
    [currentMixId, queueIds],
  );

  const nextMix = useMemo(() => {
    if (currentIndex < 0) return null;
    const nextId = queueIds[currentIndex + 1];
    return nextId ? allMixes.find((mix) => mix.id === nextId) ?? null : null;
  }, [allMixes, currentIndex, queueIds]);

  const loadingMixId = playbackStatus === "resolving" || playbackStatus === "buffering"
    ? currentMixId
    : null;

  const resolveSearchAuth = useCallback(
    async (allowInteractiveToken: boolean): Promise<{ apiKey?: string; token?: string }> => {
      if (youtubeApiKey) {
        return { apiKey: youtubeApiKey };
      }

      if (googleClientId) {
        try {
          const token = await getGoogleAccessToken(googleClientId);
          return { token };
        } catch (error) {
          if (allowInteractiveToken) {
            throw error;
          }
        }
      }

      return {};
    },
    [googleClientId, youtubeApiKey],
  );

  const resolveVideoId = useCallback(
    async (mix: MusicMix) => {
      if (youtubeApiKey) {
        return searchVideoWithApiKey(mix.searchQuery, youtubeApiKey);
      }

      if (googleClientId) {
        const token = await getGoogleAccessToken(googleClientId);
        return searchVideoWithToken(mix.searchQuery, token);
      }

      return searchVideo(mix.searchQuery, {});
    },
    [googleClientId, youtubeApiKey],
  );

  const warmAudio = useCallback(async (videoIds: string[]) => {
    await Promise.allSettled(
      videoIds.slice(0, AUDIO_WARM_LIMIT).map((videoId) => getAudioUrl(videoId)),
    );
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      setPlaybackStatus((status) => {
        if (!currentMixIdRef.current) return "idle";
        if (!next) return "paused";
        if (status === "playing") return "buffering";
        return currentMix?.videoId ? "buffering" : "resolving";
      });
      return next;
    });
  }, [currentMix?.videoId]);

  const play = useCallback(() => {
    setIsPlaying(true);
    setPlaybackStatus((status) => {
      if (!currentMixIdRef.current) return "idle";
      if (status === "playing") return "playing";
      return currentMix?.videoId ? "buffering" : "resolving";
    });
  }, [currentMix?.videoId]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    setPlaybackStatus(currentMixIdRef.current ? "paused" : "idle");
  }, []);

  const applyResolvedVideoIds = useCallback(
    (resolved: Map<string, string>) => {
      if (resolved.size === 0) return;
      onMixesUpdate((prev) =>
        prev.map((item) => {
          const videoId = resolved.get(item.id);
          return videoId ? { ...item, videoId } : item;
        }),
      );
    },
    [onMixesUpdate],
  );

  const prefetchMixes = useCallback(
    async (targetMixes: MusicMix[], limit = FOREGROUND_PREFETCH_LIMIT) => {
      const candidates = targetMixes
        .filter((mix) => !mix.videoId && !prefetchSeenRef.current.has(mix.id))
        .slice(0, limit);

      if (candidates.length === 0 || isQuotaExhausted()) return;

      candidates.forEach((mix) => prefetchSeenRef.current.add(mix.id));

      const auth = await resolveSearchAuth(false);
      const indexed = candidates.map((mix, index) => ({ index, query: mix.searchQuery }));
      const results = await batchSearchVideos(indexed, auth, 3);
      const resolved = new Map<string, string>();
      const warmTargets: string[] = [];

      results.forEach((videoId, index) => {
        const mix = candidates[index];
        if (!mix) return;
        resolved.set(mix.id, videoId);
        warmTargets.push(videoId);
      });

      applyResolvedVideoIds(resolved);
      await warmAudio(warmTargets);
    },
    [applyResolvedVideoIds, resolveSearchAuth, warmAudio],
  );

  const handleNext = useCallback(() => {
    setCurrentMixId((prevId) => {
      if (!prevId) return null;
      const prevIndex = queueIds.findIndex((id) => id === prevId);
      if (prevIndex === -1) return null;

      if (shuffle) {
        if (queueIds.length <= 1) return prevId;
        let nextIndex = prevIndex;
        while (nextIndex === prevIndex) {
          nextIndex = Math.floor(Math.random() * queueIds.length);
        }
        return queueIds[nextIndex] ?? prevId;
      }

      if (prevIndex < queueIds.length - 1) return queueIds[prevIndex + 1] ?? null;
      setIsPlaying(false);
      setPlaybackStatus("idle");
      return null;
    });
  }, [queueIds, shuffle]);

  useEffect(() => {
    if (!currentMixId) return;
    if (!allMixes.some((mix) => mix.id === currentMixId)) {
      setCurrentMixId(null);
      setIsPlaying(false);
      setPlaybackStatus("idle");
    }
  }, [allMixes, currentMixId]);

  // Cargar y reproducir la canción actual
  useEffect(() => {
    const mix = currentMix;
    if (!mix) {
      setPlaybackStatus("idle");
      return;
    }

    if (!isPlaying && !mix.videoId) {
      setPlaybackStatus("paused");
      return;
    }

    if (mix.videoId) {
      setPlaybackStatus(isPlaying ? "buffering" : "paused");
      updateMediaSession(mix);
      return;
    }

    const requestId = ++requestIdRef.current;
    setPlaybackStatus("resolving");
    const toastId = notify(`Buscando: ${mix.artist}...`, "loading");

    resolveVideoId(mix)
      .then((foundId) => {
        if (requestId !== requestIdRef.current || currentMixIdRef.current !== mix.id) return;

        if (foundId) {
          applyResolvedVideoIds(new Map([[mix.id, foundId]]));
          void getAudioUrl(foundId).catch(() => null);
          update(
            toastId,
            isPlayingRef.current ? `Cargando: ${mix.artist}` : `Lista para reproducir: ${mix.artist}`,
            "success",
            2000,
          );
          setPlaybackStatus(isPlayingRef.current ? "buffering" : "paused");
          updateMediaSession({ ...mix, videoId: foundId });
        } else {
          update(toastId, `No encontrado: ${mix.artist}`, "error");
          setPlaybackStatus("error");
          handleNext();
        }
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current || currentMixIdRef.current !== mix.id) return;
        if (err instanceof YouTubeError && err.code === "QUOTA") {
          update(toastId, "Cuota de YouTube agotada por hoy. Las búsquedas se reanudan mañana.", "error", 0);
        } else if (err instanceof YouTubeError && err.code === "AUTH") {
          update(toastId, "Faltan credenciales de YouTube o Google para esta búsqueda.", "error");
          openSettings();
        } else {
          update(toastId, "Error en búsqueda.", "error");
        }
        setIsPlaying(false);
        setPlaybackStatus("error");
      });
  }, [applyResolvedVideoIds, currentMix, handleNext, isPlaying, notify, openSettings, resolveVideoId, update]);

  useEffect(() => {
    if (currentIndex === -1) return;
    if (prefetchCountRef.current >= MAX_PREFETCH_PER_SESSION || isQuotaExhausted()) return;

    const nextQueueIds = queueIds.slice(currentIndex + 1, currentIndex + 1 + QUEUE_PREFETCH_LIMIT);
    const nextMixes = nextQueueIds
      .map((id) => allMixesRef.current.find((mix) => mix.id === id))
      .filter((mix): mix is MusicMix => Boolean(mix && !mix.videoId));
    if (nextMixes.length === 0) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (prefetchCountRef.current >= MAX_PREFETCH_PER_SESSION || isQuotaExhausted()) return;

      prefetchCountRef.current += nextMixes.length;
      prefetchMixes(nextMixes, nextMixes.length)
        .catch(() => console.warn("[Prefetch] Falló búsqueda silenciosa"));
    }, PREFETCH_DELAY_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentIndex, prefetchMixes, queueIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = useCallback(() => {
    setCurrentMixId((prevId) => {
      if (!prevId) return null;
      const prevIndex = queueIds.findIndex((id) => id === prevId);
      if (prevIndex > 0) return queueIds[prevIndex - 1] ?? prevId;
      return prevId;
    });
  }, [queueIds]);

  const handlePlayCard = useCallback(
    (mix: MusicMix) => {
      const nextQueueIds = visibleMixes.map((item) => item.id);
      if (mix.id === currentMixId) {
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else {
        setQueueIds(nextQueueIds);
        setCurrentMixId(mix.id);
        setIsPlaying(true);
        setPlaybackStatus(mix.videoId ? "buffering" : "resolving");
      }
    },
    [currentMixId, isPlaying, pause, play, visibleMixes],
  );

  const handlePlayAll = useCallback(() => {
    if (visibleMixes.length > 0) {
      setQueueIds(visibleMixes.map((mix) => mix.id));
      setCurrentMixId(visibleMixes[0].id);
      setIsPlaying(true);
      setPlaybackStatus(visibleMixes[0].videoId ? "buffering" : "resolving");
    }
  }, [visibleMixes]);

  const reset = useCallback(() => {
    setCurrentMixId(null);
    setQueueIds([]);
    setIsPlaying(false);
    setPlaybackStatus("idle");
    requestIdRef.current += 1;
    prefetchCountRef.current = 0;
    prefetchSeenRef.current.clear();
  }, []);

  return {
    currentMixId,
    currentIndex,
    queueLength: queueIds.length,
    currentMix,
    nextMix,
    isPlaying,
    play,
    pause,
    togglePlayback,
    shuffle,
    setShuffle,
    playbackStatus,
    setPlaybackStatus,
    loadingMixId,
    handleNext,
    handlePrev,
    handlePlayCard,
    handlePlayAll,
    prefetchMixes,
    reset,
  };
}

function updateMediaSession(mix: MusicMix) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: mix.artist,
    artist: mix.style,
    album: mix.country,
    artwork: mix.videoId
      ? [
        {
          src: `https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`,
          sizes: "320x180",
          type: "image/jpeg",
        },
      ]
      : [],
  });
}
