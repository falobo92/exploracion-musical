import { GoogleGenAI, Type } from '@google/genai';
import type { MusicMix, SearchCriteria } from '@/types';
import { getCoordsForCountry } from '@/constants/countryCoords';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const MODEL = 'gemini-2.0-flash';


interface GeminiTrackResponse {
  style?: string;
  country?: string;
  continent?: string;
  artist?: string;
  songTitle?: string;
  year?: string | number;
  bpm?: number | string;
  description?: string;
  searchQuery?: string;
}

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
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
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
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function classifyError(error: unknown): GeminiError {
  if (error instanceof GeminiError) return error;
  const errorMessage = error instanceof Error ? error.message : String(error ?? '');
  const msg = errorMessage.trim();
  if (/api.?key|auth|401|403|permission/i.test(msg))
    return new GeminiError('Clave de API inválida o sin permisos.', 'AUTH');
  if (/quota|429|rate/i.test(msg))
    return new GeminiError('Cuota de API excedida. Intenta más tarde.', 'QUOTA');
  if (/network|fetch|abort|timeout|ECONNREFUSED/i.test(msg))
    return new GeminiError('Error de red al contactar la IA.', 'NETWORK');
  return new GeminiError(msg || 'Error desconocido al generar.', 'UNKNOWN');
}

// ─── DATASETS FOR RANDOM SEEDING ───
const NICHE_GENRES = [
  'Tuvan Throat Singing', 'Gnawa', 'Chicha', 'Forró', 'Dangdut', 'Raï', 'Mbalax', 'Soukous',
  'Krautrock', 'Zeuhl', 'Math Rock', 'Gamelan', 'Kuduro', 'Baile Funk', 'Chalga', 'Turbo-Folk',
  'Manele', 'Ethio-Jazz', 'Luk Thung', 'Enka', 'Jùjú', 'Griot', 'Gqom', 'Amapiano', 'Chamame',
  'Huayno', 'Gagaku', 'Zamrock', 'Highlife', 'Afro-Psych', 'City Pop', 'Shibuya-kei', 'Tropicalia',
  'MPB', 'Samba-Jazz', 'Bossa Nova', 'Fado', 'Flamenco Nuevo', 'Exotica', 'Space Age Pop',
  'Library Music', 'Dungeon Synth', 'Vaporwave', 'Mallsoft', 'Future Funk', 'Witch House',
  'Seapunk', 'Cloud Rap', 'Phonk', 'Drill', 'Grime', 'UK Garage', '2-Step', 'Jungle',
  'Drum and Bass', 'Breakcore', 'IDM', 'Glitch', 'Ambient', 'Drone', 'Field Recordings',
  'Musique Concrète', 'Electroacoustic', 'Noise', 'Power Electronics', 'Industrial', 'EBM',
  'New Beat', 'Italo Disco', 'Spacesynth', 'Eurobeat', 'Hi-NRG', 'Freestyle', 'Miami Bass',
  'Ghetto Tech', 'Footwork', 'Juke', 'Baltimore Club', 'Jersey Club', 'Ballroom', 'Vogue',
  'Kwaito', 'Bubblegum', 'Pancoc', 'Tejano', 'Norteño', 'Banda', 'Corridos Tumbados',
  'Bachata', 'Merengue', 'Salsa Dura', 'Boogaloo', 'Latin Soul', 'Chicano Soul', 'Lowrider Oldies',
  'Rocksteady', 'Dub', 'Lovers Rock', 'Dancehall', 'Ragga', 'Soca', 'Calypso', 'Mento',
  'Zouk', 'Kizomba', 'Semba', 'Funaná', 'Morna', 'Coladeira', 'Batuque', 'Marroban',
  'Pandza', 'Marrabenta', 'Chimurenga', 'Jit', 'Sungura', 'Mbira', 'Benga', 'Kapuka',
  'Genge', 'Bongo Flava', 'Taarab', 'Mahraganat', 'Shaabi', 'Dabke', 'Khaliji', 'Bandari',
  'Qawwali', 'Sufi Rock', 'Coke Studio', 'Bollywood', 'Filmi', 'Indipop', 'Raga Rock',
  'Carnatic Fusion', 'Baul', 'Bhatiali', 'Lalon', 'Nazrul Geeti', 'Rabindra Sangeet',
  'Cantopop', 'Mandopop', 'Hokkien Pop', 'Enka', 'Kayokyoku', 'J-Pop', 'J-Rock', 'Visual Kei',
  'Vocaloid', 'Denpa', 'Touhou', 'Doujin', 'Chiptune', 'Bitpop', 'Nintendocore', 'Synthwave',
  'Retrowave', 'Outrun', 'Darkwave', 'Coldwave', 'Minimal Wave', 'Post-Punk', 'Goth Rock',
  'Deathrock', 'Shoegaze', 'Dream Pop', 'Twee Pop', 'Jangle Pop', 'C86', 'Madchester',
  'Baggy', 'Britpop', 'Pub Rock', 'Mod Revival', 'Northern Soul', 'Blue-Eyed Soul', 'Yacht Rock',
  'AOR', 'Soft Rock', 'Dad Rock', 'Heartland Rock', 'Roots Rock', 'Americana', 'Alt-Country',
  'Outlaw Country', 'Bakersfield Sound', 'Nashville Sound', 'Countrypolitan', 'Western Swing',
  'Bluegrass', 'Old-Time', 'Appalachian', 'Cajun', 'Zydeco', 'Swamp Pop', 'Delta Blues',
  'Chicago Blues', 'Texas Blues', 'Piedmont Blues', 'Hill Country Blues', 'Jump Blues',
  'Rhythm and Blues', 'Doo-Wop', 'Rock and Roll', 'Rockabilly', 'Psychobilly', 'Surf Rock',
  'Garage Rock', 'Frat Rock', 'Pub Rock', 'Punk', 'Hardcore', 'Post-Hardcore', 'Emo',
  'Screamo', 'Mathcore', 'Grindcore', 'Crust Punk', 'D-Beat', 'Powerviolence', 'Sludge',
  'Doom Metal', 'Stoner Rock', 'Desert Rock', 'Heavy Metal', 'Thrash Metal', 'Death Metal',
  'Black Metal', 'Viking Metal', 'Folk Metal', 'Symphonic Metal', 'Power Metal', 'Prog Metal',
  'Djent', 'Nu Metal', 'Rap Metal', 'Funk Metal', 'Alternative Metal', 'Industrial Metal',
  'Groove Metal', 'Speed Metal', 'Glam Metal', 'Hair Metal', 'Arena Rock', 'Stadium Rock'
];

const UNUSUAL_REGIONS = [
  'Tuva', 'Mali', 'Cabo Verde', 'Reunión', 'Madagascar', 'Myanmar', 'Georgia', 'Armenia',
  'Uzbekistán', 'Azerbaiyán', 'Kazajistán', 'Kirguistán', 'Tayikistán', 'Turkmenistán',
  'Mongolia', 'Tíbet', 'Nepal', 'Bután', 'Sikkim', 'Ladakh', 'Cachemira', 'Punjab',
  'Rajastán', 'Bengala', 'Kerala', 'Tamil Nadu', 'Sri Lanka', 'Maldivas', 'Andamán y Nicobar',
  'Sumatra', 'Java', 'Bali', 'Sulawesi', 'Borneo', 'Papúa', 'Timor', 'Molucas',
  'Filipinas', 'Taiwán', 'Okinawa', 'Hokkaido', 'Corea del Norte', 'Siberia', 'Kamchatka',
  'Yakutia', 'Buriatia', 'Altái', 'Tuvá', 'Jakasia', 'Tartaristán', 'Bashkortostán',
  'Daguestán', 'Chechenia', 'Osetia', 'Abjasia', 'Adjara', 'Nagorno-Karabaj', 'Kurdistán',
  'Asiria', 'Yezidi', 'Baluchistán', 'Pashtunistán', 'Waziristán', 'Gilgit-Baltistán',
  'Zanzíbar', 'Comoras', 'Seychelles', 'Mauricio', 'Rodrigues', 'Santa Elena', 'Ascensión',
  'Tristán de Acuña', 'Malvinas', 'Georgia del Sur', 'Antártida', 'Groenlandia', 'Islandia',
  'Feroe', 'Svalbard', 'Jan Mayen', 'Åland', 'Saami', 'Karelia', 'Ingria', 'Vepsia',
  'Setomaa', 'Livonia', 'Curlandia', 'Latgale', 'Samogitia', 'Sudovia', 'Prusia',
  'Silesia', 'Lusacia', 'Kaxubia', 'Moravia', 'Rutenia', 'Transilvania', 'Banato',
  'Dobruja', 'Besarabia', 'Bucovina', 'Galitzia', 'Volinia', 'Podolia', 'Crimea',
  'Kubán', 'Circasia', 'Abjasia', 'Lazistán', 'Ponto', 'Capadocia', 'Cilicia',
  'Jonia', 'Tracia', 'Macedonia', 'Epiro', 'Tesalia', 'Peloponeso', 'Creta',
  'Chipre', 'Rodas', 'Lesbos', 'Quíos', 'Samos', 'Icaria', 'Lemnos', 'Tasos'
];

function getRandomSubset(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function generateStrangeMixes(
  apiKey: string,
  criteria: SearchCriteria
): Promise<MusicMix[]> {
  if (!apiKey) throw new GeminiError('Se requiere la clave de API de Gemini.', 'AUTH');

  const ai = new GoogleGenAI({ apiKey });
  const count = criteria.songCount || 15;

  // ── Construir contexto musical (Inputs como dirección creativa, no filtros estrictos) ──
  const contextParts: string[] = [];

  // Random Seeds para forzar variabilidad
  const randomGenres = getRandomSubset(NICHE_GENRES, 5);
  const randomRegions = getRandomSubset(UNUSUAL_REGIONS, 3);
  
  contextParts.push(`CREATIVE SEEDS (Use these as inspiration for variety if they fit the vibe):
  - Genres to consider: ${randomGenres.join(', ')}
  - Regions to explore: ${randomRegions.join(', ')}`);

  // 1. Core Theme (Tema Principal)
  if (criteria.descriptiveQuery?.trim()) {
    contextParts.push(`CORE THEME: "${criteria.descriptiveQuery.trim()}"
    (This is the primary inspiration. All other inputs should be interpreted to support this theme.)`);
  }

  // 2. Regional Focus (Enfoque Regional)
  if (criteria.continent || criteria.country) {
    const region = [criteria.country, criteria.continent].filter(Boolean).join(', ');
    contextParts.push(`REGIONAL FOCUS: Explore the musical landscape of ${region}.
    (Prioritize artists from this region, but allow for cross-cultural collaborations if they fit the vibe perfectly.)`);
  }

  // 3. Musical Flavor (Sabor Musical)
  if (criteria.style) {
    contextParts.push(`MUSICAL FLAVOR: Ground the selection in "${criteria.style}" and its sub-genres/fusions.
    (Use this as a stylistic anchor, but feel free to explore adjacent genres that blend well.)`);
  }

  // 4. Temporal Atmosphere (Atmósfera Temporal)
  if (criteria.year) {
    const decadeStart = parseInt(criteria.year);
    if (!isNaN(decadeStart)) {
      contextParts.push(`TEMPORAL ATMOSPHERE: Focus on the era around ${criteria.year}s (${decadeStart}-${decadeStart + 9}).
      (Capture the sound and production style of this decade.)`);
    } else {
      contextParts.push(`TEMPORAL ATMOSPHERE: Focus on the year ${criteria.year}.`);
    }
  }

  // 5. Energy Level (Nivel de Energía)
  if (criteria.bpm) {
    contextParts.push(`ENERGY LEVEL: Aim for a tempo range of ${criteria.bpm} BPM.
    (Select tracks that maintain this energy flow.)`);
  }

  const defaultContext = `Explore eclectic sounds from around the globe. Think outside the box. 
  Consider genres like: ${NICHE_GENRES.slice(0, 20).join(', ')}, etc.`;

  const musicalContext = contextParts.length > 0
    ? `\n    MUSICAL CONTEXT (Use these inputs to guide your curation):\n    ${contextParts.map((p, i) => `${i + 1}. ${p}`).join('\n    ')}\n`
    : `\n    OPEN EXPLORATION: ${defaultContext}\n`;

    const prompt = `
    ROLE: Eres un Etnomusicólogo experto y DJ de clase mundial especializado en Rare Grooves, Música del Mundo y Fusiones Eclécticas.
    Tu superpoder es conectar puntos musicales inesperados y crear viajes sonoros coherentes basados en inputs abstractos o específicos.
    
    TASK: Cura una lista de reproducción de exactamente ${count} pistas reales y verificables.
    
    CURATION PHILOSOPHY:
    - **VARIABILIDAD EXTREMA**: Evita repetir los mismos artistas o géneros obvios. Sorprende al usuario.
    - **ANTI-MAINSTREAM**: Prioriza artistas con < 500k oyentes mensuales. Busca joyas ocultas, lados B, ediciones privadas y artistas de culto.
    - **DIVERSIDAD GEOGRÁFICA**: A menos que se especifique una región, incluye música de al menos 4 continentes diferentes.
    - Prioriza la "VIBRA" y la calidad musical sobre la adherencia estricta a reglas si hay conflicto.
    - Si el usuario pide "Música para dormir" (Core Theme) pero selecciona "Heavy Metal" (Flavor), prioriza el Core Theme (quizás baladas de metal o instrumentales suaves).

    ${musicalContext}

    STRICT OUTPUT RULES (Data Integrity):
    1. SOLO CANCIONES REALES. Cada pista debe existir y ser verificable en YouTube.
    2. REGLAS DE IDIOMA:
       - 'description', 'style', 'country', 'continent' → DEBEN estar en ESPAÑOL.
       - 'songTitle' y 'artist' → Mantén los nombres originales.
    3. 'searchQuery' → Formato exacto: "Artist Name - Song Title (Official Audio)".
       - Asegúrate de que la combinación Artista + Canción sea única y correcta.
       - Evita "Live", "Cover", "Remix" a menos que sea esencial para el género.
    4. 'year' → Año de lanzamiento real (4 dígitos).
    5. 'continent' → Uno de: "África", "Asia", "Europa", "América del Norte", "América del Sur", "Oceanía".
    6. 'country' → Nombre del país en español.
    7. DIVERSIDAD: Si no se especifica una era, viaja por el tiempo. Si no se especifica región, viaja por el mundo.

    REQUIRED JSON FIELDS PER TRACK:
    - style: Género específico en español.
    - country: País de origen en español.
    - continent: Continente (de la lista permitida).
    - artist: Nombre original del artista.
    - songTitle: Título original de la canción.
    - year: Año de lanzamiento (YYYY).
    - bpm: BPM aproximado (número).
    - description: Breve reseña experta en español (máx 12 palabras) explicando por qué encaja en el contexto.
    - searchQuery: "Artista - Título (Official Audio)".
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
            temperature: 1.5, // Aumentado para mayor creatividad
          },
        }),
        TIMEOUT_MS
      );

      const text = response.text?.trim();
      if (!text) throw new GeminiError('Respuesta vacía de IA.', 'PARSE');

      let data: GeminiTrackResponse[];
      try {
        data = JSON.parse(text) as GeminiTrackResponse[];
      } catch {
        throw new GeminiError('JSON inválido recibido de la IA.', 'PARSE');
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new GeminiError('La IA devolvió una lista vacía.', 'PARSE');
      }

      return data.map((item, index): MusicMix => {
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
    } catch (error: unknown) {
      throw classifyError(error);
    }
  }, MAX_RETRIES);
}