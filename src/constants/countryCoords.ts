/**
 * Coordenadas reales (centroide aproximado) de cada país del atlas.
 * Cubre todos los países de countries.ts + extras comunes que la IA pueda devolver.
 */
export const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  // ── África ──────────────────────────────────────────────
  'Angola':           { lat: -11.2,  lng:  17.9 },
  'Argelia':          { lat:  28.0,  lng:   1.7 },
  'Benín':            { lat:   9.3,  lng:   2.3 },
  'Botsuana':         { lat: -22.3,  lng:  24.7 },
  'Burkina Faso':     { lat:  12.4,  lng:  -1.6 },
  'Cabo Verde':       { lat:  16.0,  lng: -24.0 },
  'Camerún':          { lat:   7.4,  lng:  12.4 },
  'Congo':            { lat:  -4.0,  lng:  21.8 },
  'Costa de Marfil':  { lat:   7.5,  lng:  -5.5 },
  'Egipto':           { lat:  26.8,  lng:  30.8 },
  'Etiopía':          { lat:   9.1,  lng:  40.5 },
  'Ghana':            { lat:   7.9,  lng:  -1.0 },
  'Guinea':           { lat:   9.9,  lng: -11.4 },
  'Kenia':            { lat:  -0.0,  lng:  37.9 },
  'Madagascar':       { lat: -18.8,  lng:  46.9 },
  'Malí':             { lat:  17.6,  lng:  -4.0 },
  'Marruecos':        { lat:  31.8,  lng:  -7.1 },
  'Mauritania':       { lat:  21.0,  lng: -10.9 },
  'Mozambique':       { lat: -18.7,  lng:  35.5 },
  'Namibia':          { lat: -22.6,  lng:  17.1 },
  'Nigeria':          { lat:   9.1,  lng:   8.7 },
  'Ruanda':           { lat:  -1.9,  lng:  29.9 },
  'Senegal':          { lat:  14.5,  lng: -14.5 },
  'Somalia':          { lat:   5.2,  lng:  46.2 },
  'Sudáfrica':        { lat: -30.6,  lng:  22.9 },
  'Sudán':            { lat:  12.9,  lng:  30.2 },
  'Tanzania':         { lat:  -6.4,  lng:  34.9 },
  'Togo':             { lat:   8.6,  lng:   0.8 },
  'Túnez':            { lat:  33.9,  lng:   9.5 },
  'Uganda':           { lat:   1.4,  lng:  32.3 },
  'Zimbabue':         { lat: -19.0,  lng:  29.2 },

  // ── Asia ────────────────────────────────────────────────
  'Afganistán':       { lat:  33.9,  lng:  67.7 },
  'Arabia Saudita':   { lat:  23.9,  lng:  45.1 },
  'Bangladesh':       { lat:  23.7,  lng:  90.4 },
  'Camboya':          { lat:  12.6,  lng: 105.0 },
  'China':            { lat:  35.9,  lng: 104.2 },
  'Corea del Norte':  { lat:  40.3,  lng: 127.5 },
  'Corea del Sur':    { lat:  35.9,  lng: 127.8 },
  'Emiratos Árabes':  { lat:  23.4,  lng:  53.8 },
  'Filipinas':        { lat:  12.9,  lng: 121.8 },
  'Georgia':          { lat:  42.3,  lng:  43.4 },
  'India':            { lat:  20.6,  lng:  79.0 },
  'Indonesia':        { lat:  -0.8,  lng: 113.9 },
  'Irak':             { lat:  33.2,  lng:  43.7 },
  'Irán':             { lat:  32.4,  lng:  53.7 },
  'Israel':           { lat:  31.0,  lng:  34.9 },
  'Japón':            { lat:  36.2,  lng: 138.3 },
  'Jordania':         { lat:  30.6,  lng:  36.2 },
  'Kazajistán':       { lat:  48.0,  lng:  68.0 },
  'Kirguistán':       { lat:  41.2,  lng:  74.8 },
  'Líbano':           { lat:  33.9,  lng:  35.9 },
  'Malasia':          { lat:   4.2,  lng: 101.9 },
  'Mongolia':         { lat:  46.9,  lng: 103.8 },
  'Myanmar':          { lat:  21.9,  lng:  95.9 },
  'Nepal':            { lat:  28.4,  lng:  84.1 },
  'Pakistán':         { lat:  30.4,  lng:  69.3 },
  'Palestina':        { lat:  31.9,  lng:  35.2 },
  'Singapur':         { lat:   1.4,  lng: 103.8 },
  'Siria':            { lat:  34.8,  lng:  39.0 },
  'Sri Lanka':        { lat:   7.9,  lng:  80.8 },
  'Tailandia':        { lat:  15.9,  lng: 100.9 },
  'Taiwán':           { lat:  23.7,  lng: 121.0 },
  'Tayikistán':       { lat:  38.9,  lng:  71.3 },
  'Turquía':          { lat:  38.9,  lng:  35.2 },
  'Turkmenistán':     { lat:  39.0,  lng:  59.6 },
  'Uzbekistán':       { lat:  41.4,  lng:  64.6 },
  'Vietnam':          { lat:  14.1,  lng: 108.3 },
  'Yemen':            { lat:  15.6,  lng:  48.5 },

  // ── Europa ──────────────────────────────────────────────
  'Albania':              { lat:  41.2,  lng:  20.2 },
  'Alemania':             { lat:  51.2,  lng:  10.5 },
  'Armenia':              { lat:  40.1,  lng:  45.0 },
  'Austria':              { lat:  47.5,  lng:  14.6 },
  'Azerbaiyán':           { lat:  40.1,  lng:  47.6 },
  'Bélgica':              { lat:  50.8,  lng:   4.5 },
  'Bielorrusia':          { lat:  53.7,  lng:  27.9 },
  'Bosnia y Herzegovina': { lat:  43.9,  lng:  17.7 },
  'Bulgaria':             { lat:  42.7,  lng:  25.5 },
  'Croacia':              { lat:  45.1,  lng:  15.2 },
  'Dinamarca':            { lat:  56.3,  lng:   9.5 },
  'Eslovaquia':           { lat:  48.7,  lng:  19.7 },
  'Eslovenia':            { lat:  46.2,  lng:  15.0 },
  'España':               { lat:  40.5,  lng:  -3.7 },
  'Estonia':              { lat:  58.6,  lng:  25.0 },
  'Finlandia':            { lat:  61.9,  lng:  25.7 },
  'Francia':              { lat:  46.2,  lng:   2.2 },
  'Grecia':               { lat:  39.1,  lng:  21.8 },
  'Hungría':              { lat:  47.2,  lng:  19.5 },
  'Irlanda':              { lat:  53.1,  lng:  -7.7 },
  'Islandia':             { lat:  64.9,  lng: -19.0 },
  'Italia':               { lat:  41.9,  lng:  12.6 },
  'Letonia':              { lat:  56.9,  lng:  24.1 },
  'Lituania':             { lat:  55.2,  lng:  23.9 },
  'Luxemburgo':           { lat:  49.8,  lng:   6.1 },
  'Macedonia del Norte':  { lat:  41.5,  lng:  21.7 },
  'Moldavia':             { lat:  47.4,  lng:  28.4 },
  'Montenegro':           { lat:  42.7,  lng:  19.4 },
  'Noruega':              { lat:  60.5,  lng:   8.5 },
  'Países Bajos':         { lat:  52.1,  lng:   5.3 },
  'Polonia':              { lat:  51.9,  lng:  19.1 },
  'Portugal':             { lat:  39.4,  lng:  -8.2 },
  'Reino Unido':          { lat:  55.4,  lng:  -3.4 },
  'República Checa':      { lat:  49.8,  lng:  15.5 },
  'Rumanía':              { lat:  45.9,  lng:  25.0 },
  'Rusia':                { lat:  61.5,  lng: 105.3 },
  'Serbia':               { lat:  44.0,  lng:  21.0 },
  'Suecia':               { lat:  60.1,  lng:  18.6 },
  'Suiza':                { lat:  46.8,  lng:   8.2 },
  'Ucrania':              { lat:  48.4,  lng:  31.2 },

  // ── América del Norte ───────────────────────────────────
  'Bahamas':              { lat:  25.0,  lng: -77.4 },
  'Barbados':             { lat:  13.2,  lng: -59.5 },
  'Belice':               { lat:  17.2,  lng: -88.5 },
  'Canadá':               { lat:  56.1,  lng: -106.3 },
  'Costa Rica':           { lat:   9.7,  lng: -83.8 },
  'Cuba':                 { lat:  21.5,  lng: -77.8 },
  'El Salvador':          { lat:  13.8,  lng: -88.9 },
  'Estados Unidos':       { lat:  37.1,  lng: -95.7 },
  'Guatemala':            { lat:  15.8,  lng: -90.2 },
  'Haití':                { lat:  18.9,  lng: -72.3 },
  'Honduras':             { lat:  15.2,  lng: -86.2 },
  'Jamaica':              { lat:  18.1,  lng: -77.3 },
  'México':               { lat:  23.6,  lng: -102.6 },
  'Nicaragua':            { lat:  12.9,  lng: -85.2 },
  'Panamá':               { lat:   8.5,  lng: -80.8 },
  'Puerto Rico':          { lat:  18.2,  lng: -66.6 },
  'República Dominicana': { lat:  18.7,  lng: -70.2 },
  'Trinidad y Tobago':    { lat:  10.7,  lng: -61.2 },

  // ── América del Sur ─────────────────────────────────────
  'Argentina':  { lat: -38.4,  lng: -63.6 },
  'Bolivia':    { lat: -16.3,  lng: -63.6 },
  'Brasil':     { lat: -14.2,  lng: -51.9 },
  'Chile':      { lat: -35.7,  lng: -71.5 },
  'Colombia':   { lat:   4.6,  lng: -74.3 },
  'Ecuador':    { lat:  -1.8,  lng: -78.2 },
  'Guyana':     { lat:   5.0,  lng: -58.9 },
  'Paraguay':   { lat: -23.4,  lng: -58.4 },
  'Perú':       { lat:  -9.2,  lng: -75.0 },
  'Surinam':    { lat:   3.9,  lng: -56.0 },
  'Uruguay':    { lat: -32.5,  lng: -55.8 },
  'Venezuela':  { lat:   6.4,  lng: -66.6 },

  // ── Oceanía ─────────────────────────────────────────────
  'Australia':          { lat: -25.3,  lng: 133.8 },
  'Fiyi':               { lat: -17.7,  lng: 178.1 },
  'Micronesia':         { lat:   7.4,  lng: 150.6 },
  'Nueva Zelanda':      { lat: -40.9,  lng: 174.9 },
  'Papúa Nueva Guinea': { lat:  -6.3,  lng: 143.9 },
  'Samoa':              { lat: -13.8,  lng: -172.1 },
  'Tonga':              { lat: -21.2,  lng: -175.2 },
  'Vanuatu':            { lat: -15.4,  lng: 166.9 },
};

/** Coordenadas fallback por continente */
export const CONTINENT_COORDS: Record<string, { lat: number; lng: number }> = {
  'África':             { lat:   9.1,  lng:  18.7 },
  'Africa':             { lat:   9.1,  lng:  18.7 },
  'Asia':               { lat:  34.0,  lng: 100.6 },
  'Europa':             { lat:  54.5,  lng:  15.3 },
  'Europe':             { lat:  54.5,  lng:  15.3 },
  'América del Norte':  { lat:  23.6,  lng: -102.6 },
  'North America':      { lat:  23.6,  lng: -102.6 },
  'América del Sur':    { lat: -14.6,  lng: -57.7 },
  'South America':      { lat: -14.6,  lng: -57.7 },
  'Oceanía':            { lat: -22.7,  lng: 140.0 },
  'Oceania':            { lat: -22.7,  lng: 140.0 },
};

/**
 * Normaliza una cadena eliminando tildes y convirtiendo a minúsculas.
 */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Busca las coordenadas de un país. Primero intenta una coincidencia exacta,
 * luego una búsqueda fuzzy sin acentos. Si no encuentra, usa el continente
 * como fallback, y en último caso devuelve el centro del mundo.
 */
export function getCoordsForCountry(
  country: string,
  continent?: string
): { lat: number; lng: number } {
  // Búsqueda exacta
  if (COUNTRY_COORDS[country]) {
    return COUNTRY_COORDS[country];
  }

  // Búsqueda normalizada (sin tildes, minúsculas)
  const normalizedInput = normalize(country);
  for (const [key, coords] of Object.entries(COUNTRY_COORDS)) {
    if (normalize(key) === normalizedInput) {
      return coords;
    }
  }

  // Fallback al continente
  if (continent) {
    if (CONTINENT_COORDS[continent]) {
      return CONTINENT_COORDS[continent];
    }
    const normalizedContinent = normalize(continent);
    for (const [key, coords] of Object.entries(CONTINENT_COORDS)) {
      if (normalize(key) === normalizedContinent) {
        return coords;
      }
    }
  }

  // Centro del mundo
  return { lat: 20, lng: 0 };
}
