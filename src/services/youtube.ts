import type { GoogleTokenResponse } from "@/types";
import { normalizeForCompare } from "@/lib/text";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const SEARCH_MAX_RESULTS = 12;
const SHORT_FORM_MAX_SECONDS = 65;
const STANDARD_TRACK_MAX_SECONDS = 11 * 60;
const WEAK_MATCH_SCORE = 18;

interface SearchAuth {
  apiKey?: string;
  token?: string;
}

interface YouTubeSearchItem {
  id?: { videoId?: string } | string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    categoryId?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

function getVideoId(item: YouTubeSearchItem): string | null {
  if (typeof item.id === "string") return item.id;
  return item.id?.videoId ?? null;
}

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

function tokenize(value: string): string[] {
  return normalizeForCompare(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function overlapScore(sourceTokens: string[], candidateTokens: string[], weight: number): number {
  if (sourceTokens.length === 0 || candidateTokens.length === 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const matches = sourceTokens.filter((token) => candidateSet.has(token)).length;
  return Math.round((matches / sourceTokens.length) * weight);
}

function splitQuery(query: string): { artistPart: string; titlePart: string } {
  const [artistPart = "", ...titleParts] = query.split(" - ");
  return {
    artistPart: artistPart.trim(),
    titlePart: titleParts.join(" - ").trim(),
  };
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function parseIsoDurationToSeconds(duration?: string): number | null {
  if (!duration) return null;
  const match = duration.match(
    /^P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?$/i,
  );
  if (!match) return null;

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return (
    Number(days) * 24 * 60 * 60
    + Number(hours) * 60 * 60
    + Number(minutes) * 60
    + Number(seconds)
  );
}

function buildSearchUrl(query: string, auth: SearchAuth): string {
  const params = new URLSearchParams({
    part: "id,snippet",
    q: query,
    maxResults: String(SEARCH_MAX_RESULTS),
    type: "video",
    videoEmbeddable: "true",
    videoDuration: "medium",
    safeSearch: "none",
  });

  if (auth.apiKey) {
    params.set("key", auth.apiKey);
  }

  return `${YOUTUBE_API_BASE}/search?${params.toString()}`;
}

function buildVideosUrl(videoIds: string[], auth: SearchAuth): string {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(","),
    maxResults: String(videoIds.length),
  });

  if (auth.apiKey) {
    params.set("key", auth.apiKey);
  }

  return `${YOUTUBE_API_BASE}/videos?${params.toString()}`;
}

async function enrichSearchItems(
  items: YouTubeSearchItem[],
  auth: SearchAuth,
  headers?: Record<string, string>,
): Promise<YouTubeSearchItem[]> {
  const videoIds = items
    .map(getVideoId)
    .filter((videoId): videoId is string => Boolean(videoId));

  if (videoIds.length === 0 || (!auth.apiKey && !auth.token)) {
    return items;
  }

  try {
    const response = await fetchWithTimeout(buildVideosUrl(videoIds, auth), { headers });
    if (!response.ok) return items;

    const data = await response.json();
    const byId = new Map<string, YouTubeSearchItem>(
      (data.items ?? [])
        .map((item: YouTubeSearchItem) => [getVideoId(item), item] as const)
        .filter(
          (entry: readonly [string | null, YouTubeSearchItem]): entry is readonly [string, YouTubeSearchItem] =>
            Boolean(entry[0]),
        ),
    );

    return items.map((item) => {
      const videoId = getVideoId(item);
      if (!videoId) return item;
      const enriched = byId.get(videoId);
      if (!enriched) return item;

      return {
        ...item,
        snippet: {
          ...item.snippet,
          ...enriched.snippet,
        },
        contentDetails: enriched.contentDetails ?? item.contentDetails,
        statistics: enriched.statistics ?? item.statistics,
      };
    });
  } catch {
    return items;
  }
}

function scoreCandidate(item: YouTubeSearchItem, index: number, query: string): number {
  const title = item.snippet?.title ?? "";
  const channelTitle = item.snippet?.channelTitle ?? "";
  const normalizedQuery = normalizeForCompare(query);
  const normalizedTitle = normalizeForCompare(title);
  const normalizedChannelTitle = normalizeForCompare(channelTitle);
  const queryTokens = tokenize(query);
  const { artistPart, titlePart } = splitQuery(query);
  const artistTokens = tokenize(artistPart);
  const titleTokens = tokenize(titlePart);
  const candidateTokens = [...tokenize(title), ...tokenize(channelTitle)];
  const durationSeconds = parseIsoDurationToSeconds(item.contentDetails?.duration);
  const viewCount = Number(item.statistics?.viewCount ?? 0);
  const publishedAtMs = item.snippet?.publishedAt ? Date.parse(item.snippet.publishedAt) : NaN;
  const ageDays = Number.isNaN(publishedAtMs)
    ? null
    : Math.max(0, Math.round((Date.now() - publishedAtMs) / (1000 * 60 * 60 * 24)));
  const liveBroadcast = normalizeForCompare(item.snippet?.liveBroadcastContent ?? "");

  const isCoverRequested = normalizedQuery.includes("cover");
  const isRemixRequested = normalizedQuery.includes("remix");
  const isLiveRequested = normalizedQuery.includes("live") || normalizedQuery.includes("vivo");
  const isLyricRequested = normalizedQuery.includes("lyrics") || normalizedQuery.includes("letra");
  const isInstrumentalRequested = normalizedQuery.includes("instrumental");
  const allowLongForm = includesAny(normalizedQuery, [
    "mix",
    "session",
    "set",
    "dj",
    "radio",
    "live",
    "boiler room",
    "full album",
    "album completo",
  ]);

  const strongPenaltyTerms = [
    "karaoke",
    "reaction",
    "review",
    "tutorial",
    "teaser",
    "preview",
    "shorts",
    "fan made",
    "challenge",
    "meme",
    "viral",
    "status",
    "capcut",
    "tiktok",
    "edit",
    "clip",
  ];
  const mediumPenaltyTerms = [
    "lyric",
    "lyrics",
    "audio",
    "visualizer",
    "slowed",
    "sped up",
    "reverb",
    "nightcore",
    "8d",
    "bass boosted",
    "full album",
    "album completo",
    "trending",
    "compilation",
  ];

  let score = Math.max(0, SEARCH_MAX_RESULTS - index) * 1.25;

  if (
    normalizedChannelTitle.includes("topic")
    || normalizedChannelTitle.includes("official")
    || normalizedChannelTitle.includes("vevo")
    || normalizedChannelTitle.includes("records")
  ) {
    score += 7;
  }

  if (item.snippet?.categoryId === "10") {
    score += 6;
  }

  if (artistTokens.length > 0) {
    score += overlapScore(artistTokens, candidateTokens, 20);
    if (normalizedTitle.includes(normalizeForCompare(artistPart))) score += 5;
  }

  if (titleTokens.length > 0) {
    score += overlapScore(titleTokens, candidateTokens, 28);
    if (normalizedTitle.includes(normalizeForCompare(titlePart))) score += 8;
  } else {
    score += overlapScore(queryTokens, candidateTokens, 18);
  }

  if (artistTokens.length > 0 && titleTokens.length > 0) {
    const exactArtist = normalizedTitle.includes(normalizeForCompare(artistPart));
    const exactTitle = normalizedTitle.includes(normalizeForCompare(titlePart));
    if (exactArtist && exactTitle) score += 12;
  }

  if (includesAny(normalizedTitle, strongPenaltyTerms) || includesAny(normalizedChannelTitle, strongPenaltyTerms)) {
    score -= 18;
  }
  if (includesAny(normalizedTitle, mediumPenaltyTerms) || includesAny(normalizedChannelTitle, mediumPenaltyTerms)) {
    score -= 9;
  }

  if (!isInstrumentalRequested && normalizedTitle.includes("instrumental")) score -= 12;
  if (!isLyricRequested && (normalizedTitle.includes("lyric") || normalizedTitle.includes("lyrics"))) score -= 9;
  if (!isCoverRequested && normalizedTitle.includes("cover")) score -= 16;
  if (!isRemixRequested && normalizedTitle.includes("remix")) score -= 12;
  if (!isLiveRequested && (normalizedTitle.includes("live") || normalizedTitle.includes("en vivo"))) score -= 12;

  if (durationSeconds !== null) {
    if (!allowLongForm && durationSeconds < SHORT_FORM_MAX_SECONDS) {
      score -= 28;
    }
    if (!allowLongForm && durationSeconds > STANDARD_TRACK_MAX_SECONDS) {
      score -= 12;
    }
    if (allowLongForm && durationSeconds >= 5 * 60) {
      score += 6;
    }
  }

  if (liveBroadcast && liveBroadcast !== "none" && !isLiveRequested) {
    score -= 14;
  }

  if (artistTokens.length > 0 && overlapScore(artistTokens, candidateTokens, 100) === 0) {
    score -= 14;
  }

  if (titleTokens.length > 0 && overlapScore(titleTokens, candidateTokens, 100) < 30) {
    score -= 12;
  }

  if (
    ageDays !== null
    && ageDays < 120
    && viewCount > 5_000_000
    && (
      includesAny(normalizedTitle, ["viral", "challenge", "meme", "edit", "tiktok", "clip"])
      || includesAny(normalizedChannelTitle, ["shorts", "clips"])
    )
  ) {
    score -= 12;
  }

  return score;
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
  auth: SearchAuth,
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
        url = buildSearchUrl(finalQuery, auth);
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
            "NETWORK",
            response.status,
          );
        }
        searchCache.set(cacheKey, null);
        failTTL.set(cacheKey, Date.now() + FAIL_TTL_MS);
        return null;
      }

      const data = await response.json();
      const baseItems: YouTubeSearchItem[] = data.items ?? [];
      const items = useProxy
        ? baseItems
        : await enrichSearchItems(baseItems, auth, headers);

      let bestId: string | null = null;
      let bestScore = -100;

      const firstResultId = items[0] ? getVideoId(items[0]) : null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const videoId = getVideoId(item);
        if (!videoId) continue;

        const score = scoreCandidate(item, i, query);

        if (score > bestScore) {
          bestScore = score;
          bestId = videoId;
        }
      }

      // Fallback seguro: si todos tienen puntaje bajísimo, confiamos en el primero
      if (!bestId) {
        bestId = firstResultId;
      }

      if (bestId && bestScore >= WEAK_MATCH_SCORE) {
        searchCache.set(cacheKey, { videoId: bestId, ts: Date.now() });
        persistCacheDebounced(searchCache);
      } else if (bestId) {
        searchCache.delete(cacheKey);
        failTTL.delete(cacheKey);
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
  auth: SearchAuth,
  concurrency = 3,
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const queue = [...queries];

  async function worker() {
    while (queue.length > 0 && !quotaExhausted) {
      const item = queue.shift()!;
      try {
        const videoId = await searchVideo(item.query, auth);
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
