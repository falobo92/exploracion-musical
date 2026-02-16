import { GoogleGenAI, Type } from '@google/genai';
import type { MusicMix, SearchCriteria } from '@/types';
import { getCoordsForCountry } from '@/constants/countryCoords';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const MODEL = 'gemini-2.5-flash';

class GeminiError extends Error {
  constructor(
    message: string,
    public code: 'AUTH' | 'QUOTA' | 'NETWORK' | 'PARSE' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new GeminiError(`Timeout tras ${ms / 1000}s sin respuesta.`, 'NETWORK')),
      ms
    );
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error instanceof GeminiError && (error.code === 'AUTH' || error.code === 'PARSE')) {
        throw error;
      }
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 4000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function classifyError(error: any): GeminiError {
  if (error instanceof GeminiError) return error;
  const msg = String(error?.message ?? error ?? '');
  if (/api.?key|auth|401|403|permission/i.test(msg))
    return new GeminiError('Clave de API inválida o sin permisos.', 'AUTH');
  if (/quota|429|rate/i.test(msg))
    return new GeminiError('Cuota de API excedida. Intenta más tarde.', 'QUOTA');
  if (/network|fetch|abort|timeout|ECONNREFUSED/i.test(msg))
    return new GeminiError('Error de red al contactar la IA.', 'NETWORK');
  return new GeminiError(msg || 'Error desconocido al generar.', 'UNKNOWN');
}

export async function generateStrangeMixes(
  apiKey: string,
  criteria: SearchCriteria
): Promise<MusicMix[]> {
  if (!apiKey) throw new GeminiError('Se requiere la clave de API de Gemini.', 'AUTH');

  const ai = new GoogleGenAI({ apiKey });
  const count = criteria.songCount || 15;

  // ── Construir restricciones a partir de los filtros del usuario ──
  const filters: string[] = [];

  if (criteria.continent) {
    filters.push(`CONTINENT FILTER: ALL tracks MUST be from continent "${criteria.continent}". Do NOT include tracks from other continents.`);
  }
  if (criteria.country) {
    filters.push(`COUNTRY FILTER: ALL tracks MUST be from "${criteria.country}". The 'country' field MUST be exactly "${criteria.country}".`);
  }
  if (criteria.style) {
    filters.push(`GENRE/STYLE FILTER: ALL tracks MUST be of genre "${criteria.style}" or closely related sub-genres.`);
  }
  if (criteria.year) {
    const decadeStart = parseInt(criteria.year);
    if (!isNaN(decadeStart)) {
      filters.push(`DECADE FILTER: ALL tracks MUST have been released between ${decadeStart} and ${decadeStart + 9}. The 'year' field MUST be the actual release year (e.g. "${decadeStart + 3}"), NOT the decade label.`);
    } else {
      filters.push(`DECADE FILTER: ALL tracks MUST be from the ${criteria.year}. Return the actual release year in the 'year' field.`);
    }
  }
  if (criteria.bpm) {
    const [minBpm, maxBpm] = criteria.bpm.split('-').map(Number);
    if (minBpm && maxBpm) {
      filters.push(`BPM FILTER: ALL tracks MUST have a tempo between ${minBpm} and ${maxBpm} BPM. The 'bpm' field must reflect this.`);
    }
  }

  let magicInstruction = '';
  if (criteria.descriptiveQuery?.trim()) {
    magicInstruction = `
    CREATIVE USER REQUEST: "${criteria.descriptiveQuery.trim()}"
    Interpret this creatively and use it as the primary theme for the playlist.
    Examples of interpretation:
    - "Sonidos de la selva" → Cumbia Amazónica, Exotica, Field Recordings from jungle regions.
    - "Jazz sin saxofón" → Piano Jazz, Guitar Jazz, Vocal Jazz, Fusion without sax.
    - "Música triste bailable" → Dark Wave, Synth Pop, Sad Disco.
    `;
  }

  const filtersBlock = filters.length > 0
    ? `\n    ACTIVE FILTERS (MANDATORY — every track MUST satisfy ALL of these):\n    ${filters.map((f, i) => `${i + 1}. ${f}`).join('\n    ')}\n`
    : '';

  const defaultContext = 'Explore eclectic sounds from around the globe (Funk, Afrobeat, City Pop, Cumbia, Psych Rock, Jazz Fusion, Highlife, Tropicália, etc.).';

  const prompt = `
    ROLE: You are an expert Ethnomusicologist and DJ specializing in Rare Grooves, World Music, and Eclectic Fusions.

    TASK: Generate a playlist of exactly ${count} distinct, real tracks.
    GOAL: Discover musical gems. Avoid mainstream "Top 40" hits unless the user specifically requests mainstream music.
    ${filtersBlock}
    ${magicInstruction || (filters.length === 0 ? `OPEN EXPLORATION: ${defaultContext}` : '')}

    STRICT OUTPUT RULES:
    1. REAL SONGS ONLY. Every track must be a real, verifiable song. If unsure, pick a well-known track from that genre/country.
    2. LANGUAGE RULES:
       - 'description', 'style', 'country', 'continent' → MUST be in SPANISH.
       - 'songTitle' and 'artist' → Keep original names (never translate).
    3. 'searchQuery' → Format MUST be exactly: "Artist Name - Song Title"
    4. 'year' → MUST be the actual release year as a 4-digit string (e.g. "1983", "2015"). Never use decade labels like "1980s".
    5. 'continent' → MUST be one of: "África", "Asia", "Europa", "América del Norte", "América del Sur", "Oceanía"
    6. 'country' → MUST be the country name in Spanish (e.g. "Japón", "Estados Unidos", "Nigeria").
    7. DIVERSITY: ${criteria.year ? 'Vary within the selected decade.' : 'Vary decades (1960s–2020s).'} ${criteria.bpm ? '' : 'Vary tempos.'}

    REQUIRED JSON FIELDS PER TRACK:
    - style (Genre in Spanish, e.g. "Funk Psicodélico", "Jazz Fusión")
    - country (Country in Spanish)
    - continent (One of the 6 listed above)
    - artist (Original name)
    - songTitle (Original title)
    - year (4-digit release year as string)
    - bpm (Approximate BPM as number)
    - description (Catchy, max 8 words in Spanish)
    - searchQuery ("Artist Name - Song Title")
  `;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        style: { type: Type.STRING },
        country: { type: Type.STRING },
        continent: { type: Type.STRING },
        artist: { type: Type.STRING },
        songTitle: { type: Type.STRING },
        year: { type: Type.STRING },
        bpm: { type: Type.NUMBER },
        description: { type: Type.STRING },
        searchQuery: { type: Type.STRING },
      },
      required: [
        'style',
        'country',
        'continent',
        'artist',
        'songTitle',
        'searchQuery',
        'description',
      ],
    },
  };

  return withRetry(async () => {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.85,
          },
        }),
        TIMEOUT_MS
      );

      const text = response.text?.trim();
      if (!text) throw new GeminiError('Respuesta vacía de IA.', 'PARSE');

      let data: any[];
      try {
        data = JSON.parse(text);
      } catch {
        throw new GeminiError('JSON inválido recibido de la IA.', 'PARSE');
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new GeminiError('La IA devolvió una lista vacía.', 'PARSE');
      }

      return data.map((item: any, index: number): MusicMix => {
        const country = String(item.country || 'Mundo');
        const continent = String(item.continent || 'Desconocido');
        const artist = String(item.artist || 'Artista Desconocido');
        const title = String(item.songTitle || 'Pista');
        const style = String(item.style || 'Varios');

        return {
          id: `mix-${Date.now()}-${index}`,
          style,
          country,
          continent: continent as MusicMix['continent'],
          artist,
          songTitle: title,
          year: String(item.year || ''),
          bpm: Number(item.bpm) || 100,
          description: String(item.description || ''),
          searchQuery: item.searchQuery || `${artist} - ${title}`,
          coordinates: getCoordsForCountry(country, continent),
        };
      });
    } catch (error: any) {
      throw classifyError(error);
    }
  }, MAX_RETRIES);
}