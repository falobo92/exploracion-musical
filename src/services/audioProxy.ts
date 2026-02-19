const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.smnz.de',
  'https://api.piped.otbea.com',
  'https://pipedapi.ducks.party',
  'https://pipedapi.noseals.io'
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

async function fastFetch(url: string, timeout = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchStream(videoId: string, instance: string, type: 'piped' | 'invidious'): Promise<string> {
  const url = type === 'piped'
    ? `${instance}/streams/${videoId}`
    : `${instance}/api/v1/videos/${videoId}`;

  const res = await fastFetch(url);
  if (!res.ok) throw new Error('Status not ok');

  const data = await res.json();
  let streams = [];

  if (type === 'piped') {
    streams = (data.audioStreams || []).filter((s: any) => s.url && s.mimeType?.startsWith('audio/'));
  } else {
    streams = (data.adaptiveFormats || []).filter((s: any) => s.type?.startsWith('audio/'));
  }

  const mp4 = streams.find((s: any) => (s.mimeType || s.type)?.includes('mp4') || (s.mimeType || s.type)?.includes('m4a'));
  const selected = mp4 || streams[0];

  if (!selected?.url) throw new Error('No stream found');
  return selected.url;
}

export async function getAudioUrl(videoId: string): Promise<string | null> {
  const cached = getCachedUrl(videoId);
  if (cached) return cached;

  const shuffle = (arr: string[]) => [...arr].sort(() => 0.5 - Math.random());

  const candidates = [
    ...shuffle(PIPED_INSTANCES).slice(0, 3).map(url => ({ url, type: 'piped' as const })),
    ...shuffle(INVIDIOUS_INSTANCES).slice(0, 1).map(url => ({ url, type: 'invidious' as const }))
  ];

  try {
    const url = await Promise.any(
      candidates.map(c => fetchStream(videoId, c.url, c.type))
    );

    if (url) {
      setCachedUrl(videoId, url);
      return url;
    }
  } catch (e) {
    console.warn('Todos los proxies fallaron o timeout', e);
  }

  return null;
}

export function clearAudioCache(videoId?: string) {
  if (videoId) audioCache.delete(videoId);
  else audioCache.clear();
}
