/**
 * Servicio para obtener URLs de audio directas desde YouTube videos.
 * Usa APIs de Piped e Invidious como proxies para extraer streams de audio,
 * permitiendo reproducción en segundo plano y con pantalla bloqueada
 * a través del elemento <audio> nativo del navegador.
 */

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.r4fo.com',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacyredirect.com',
];

interface AudioCacheEntry {
  url: string;
  timestamp: number;
}

// Cache con TTL de 5 horas (las URLs de Google expiran ~6h)
const CACHE_TTL = 5 * 60 * 60 * 1000;
const audioCache = new Map<string, AudioCacheEntry>();

function getCachedUrl(videoId: string): string | null {
  const entry = audioCache.get(videoId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    audioCache.delete(videoId);
    return null;
  }
  return entry.url;
}

function setCachedUrl(videoId: string, url: string) {
  audioCache.set(videoId, { url, timestamp: Date.now() });
}

async function fetchFromPiped(videoId: string, instance: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${instance}/streams/${videoId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    const streams = (data.audioStreams || [])
      .filter((s: any) => s.url && s.mimeType?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    // Preferir formato compatible con más navegadores (mp4/m4a sobre webm)
    const mp4Stream = streams.find((s: any) =>
      s.mimeType?.includes('mp4') || s.mimeType?.includes('m4a')
    );

    return mp4Stream?.url || streams[0]?.url || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function fetchFromInvidious(videoId: string, instance: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    const streams = (data.adaptiveFormats || [])
      .filter((s: any) => s.type?.startsWith('audio/'))
      .sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));

    const mp4Stream = streams.find((s: any) =>
      s.type?.includes('mp4') || s.type?.includes('m4a')
    );

    return mp4Stream?.url || streams[0]?.url || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Obtiene una URL de audio directa para un video de YouTube.
 * Intenta múltiples instancias de Piped e Invidious como fallback.
 * Retorna null si todos los intentos fallan.
 */
export async function getAudioUrl(videoId: string): Promise<string | null> {
  // Verificar cache
  const cached = getCachedUrl(videoId);
  if (cached) return cached;

  // Intentar instancias de Piped primero (generalmente más rápidas)
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = await fetchFromPiped(videoId, instance);
      if (url) {
        setCachedUrl(videoId, url);
        return url;
      }
    } catch {
      continue;
    }
  }

  // Intentar instancias de Invidious como fallback
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = await fetchFromInvidious(videoId, instance);
      if (url) {
        setCachedUrl(videoId, url);
        return url;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Limpia entradas del cache. Sin argumento limpia todo.
 */
export function clearAudioCache(videoId?: string) {
  if (videoId) audioCache.delete(videoId);
  else audioCache.clear();
}
