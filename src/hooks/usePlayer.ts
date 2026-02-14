import { useState, useCallback, useEffect, useRef } from 'react';
import type { MusicMix } from '@/types';
import { searchVideoWithKey } from '@/services/youtube';

interface UsePlayerOptions {
  mixes: MusicMix[];
  googleKey: string;
  onMixesUpdate: (updater: (prev: MusicMix[]) => MusicMix[]) => void;
  notify: (msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => string;
  update: (id: string, msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => void;
  openSettings: () => void;
}

export function usePlayer({ mixes, googleKey, onMixesUpdate, notify, update, openSettings }: UsePlayerOptions) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const currentMix = currentIndex >= 0 ? mixes[currentIndex] ?? null : null;

  // Buscar video cuando cambia el track actual
  useEffect(() => {
    if (currentIndex === -1) return;
    const mix = mixes[currentIndex];
    if (!mix) return;

    if (mix.videoId) {
      setIsPlaying(true);
      updateMediaSession(mix);
      return;
    }

    if (!googleKey) {
      notify('Configura tu clave de Google en Ajustes para reproducir.', 'error');
      openSettings();
      setIsPlaying(false);
      return;
    }

    const toastId = notify(`Buscando: ${mix.artist}...`, 'loading');

    searchVideoWithKey(mix.searchQuery, googleKey)
      .then(foundId => {
        if (foundId) {
          onMixesUpdate(prev =>
            prev.map((m, i) => (i === currentIndex ? { ...m, videoId: foundId } : m))
          );
          update(toastId, `${mix.artist} — ${mix.style}`, 'success', 2000);
          setIsPlaying(true);
          updateMediaSession(mix);
        } else {
          update(toastId, `No se encontró video para ${mix.artist}`, 'error');
          handleNext();
        }
      })
      .catch(() => {
        update(toastId, 'Error buscando video. Verifica tu clave API.', 'error');
        setIsPlaying(false);
      });
  }, [currentIndex, googleKey]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => {
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

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handlePlayCard = useCallback(
    (mix: MusicMix) => {
      const index = mixes.findIndex(m => m.id === mix.id);
      if (index === currentIndex) {
        setIsPlaying(p => !p);
      } else {
        setCurrentIndex(index);
      }
    },
    [mixes, currentIndex]
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

// Media Session API para controles en lock screen / notificaciones
function updateMediaSession(mix: MusicMix) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: mix.artist,
    artist: `${mix.style} — ${mix.country}`,
    album: 'Atlas Sónico',
    artwork: [
      {
        src: `https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`,
        sizes: '320x180',
        type: 'image/jpeg',
      },
    ],
  });
}
