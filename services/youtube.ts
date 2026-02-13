const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Busca un video en YouTube usando una API Key (sin OAuth).
 * Usa YouTube Data API v3 — requiere tener habilitada "YouTube Data API v3"
 * en el proyecto de Google Cloud.
 */
export const searchVideoWithKey = async (query: string, apiKey: string): Promise<string | null> => {
  try {
    const url = `${YOUTUBE_API_BASE}/search?part=id&q=${encodeURIComponent(query)}&maxResults=1&type=video&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("YouTube Search Error:", response.status, err);
      return null;
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    return null;
  } catch (error) {
    console.error("YouTube search exception:", error);
    return null;
  }
};

/**
 * Obtiene un access token de Google usando OAuth 2.0 (Google Identity Services).
 * Abre un popup de consentimiento si es necesario.
 */
export const getGoogleAccessToken = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services no está cargado. Recarga la página."));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error("No se obtuvo token de acceso."));
        }
      },
      error_callback: (error: any) => {
        reject(new Error(error.message || "Error en la autenticación de Google."));
      },
    });

    tokenClient.requestAccessToken();
  });
};

/**
 * Crea una playlist privada en YouTube.
 * Retorna el ID de la playlist creada.
 */
export const createYouTubePlaylist = async (
  accessToken: string,
  title: string,
  description: string
): Promise<string> => {
  const response = await fetch(`${YOUTUBE_API_BASE}/playlists?part=snippet,status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus: 'private' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("YouTube Create Playlist Error:", err);
    throw new Error(err.error?.message || "Error creando la playlist.");
  }

  const data = await response.json();
  return data.id;
};

/**
 * Añade un video a una playlist de YouTube.
 */
export const addVideoToPlaylist = async (
  accessToken: string,
  playlistId: string,
  videoId: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${YOUTUBE_API_BASE}/playlistItems?part=snippet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("YouTube Add to Playlist Error:", err);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    return false;
  }
};
