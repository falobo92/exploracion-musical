import { GoogleGenAI, Type } from "@google/genai";
import { MusicMix, SearchCriteria } from "../types";

export const generateStrangeMixes = async (apiKey: string, criteria: SearchCriteria): Promise<MusicMix[]> => {
  if (!apiKey) throw new Error("API Key is required");

  const ai = new GoogleGenAI({ apiKey });

  // Construct filtering context based on user input
  let context = "";
  if (criteria.continent) context += `Focus on the continent: ${criteria.continent}. `;
  if (criteria.country) context += `Prioritize the country: ${criteria.country}. `;
  if (criteria.style) context += `Focus on the style or subgenre: ${criteria.style}. `;
  if (criteria.year) context += `Focus on the era or year: ${criteria.year}. `;
  if (criteria.bpm) context += `Target a BPM around: ${criteria.bpm}. `;

  const prompt = `
    Generate a list of 30 unique, strange, and eclectic music genre/country combinations.
    The goal is to find real, existing, but rare cultural mashups.
    
    ${context ? `STRICTLY FOLLOW THESE CONSTRAINTS: ${context}` : "Find random strange mixes from around the world."}

    For each item, identify a specific REAL artist or exponent of that style.
    
    IMPORTANT: The output text (style, country, description, continent) MUST BE IN SPANISH.
    
    Return a JSON array where each object contains:
    - style: The genre name (in Spanish).
    - country: The country of origin (in Spanish).
    - continent: The continent (Africa, Asia, Europa, América del Norte, América del Sur, Oceanía).
    - artist: The name of the band or artist.
    - year: Approximate decade or year of the song/style peak (e.g. "1990s", "2023").
    - bpm: Approximate numeric BPM (number).
    - description: A short, 1-sentence description of the sound (in Spanish).
    - searchQuery: A string optimized for YouTube search (e.g., "ArtistName SongTitle" or "ArtistName Style").
    - coordinates: An object with 'lat' and 'lng' (numbers) representing the location of the country or city of origin.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
                  lng: { type: Type.NUMBER }
                },
                required: ["lat", "lng"]
              }
            },
            required: ["style", "country", "continent", "artist", "year", "bpm", "description", "searchQuery", "coordinates"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any, index: number) => ({
        ...item,
        id: `mix-${Date.now()}-${index}`,
      }));
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};