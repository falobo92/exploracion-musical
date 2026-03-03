import type { GoogleTokenResponse } from "@/types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

// --------------- Circuit breaker ---------------
let quotaExhausted = false;
export function isQuotaExhausted(): boolean {
  return quotaExhausted;
}

// --------------- Persistent cache (localStorage + memory) ---------------
const CACHE_STORAGE_KEY = "yt_search_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  videoId: string;
  ts: number;
}

function loadPersistentCache(): Map<string, CacheEntry> {
  const map = new Map<string, CacheEntry>();
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return map;
    const entries: Record<string, CacheEntry> = JSON.parse(raw);
    const now = Date.now();
    for (const [key, entry] of Object.entries(entries)) {
      if (now - entry.ts < CACHE_TTL_MS) {
        map.set(key, entry);
      }
    }
  } catch {
    // corrupted — start fresh
  }
  return map;
}

let persistTimeout: ReturnType<typeof setTimeout> | null = null;

function persistCacheDebounced(cache: Map<string, CacheEntry | null>) {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    tryPersistCache(cache);
  }, 1000);
}

function tryPersistCache(cache: Map<string, CacheEntry | null>) {
  try {
    const validEntries = Array.from(cache.entries())
      .filter((entry): entry is [string, CacheEntry] => entry[1] !== null)
      .sort((a, b) => b[1].ts - a[1].ts);
    
    const toSave = validEntries.slice(0, CACHE_MAX_ENTRIES);
    saveWithQuotaRetry(CACHE_STORAGE_KEY, toSave);
  } catch {
    // ignore
  }
}

function saveWithQuotaRetry(key: string, validEntries: [string, CacheEntry][]) {
  const entries: Record<string, CacheEntry> = {};
  for (const [k, val] of validEntries) {
    entries[k] = val;
  }

  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.message?.toLowerCase().includes('quota')) {
      if (validEntries.length > 10) {
        const reducedEntries = validEntries.slice(0, Math.floor(validEntries.length / 2));
        const reducedObj: Record<string, CacheEntry> = {};
        for (const [k, val] of reducedEntries) {
          reducedObj[k] = val;
        }
        try {
          localStorage.setItem(key, JSON.stringify(reducedObj));
          
          const keysToKeep = new Set(reducedEntries.map(e => e[0]));
          for (const k of searchCache.keys()) {
            if (searchCache.get(k) !== null && !keysToKeep.has(k)) {
              searchCache.delete(k);
            }
          }
        } catch {
          // give up
        }
      }
    }
  }
}

const searchCache = new Map<string, CacheEntry | null>(Array.from(loadPersistentCache().entries()));
const failTTL = new Map<string, number>();
const FAIL_TTL_MS = 5 * 60 * 1000;

class YouTubeError extends Error {
  constructor(
    message: string,
    public code: "AUTH" | "QUOTA" | "NETWORK" | "NOT_FOUND" | "UNKNOWN",
    public status?: number,
  ) {
    super(message);
    this.name = "YouTubeError";
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = SEARCH_TIMEOUT_MS,
): Promise<Response> {
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
      if (error instanceof YouTubeError && (error.code === "AUTH" || error.code === "QUOTA")) throw error;
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 4000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Busca un video en YouTube usando un API Key.
 * Incluye caché en memoria para evitar búsquedas duplicadas.
 */
export async function searchVideo(
  query: string,
  auth: { apiKey?: string; token?: string },
): Promise<string | null> {
  if (quotaExhausted) {
    console.warn("[YouTube] Cuota agotada, saltando búsqueda.");
    return null;
  }

  const cacheKey = query.toLowerCase().trim();

  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached.videoId;
    // Si es un fallo cacheado, comprobar TTL
    const expiry = failTTL.get(cacheKey) ?? 0;
    if (Date.now() < expiry) return null;
    // TTL expirado, reintentar
    searchCache.delete(cacheKey);
    failTTL.delete(cacheKey);
  }

  return withRetry(async () => {
    try {
      const finalQuery = query;
      const useToken = !!auth.token;
      const useApiKey = !!auth.apiKey && !useToken;
      const useProxy = !useToken && !useApiKey;

      let url: string;
      let headers: Record<string, string> | undefined;

      if (useProxy) {
        url = `/api/youtube-search?q=${encodeURIComponent(finalQuery)}`;
        headers = undefined;
      } else {
        url = `${YOUTUBE_API_BASE}/search?part=id,snippet&q=${encodeURIComponent(finalQuery)}&maxResults=5&type=video&videoEmbeddable=true${useApiKey ? `&key=${auth.apiKey}` : ""}`;
        headers = useToken ? { Authorization: `Bearer ${auth.token}` } : undefined;
      }

      const response = await fetchWithTimeout(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(
          "[YouTube] status:", response.status,
          "data:", JSON.stringify(errorData, null, 2),
        );
        const reason = errorData?.error?.errors?.[0]?.reason;

        if (response.status === 403) {
          if (
            reason === "quotaExceeded" ||
            reason === "dailyLimitExceeded" ||
            reason === "accessNotConfigured"
          ) {
            quotaExhausted = true;
            throw new YouTubeError(
              `YouTube API: ${reason} — ${errorData?.error?.message ?? "cuota agotada o API no habilitada"}.`,
              "QUOTA",
              403,
            );
          }
          throw new YouTubeError(
            `Sin permisos de YouTube (${reason ?? "forbidden"}): ${errorData?.error?.message ?? "Clave API inválida o restricción activa"}.`,
            "AUTH",
            403,
          );
        }
        if (response.status === 401) {
          throw new YouTubeError(
            "Sesión de Google expirada o token inválido.",
            "AUTH",
            401,
          );
        }
        if (isRetryable(response.status)) {
          throw new YouTubeError(
            `Error ${response.status}: ${errorData?.error?.message ?? "error del servidor"}`,
            "QUOTA",
            response.status,
          );
        }
        searchCache.set(cacheKey, null);
        failTTL.set(cacheKey, Date.now() + FAIL_TTL_MS);
        return null;
      }

      const data = await response.json();
      const items = data.items ?? [];

      // Confiar principalmente en el algoritmo de YouTube, que es muy preciso
      // Pero aplicamos filtros para evitar covers, directos o karaokes si no se piden
      let bestId: string | null = null;
      let bestScore = -100;

      const firstResultId = items[0]?.id?.videoId ?? null;
      const lowerQuery = query.toLowerCase();
      const isCoverRequested = lowerQuery.includes("cover");
      const isRemixRequested = lowerQuery.includes("remix");
      const isLiveRequested = lowerQuery.includes("live") || lowerQuery.includes("vivo");

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const videoId = item.id?.videoId;
        if (!videoId) continue;

        const title = (item.snippet?.title ?? "").toLowerCase();
        const channelTitle = (item.snippet?.channelTitle ?? "").toLowerCase();

        // Base score: damos mucho peso a la posición en la que YouTube devuelve el video
        // El #1 recibe +10, el #2 +8, etc.
        let score = (5 - i) * 2;

        // Bonus si el canal es oficial o "Topic" (canales generados por YT Music)
        if (
          channelTitle.includes("topic") ||
          channelTitle.includes("official") ||
          channelTitle.includes("vevo")
        ) {
          score += 5;
        }

        // Penalizaciones drásticas por contenido no deseado
        const penalties = [
          { term: "karaoke", weight: 15 },
          { term: "instrumental", weight: 10 },
          { term: "reaction", weight: 15 },
          { term: "review", weight: 15 },
          { term: "tutorial", weight: 15 },
          { term: "8d audio", weight: 10 },
          { term: "bass boosted", weight: 8 },
          { term: "slowed", weight: 8 },
          { term: "reverb", weight: 8 },
          { term: "teaser", weight: 10 },
          { term: "preview", weight: 10 },
        ];

        for (const { term, weight } of penalties) {
          if (title.includes(term)) score -= weight;
        }

        if (!isCoverRequested && title.includes("cover")) score -= 15;
        if (!isRemixRequested && title.includes("remix")) score -= 5;
        if (!isLiveRequested && (title.includes("live") || title.includes("en vivo"))) score -= 5;

        // Penalizar álbumes completos (las búsquedas de música suelen ser de 1 canción)
        if (title.includes("full album") || title.includes("álbum completo")) {
          score -= 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestId = videoId;
        }
      }

      // Fallback seguro: si todos tienen puntaje bajísimo, confiamos en el primero
      if (!bestId) {
        bestId = firstResultId;
      }

      if (bestId) {
        searchCache.set(cacheKey, { videoId: bestId, ts: Date.now() });
        persistCacheDebounced(searchCache);
      } else {
        searchCache.set(cacheKey, null);
        failTTL.set(cacheKey, Date.now() + FAIL_TTL_MS);
      }
      return bestId;
    } catch (error: any) {
      if (error instanceof YouTubeError) throw error;
      if (error.name === "AbortError") {
        throw new YouTubeError("Timeout en la búsqueda.", "NETWORK");
      }
      throw new YouTubeError(error.message || "Error de red.", "NETWORK");
    }
  }, MAX_RETRIES);
}

export async function searchVideoWithApiKey(
  query: string,
  apiKey: string,
): Promise<string | null> {
  return searchVideo(query, { apiKey });
}

export async function searchVideoWithToken(
  query: string,
  token: string,
): Promise<string | null> {
  return searchVideo(query, { token });
}

/**
 * Busca videos en lote con concurrencia limitada (usando API Key).
 */
export async function batchSearchVideos(
  queries: { index: number; query: string }[],
  apiKey: string,
  concurrency = 3,
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const queue = [...queries];

  async function worker() {
    while (queue.length > 0 && !quotaExhausted) {
      const item = queue.shift()!;
      try {
        const videoId = await searchVideoWithApiKey(item.query, apiKey);
        if (videoId) results.set(item.index, videoId);
      } catch {
        if (quotaExhausted) break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => worker(),
  );
  await Promise.allSettled(workers);
  return results;
}

/**
 * Obtiene un access token de Google usando OAuth 2.0.
 * Utiliza un caché en memoria validando la expiración.
 */
export async function getGoogleAccessToken(
  clientId: string,
  forceRefresh = false,
): Promise<string> {
  if (!forceRefresh && cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(
        new Error(
          "Google Identity Services no está cargado. Recarga la página.",
        ),
      );
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:
        "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else if (response.access_token) {
          cachedAccessToken = response.access_token;
          const expiresIn = response.expires_in
            ? Number(response.expires_in)
            : 3599;
          tokenExpiryTime = Date.now() + (expiresIn - 300) * 1000; // 5 minutos de margen
          resolve(response.access_token);
        } else {
          reject(new Error("No se obtuvo token de acceso."));
        }
      },
      error_callback: (error: { message?: string }) => {
        reject(
          new Error(error.message || "Error en la autenticación de Google."),
        );
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
  description: string,
): Promise<string> {
  const response = await fetchWithTimeout(
    `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: { title, description },
        status: { privacyStatus: "private" },
      }),
    },
    15_000,
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error creando la playlist.");
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
  videoId: string,
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: { kind: "youtube#video", videoId },
          },
        }),
      },
      15_000,
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
  quotaExhausted = false;
  try { localStorage.removeItem(CACHE_STORAGE_KEY); } catch {}
}

export { YouTubeError };
