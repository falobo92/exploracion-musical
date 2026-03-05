import { useState, useCallback } from 'react';
import type { MusicMix } from '@/types';
import {
  searchVideoWithToken,
  getGoogleAccessToken,
  createYouTubePlaylist,
  addVideoToPlaylist,
  isQuotaExhausted,
  YouTubeError,
} from '@/services/youtube';

interface UsePlaylistOptions {
  visibleMixes: MusicMix[];

  googleClientId: string;
  setMixes: (updater: (prev: MusicMix[]) => MusicMix[]) => void;
  notify: (msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => string;
  update: (id: string, msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => void;
  openSettings: () => void;
}

export function usePlaylist({
  visibleMixes,

  googleClientId,
  setMixes,
  notify,
  update,
  openSettings,
}: UsePlaylistOptions) {
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(async () => {
    if (!googleClientId) {
      notify('Configura tu Google Client ID en Ajustes para crear playlists.', 'error');
      openSettings();
      return;
    }

    if (visibleMixes.length === 0) {
      notify('No hay mixes para guardar.', 'error');
      return;
    }

    setIsSaving(true);
    const toastId = notify('Autenticando con Google...', 'loading');

    try {
      const accessToken = await getGoogleAccessToken(googleClientId);

      const resolvedVideoIds = new Map<string, string>();
      const selectedMixes = visibleMixes.map((mix) => ({ ...mix }));

      for (let i = 0; i < selectedMixes.length; i++) {
        if (!selectedMixes[i].videoId) {
          if (isQuotaExhausted()) break;
          update(toastId, `Buscando videos... (${i + 1}/${selectedMixes.length})`, 'loading');
          const foundId = await searchVideoWithToken(selectedMixes[i].searchQuery, accessToken);
          if (foundId) {
            selectedMixes[i] = { ...selectedMixes[i], videoId: foundId };
            resolvedVideoIds.set(selectedMixes[i].id, foundId);
          }
          await new Promise(r => setTimeout(r, 150));
        }
      }

      if (resolvedVideoIds.size > 0) {
        setMixes((prev) =>
          prev.map((mix) => {
            const videoId = resolvedVideoIds.get(mix.id);
            return videoId ? { ...mix, videoId } : mix;
          }),
        );
      }

      const mixesWithVideo = selectedMixes.filter(m => m.videoId);
      if (mixesWithVideo.length === 0) {
        update(toastId, 'No se encontraron videos para la playlist.', 'error');
        return;
      }

      update(toastId, 'Creando playlist en YouTube...', 'loading');
      const title = `Atlas Sónico — ${new Date().toLocaleDateString('es-ES')}`;
      const desc = `Playlist generada por Atlas Sónico con ${mixesWithVideo.length} descubrimientos musicales del mundo.`;
      const playlistId = await createYouTubePlaylist(accessToken, title, desc);

      let addedCount = 0;
      for (let i = 0; i < mixesWithVideo.length; i++) {
        update(toastId, `Añadiendo a playlist... (${i + 1}/${mixesWithVideo.length})`, 'loading');
        const ok = await addVideoToPlaylist(accessToken, playlistId, mixesWithVideo[i].videoId!);
        if (ok) addedCount++;
        await new Promise(r => setTimeout(r, 200));
      }

      update(toastId, `Playlist creada con ${addedCount} videos`, 'success');
      window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      if (error instanceof YouTubeError && error.code === "QUOTA") {
        update(toastId, 'Cuota de YouTube agotada por hoy. Las búsquedas se reanudan mañana.', 'error', 0);
      } else {
        update(toastId, error.message || 'No se pudo crear la playlist.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }, [visibleMixes, googleClientId, setMixes, notify, update, openSettings]);

  return { isSaving, save };
}
