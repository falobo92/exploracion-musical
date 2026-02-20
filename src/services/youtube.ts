import type { GoogleTokenResponse } from "@/types";

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

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Busca un video en YouTube usando un token de OAuth.
 * Incluye caché en memoria para evitar búsquedas duplicadas.
 */
export async function searchVideoWithToken(query: string, accessToken: string): Promise<string | null> {
  const cacheKey = query.toLowerCase().trim();

  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
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
      // Se optimiza el query para encontrar el audio oficial
      const finalQuery = `${query}`; // El query ya viene formateado desde Gemini como "Artist - Title (Official Audio)"
      const url = `${YOUTUBE_API_BASE}/search?part=id,snippet&q=${encodeURIComponent(finalQuery)}&maxResults=5&type=video&videoEmbeddable=true`;
      const response = await fetchWithTimeout(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

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
      const queryWords = query.toLowerCase().replace(/\(official audio\)/g, '').split(/[\s\-–]+/).filter(w => w.length > 2);
      const qualityTerms = ['official', 'audio', 'video oficial', 'lyric', 'topic'];
      const negativeTerms = ['reaction', 'review', 'cover', 'tutorial', 'karaoke', 'instrumental', 'remix'];
      
      let bestId: string | null = null;
      let bestScore = -100;

      for (const item of items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;

        const title = (item.snippet?.title ?? '').toLowerCase();
        const channelTitle = (item.snippet?.channelTitle ?? '').toLowerCase();
        const description = (item.snippet?.description ?? '').toLowerCase();
        
        // Puntuación base por coincidencia de palabras del query
        let score = queryWords.reduce((s: number, w: string) => s + (title.includes(w) ? 3 : 0), 0);
        
        // Bonus por términos de calidad
        score += qualityTerms.reduce((s: number, w: string) => s + (title.includes(w) ? 2 : 0), 0);
        
        // Penalización fuerte por términos negativos (a menos que estén en el query original)
        const isCoverRequested = query.toLowerCase().includes('cover');
        const isRemixRequested = query.toLowerCase().includes('remix');

        if (!isCoverRequested) {
            score -= negativeTerms.reduce((s: number, w: string) => s + (title.includes(w) ? 5 : 0), 0);
        }
        if (!isRemixRequested && title.includes('remix')) {
             score -= 3;
        }

        // Bonus por canales que suelen ser oficiales o de alta calidad
        if (channelTitle.includes('topic') || channelTitle.includes('official') || channelTitle.includes('vevo')) {
          score += 4;
        }
        
        // Preferir videos que NO sean muy cortos (shorts/previews) ni muy largos (full albums)
        // Nota: La API de search no devuelve duración, así que confiamos en título/descripción
        if (title.includes('full album') || title.includes('completo')) score -= 2;
        if (title.includes('preview') || title.includes('teaser')) score -= 5;

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
  accessToken: string,
  concurrency = 3
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const queue = [...queries];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      try {
        const videoId = await searchVideoWithToken(item.query, accessToken);
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
 * Utiliza un caché en memoria validando la expiración.
 */
export async function getGoogleAccessToken(clientId: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services no está cargado. Recarga la página.'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube',
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else if (response.access_token) {
          cachedAccessToken = response.access_token;
          const expiresIn = response.expires_in ? Number(response.expires_in) : 3599;
          tokenExpiryTime = Date.now() + (expiresIn - 300) * 1000; // 5 minutos de margen
          resolve(response.access_token);
        } else {
          reject(new Error('No se obtuvo token de acceso.'));
        }
      },
      error_callback: (error: { message?: string }) => {
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
  cachedAccessToken = null;
  tokenExpiryTime = 0;
}
