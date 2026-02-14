import { GoogleGenAI, Type } from '@google/genai';
import type { MusicMix, SearchCriteria } from '@/types';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const MODEL = 'gemini-3-flash-preview';

class GeminiError extends Error {
  constructor(
    message: string,
    public code: 'AUTH' | 'QUOTA' | 'NETWORK' | 'PARSE' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const result = await promise;
    return result;
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
      // No reintentar errores de auth o parsing
      if (error instanceof GeminiError && (error.code === 'AUTH' || error.code === 'PARSE')) {
        throw error;
      }
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 4000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function classifyError(error: any): GeminiError {
  const msg = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.httpStatusCode;

  if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('permission')) {
    return new GeminiError('Clave de API inválida o sin permisos.', 'AUTH');
  }
  if (status === 429 || msg.includes('quota') || msg.includes('rate')) {
    return new GeminiError('Cuota de API excedida. Intenta más tarde.', 'QUOTA');
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('abort')) {
    return new GeminiError('Error de conexión. Verifica tu internet.', 'NETWORK');
  }
  return new GeminiError(error?.message || 'Error desconocido al generar mixes.', 'UNKNOWN');
}

export async function generateStrangeMixes(
  apiKey: string,
  criteria: SearchCriteria
): Promise<MusicMix[]> {
  if (!apiKey) throw new GeminiError('Se requiere la clave de API de Gemini.', 'AUTH');

  const ai = new GoogleGenAI({ apiKey });
  const count = criteria.songCount || 15;

  let context = '';
  if (criteria.continent) context += `Focus on the continent: ${criteria.continent}. `;
  if (criteria.country) context += `Prioritize the country: ${criteria.country}. `;
  if (criteria.style) context += `Focus on the style or subgenre: ${criteria.style}. `;
  if (criteria.year) context += `Focus on the era or year: ${criteria.year}. `;
  if (criteria.bpm) context += `Target a BPM around: ${criteria.bpm}. `;

  let descriptiveInstruction = '';
  if (criteria.descriptiveQuery && criteria.descriptiveQuery.trim()) {
    descriptiveInstruction = `
    VERY IMPORTANT — The user provided a DESCRIPTIVE SEARCH query: "${criteria.descriptiveQuery.trim()}"
    You MUST interpret this description creatively and find music that matches it.
    Examples of how to interpret descriptive searches:
    - "rock sin guitarras" → find rock subgenres that primarily use other instruments (synths, brass, etc.)
    - "canciones que hablen de perros" → find real songs whose lyrics are about dogs
    - "música triste pero bailable" → find melancholic yet danceable music
    - "sonidos de la selva" → find music inspired by jungle/rainforest sounds or themes
    ALL results must match this description as closely as possible.
    `;
  }

  const prompt = `
    Generate a list of exactly ${count} unique, strange, and eclectic music genre/country combinations.
    The goal is to find real, existing, but rare cultural mashups.
    
    ${context ? `STRICTLY FOLLOW THESE CONSTRAINTS: ${context}` : 'Find random strange mixes from around the world.'}
    ${descriptiveInstruction}

    For each item, identify a specific REAL artist or exponent of that style.
    
    IMPORTANT: The output text (style, country, description, continent) MUST BE IN SPANISH.
    
    Return a JSON array where each object contains:
    - style: The genre name (in Spanish).
    - country: The country of origin (in Spanish).
    - continent: The continent (África, Asia, Europa, América del Norte, América del Sur, Oceanía).
    - artist: The name of the band or artist.
    - year: Approximate decade or year of the song/style peak (e.g. "1990s", "2023").
    - bpm: Approximate numeric BPM (number).
    - description: A short, 1-sentence description of the sound (in Spanish).
    - searchQuery: A string optimized for YouTube search (e.g., "ArtistName SongTitle" or "ArtistName Style").
    - coordinates: An object with 'lat' and 'lng' (numbers) representing the location of the country or city of origin.
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
        year: { type: Type.STRING },
        bpm: { type: Type.NUMBER },
        description: { type: Type.STRING },
        searchQuery: { type: Type.STRING },
        coordinates: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ['lat', 'lng'],
        },
      },
      required: [
        'style',
        'country',
        'continent',
        'artist',
        'year',
        'bpm',
        'description',
        'searchQuery',
        'coordinates',
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
          },
        }),
        TIMEOUT_MS
      );

      if (!response.text) {
        throw new GeminiError('La IA no devolvió una respuesta.', 'PARSE');
      }

      let data: any[];
      try {
        data = JSON.parse(response.text);
      } catch {
        throw new GeminiError('La respuesta de la IA no es JSON válido.', 'PARSE');
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new GeminiError('La IA devolvió una lista vacía.', 'PARSE');
      }

      // Validar y limpiar cada item
      return data
        .filter(
          (item: any) =>
            item.style &&
            item.country &&
            item.artist &&
            item.coordinates?.lat != null &&
            item.coordinates?.lng != null
        )
        .map((item: any, index: number): MusicMix => ({
          id: `mix-${Date.now()}-${index}`,
          style: String(item.style),
          country: String(item.country),
          continent: String(item.continent || 'Desconocido') as MusicMix['continent'],
          artist: String(item.artist),
          year: String(item.year || ''),
          bpm: Number(item.bpm) || 120,
          description: String(item.description || ''),
          searchQuery: String(item.searchQuery || `${item.artist} ${item.style}`),
          coordinates: {
            lat: Number(item.coordinates.lat),
            lng: Number(item.coordinates.lng),
          },
        }));
    } catch (error: any) {
      if (error instanceof GeminiError) throw error;
      throw classifyError(error);
    }
  }, MAX_RETRIES);
}
