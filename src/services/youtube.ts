const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const SEARCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

// Cache de búsquedas para evitar llamadas repetidas.
// Los fallos (null) se guardan con TTL para reintentar tras 5 min.
const searchCache = new Map<string, string | null>();
const failTTL = new Map<string, number>();
const FAIL_TTL_MS = 5 * 60 * 1000;

class YouTubeError extends Error {
  constructor(
    message: string,
    public code: 'AUTH' | 'QUOTA' | 'NETWORK' | 'NOT_FOUND' | 'UNKNOWN',
    public status?: number
  ) {
    super(message);
    this.name = 'YouTubeError';
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = SEARCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error instanceof YouTubeError && error.code === 'AUTH') throw error;
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 4000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Busca un video en YouTube usando una API Key.
 * Incluye caché en memoria para evitar búsquedas duplicadas.
 */
export async function searchVideoWithKey(query: string, apiKey: string): Promise<string | null> {
  const cacheKey = query.toLowerCase().trim();

  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (cached !== null) return cached;
    // Si es un fallo cacheado, comprobar TTL
    const expiry = failTTL.get(cacheKey) ?? 0;
    if (Date.now() < expiry) return null;
    // TTL expirado, reintentar
    searchCache.delete(cacheKey);
    failTTL.delete(cacheKey);
  }

  return withRetry(async () => {
    try {
      // Sin videoCategoryId para no filtrar videos musicales válidos; maxResults=3 para mejor selección
      const url = `${YOUTUBE_API_BASE}/search?part=id,snippet&q=${encodeURIComponent(query)}&maxResults=3&type=video&key=${apiKey}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new YouTubeError('Clave de API inválida o sin permisos.', 'AUTH', response.status);
        }
        if (isRetryable(response.status)) {
          throw new YouTubeError(`Error ${response.status}`, 'QUOTA', response.status);
        }
        searchCache.set(cacheKey, null);
        failTTL.set(cacheKey, Date.now() + FAIL_TTL_MS);
        return null;
      }

      const data = await response.json();
      const items = data.items ?? [];

      // Seleccionar el mejor resultado: priorizar los que contengan palabras del query en el título
      // y términos de calidad (official, audio, high quality)
      const queryWords = query.toLowerCase().split(/[\s\-–]+/).filter(w => w.length > 2);
      const qualityTerms = ['official', 'audio', 'high quality', 'hq', 'remastered', 'video oficial'];
      
      let bestId: string | null = null;
      let bestScore = -1;

      for (const item of items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;

        const title = (item.snippet?.title ?? '').toLowerCase();
        const channelTitle = (item.snippet?.channelTitle ?? '').toLowerCase();
        
        // Puntuación base por coincidencia de palabras del query
        let score = queryWords.reduce((s: number, w: string) => s + (title.includes(w) ? 2 : 0), 0);
        
        // Bonus por términos de calidad
        score += qualityTerms.reduce((s: number, w: string) => s + (title.includes(w) ? 1 : 0), 0);
        
        // Bonus por canales que suelen ser oficiales o de alta calidad
        if (channelTitle.includes('topic') || channelTitle.includes('official') || channelTitle.includes('vevo')) {
          score += 2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestId = videoId;
        }
      }

      // Si ninguno coincide, tomar el primero disponible
      if (!bestId && items.length > 0) {
        bestId = items[0].id?.videoId ?? null;
      }

      if (bestId) {
        searchCache.set(cacheKey, bestId);
      } else {
        searchCache.set(cacheKey, null);
        failTTL.set(cacheKey, Date.now() + FAIL_TTL_MS);
      }
      return bestId;
    } catch (error: any) {
      if (error instanceof YouTubeError) throw error;
      if (error.name === 'AbortError') {
        throw new YouTubeError('Timeout en la búsqueda.', 'NETWORK');
      }
      throw new YouTubeError(error.message || 'Error de red.', 'NETWORK');
    }
  }, MAX_RETRIES);
}

/**
 * Busca videos en lote con concurrencia limitada.
 */
export async function batchSearchVideos(
  queries: { index: number; query: string }[],
  apiKey: string,
  concurrency = 3
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const queue = [...queries];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        const videoId = await searchVideoWithKey(item.query, apiKey);
        if (videoId) results.set(item.index, videoId);
      } catch {
        // Continuar con el siguiente
      }
      // Rate limiting entre búsquedas
      await new Promise(r => setTimeout(r, 100));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.allSettled(workers);
  return results;
}

/**
 * Obtiene un access token de Google usando OAuth 2.0.
 */
export function getGoogleAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services no está cargado. Recarga la página.'));
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
          reject(new Error('No se obtuvo token de acceso.'));
        }
      },
      error_callback: (error: any) => {
        reject(new Error(error.message || 'Error en la autenticación de Google.'));
      },
    });

    tokenClient.requestAccessToken();
  });
}

/**
 * Crea una playlist privada en YouTube.
 */
export async function createYouTubePlaylist(
  accessToken: string,
  title: string,
  description: string
): Promise<string> {
  const response = await fetchWithTimeout(
    `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: { title, description },
        status: { privacyStatus: 'private' },
      }),
    },
    15_000
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error creando la playlist.');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Añade un video a una playlist de YouTube.
 */
export async function addVideoToPlaylist(
  accessToken: string,
  playlistId: string,
  videoId: string
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId },
          },
        }),
      },
      15_000
    );

    return response.ok;
  } catch {
    return false;
  }
}

/** Limpia la caché de búsquedas */
export function clearSearchCache() {
  searchCache.clear();
  failTTL.clear();
}
