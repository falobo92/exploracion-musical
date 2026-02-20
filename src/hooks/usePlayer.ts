import { useState, useCallback, useEffect, useRef } from "react";
import type { MusicMix } from "@/types";
import { searchVideoWithToken, getGoogleAccessToken, isQuotaExhausted, YouTubeError } from "@/services/youtube";

interface UsePlayerOptions {
  mixes: MusicMix[];
  googleClientId: string;
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

export function usePlayer({
  mixes,
  googleClientId,
  onMixesUpdate,
  notify,
  update,
  openSettings,
}: UsePlayerOptions) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const currentMix = currentIndex >= 0 ? (mixes[currentIndex] ?? null) : null;

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (shuffle) {
        if (mixes.length <= 1) return prev;
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * mixes.length);
        }
        return next;
      }
      if (prev < mixes.length - 1) return prev + 1;
      setIsPlaying(false);
      return -1;
    });
  }, [mixes.length, shuffle]);

  // Cargar y reproducir la canción actual
  useEffect(() => {
    if (currentIndex === -1) return;
    const mix = mixes[currentIndex];
    if (!mix) return;

    if (mix.videoId) {
      setIsPlaying(true);
      updateMediaSession(mix);
      return;
    }

    if (!googleClientId) {
      notify("Falta configurar tu Google Client ID.", "error");
      openSettings();
      setIsPlaying(false);
      return;
    }

    const toastId = notify(`Buscando: ${mix.artist}...`, "loading");

    getGoogleAccessToken(googleClientId)
      .then((token) => searchVideoWithToken(mix.searchQuery, token))
      .then((foundId) => {
        if (foundId) {
          onMixesUpdate((prev) =>
            prev.map((m, i) =>
              i === currentIndex ? { ...m, videoId: foundId } : m,
            ),
          );
          update(toastId, `Reproduciendo: ${mix.artist}`, "success", 2000);
          setIsPlaying(true);
          updateMediaSession(mix);
        } else {
          update(toastId, `No encontrado: ${mix.artist}`, "error");
          handleNext();
        }
      })
      .catch((err) => {
        if (err instanceof YouTubeError && err.code === "QUOTA") {
          update(toastId, "Cuota de YouTube agotada por hoy. Las búsquedas se reanudan mañana.", "error", 0);
        } else {
          update(toastId, "Error en búsqueda.", "error");
        }
        setIsPlaying(false);
      });
  }, [currentIndex, googleClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const prefetchCount = useRef(0);
  const mixesRef = useRef(mixes);
  useEffect(() => { mixesRef.current = mixes; }, [mixes]);

  const MAX_PREFETCH_PER_SESSION = 5;
  const PREFETCH_DELAY_MS = 3_000;

  useEffect(() => {
    if (currentIndex === -1 || !googleClientId) return;
    if (prefetchCount.current >= MAX_PREFETCH_PER_SESSION || isQuotaExhausted()) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= mixesRef.current.length) return;
    const nextMix = mixesRef.current[nextIndex];
    if (!nextMix || nextMix.videoId) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (prefetchCount.current >= MAX_PREFETCH_PER_SESSION || isQuotaExhausted()) return;

      prefetchCount.current++;
      console.log(`[Prefetch ${prefetchCount.current}/${MAX_PREFETCH_PER_SESSION}] ${nextMix.artist}`);

      getGoogleAccessToken(googleClientId)
        .then((token) => searchVideoWithToken(nextMix.searchQuery, token))
        .then((foundId) => {
          if (cancelled || !foundId) return;
          onMixesUpdate((prev) =>
            prev.map((m, i) =>
              i === nextIndex ? { ...m, videoId: foundId } : m,
            ),
          );
        })
        .catch(() => console.warn("[Prefetch] Falló búsqueda silenciosa"));
    }, PREFETCH_DELAY_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentIndex, googleClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handlePlayCard = useCallback(
    (mix: MusicMix) => {
      const index = mixes.findIndex((m) => m.id === mix.id);
      if (index === currentIndex) {
        setIsPlaying((p) => !p);
      } else {
        setCurrentIndex(index);
      }
    },
    [mixes, currentIndex],
  );

  const handlePlayAll = useCallback(() => {
    if (mixes.length > 0) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [mixes.length]);

  const reset = useCallback(() => {
    setCurrentIndex(-1);
    setIsPlaying(false);
  }, []);

  return {
    currentIndex,
    currentMix,
    isPlaying,
    setIsPlaying,
    shuffle,
    setShuffle,
    handleNext,
    handlePrev,
    handlePlayCard,
    handlePlayAll,
    reset,
  };
}

function updateMediaSession(mix: MusicMix) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: mix.artist,
    artist: mix.style,
    album: mix.country,
    artwork: [
      {
        src: `https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`,
        sizes: "320x180",
        type: "image/jpeg",
      },
    ],
  });
}
