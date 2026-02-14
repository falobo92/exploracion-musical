import { useState, useCallback } from 'react';
import type { MusicMix } from '@/types';
import {
  searchVideoWithKey,
  getGoogleAccessToken,
  createYouTubePlaylist,
  addVideoToPlaylist,
} from '@/services/youtube';

interface UsePlaylistOptions {
  mixes: MusicMix[];
  googleKey: string;
  googleClientId: string;
  setMixes: (updater: (prev: MusicMix[]) => MusicMix[]) => void;
  notify: (msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => string;
  update: (id: string, msg: string, type?: 'info' | 'success' | 'error' | 'loading', duration?: number) => void;
  openSettings: () => void;
}

export function usePlaylist({
  mixes,
  googleKey,
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

    if (mixes.length === 0) {
      notify('No hay mixes para guardar.', 'error');
      return;
    }

    setIsSaving(true);
    const toastId = notify('Autenticando con Google...', 'loading');

    try {
      const accessToken = await getGoogleAccessToken(googleClientId);

      // Buscar videos que faltan
      const updatedMixes = [...mixes];
      if (googleKey) {
        for (let i = 0; i < updatedMixes.length; i++) {
          if (!updatedMixes[i].videoId) {
            update(toastId, `Buscando videos... (${i + 1}/${updatedMixes.length})`, 'loading');
            const foundId = await searchVideoWithKey(updatedMixes[i].searchQuery, googleKey);
            if (foundId) {
              updatedMixes[i] = { ...updatedMixes[i], videoId: foundId };
            }
            await new Promise(r => setTimeout(r, 150));
          }
        }
        setMixes(() => updatedMixes);
      }

      const mixesWithVideo = updatedMixes.filter(m => m.videoId);
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
      update(toastId, error.message || 'No se pudo crear la playlist.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [mixes, googleKey, googleClientId, setMixes, notify, update, openSettings]);

  return { isSaving, save };
}
