import React, { useState, useEffect, useCallback } from 'react';
import { MixCard } from './components/MixCard';
import { PlayerBar } from './components/PlayerBar';
import { WorldMap } from './components/WorldMap';
import { SettingsModal } from './components/SettingsModal';
import { generateStrangeMixes } from './services/gemini';
import { searchVideoWithKey, getGoogleAccessToken, createYouTubePlaylist, addVideoToPlaylist } from './services/youtube';
import { MusicMix, SearchCriteria } from './types';

const SUGGESTED_STYLES = [
  "Rock", "Jazz", "Hip Hop", "Electrónica", "Folk", "Metal", "Reggae", 
  "Pop", "Clásica", "Punk", "Blues", "Funk", "Soul", "Disco", "House", 
  "Techno", "Ambient", "Ska", "Gospel", "Country", "Latina", "K-Pop", 
  "Afrobeat", "Cumbia", "Flamenco", "Tango", "Samba", "Bossa Nova", 
  "Salsa", "Reggaeton", "Grunge", "Indie", "Psicodelia", "Experimental", 
  "Industrial", "Synthpop", "Post-Punk", "Shoegaze", "Lo-Fi", "Vaporwave",
  "Trap", "Drum and Bass", "Dubstep", "Grime", "R&B"
].sort();

const DEMO_MIXES: MusicMix[] = [
  { id: '1', style: 'Rap Persa', country: 'Irán', continent: 'Asia', artist: 'Hichkas', year: '2000s', bpm: 90, description: 'El padre del rap persa, mezclando ritmos tradicionales con flujos callejeros de Teherán.', searchQuery: 'Hichkas Persian Rap', coordinates: { lat: 32.4279, lng: 53.6880 } },
  { id: '2', style: 'Rock Progresivo', country: 'Italia', continent: 'Europa', artist: 'Premiata Forneria Marconi', year: '1970s', bpm: 120, description: 'Prog rock italiano que fusiona la música clásica con el rock sinfónico más ambicioso.', searchQuery: 'Premiata Forneria Marconi Celebration', coordinates: { lat: 41.9029, lng: 12.4534 } },
  { id: '3', style: 'Reggae Eslavo', country: 'Polonia', continent: 'Europa', artist: 'Habakuk', year: '1990s', bpm: 75, description: 'Una visión polaca del roots reggae mezclado con sensibilidades folk eslavas.', searchQuery: 'Habakuk Polish Reggae', coordinates: { lat: 51.9194, lng: 19.1451 } },
  { id: '4', style: 'Death Metal', country: 'Botsuana', continent: 'África', artist: 'Overthrust', year: '2010s', bpm: 180, description: 'Death metal de la vieja escuela desde la subcultura metalera de Botsuana.', searchQuery: 'Overthrust Botswana Metal', coordinates: { lat: -22.3285, lng: 24.6849 } },
  { id: '5', style: 'Hip Hop Mongol', country: 'Mongolia', continent: 'Asia', artist: 'Gee', year: '2000s', bpm: 95, description: 'Rap con flujo agresivo en mongol sobre ritmos trap con toques de canto gutural.', searchQuery: 'Gee Mongolian Hip Hop', coordinates: { lat: 46.8625, lng: 103.8467 } },
  { id: '6', style: 'Cumbia Psicodélica', country: 'Perú', continent: 'América del Sur', artist: 'Los Destellos', year: '1970s', bpm: 110, description: 'Cumbia peruana con guitarras eléctricas surf y efectos psicodélicos amazónicos.', searchQuery: 'Los Destellos cumbia psicodelica', coordinates: { lat: -12.0464, lng: -77.0428 } },
];

export default function App() {
  const [mixes, setMixes] = useState<MusicMix[]>(DEMO_MIXES);
  const [loading, setLoading] = useState(false);
  
  // Player state
  const [currentMixIndex, setCurrentMixIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  
  // API Keys — env vars as defaults, localStorage as override
  const [geminiKey, setGeminiKey] = useState<string>(() => 
    localStorage.getItem('gemini_key') || process.env.GEMINI_API_KEY || ""
  );
  const [googleKey, setGoogleKey] = useState<string>(() => 
    localStorage.getItem('google_key') || process.env.GOOGLE_API_KEY || ""
  );
  const [googleClientId, setGoogleClientId] = useState<string>(() => 
    localStorage.getItem('google_client_id') || process.env.GOOGLE_CLIENT_ID || ""
  );
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);

  // Persist keys
  useEffect(() => { if (geminiKey) localStorage.setItem('gemini_key', geminiKey); }, [geminiKey]);
  useEffect(() => { if (googleKey) localStorage.setItem('google_key', googleKey); }, [googleKey]);
  useEffect(() => { if (googleClientId) localStorage.setItem('google_client_id', googleClientId); }, [googleClientId]);

  // Filters
  const [criteria, setCriteria] = useState<SearchCriteria>({
    continent: '', country: '', style: '', year: '', bpm: ''
  });

  // --- Player ---

  // Search video when current track changes
  useEffect(() => {
    if (currentMixIndex === -1) return;
    
    const mix = mixes[currentMixIndex];
    if (!mix) return;

    if (mix.videoId) {
      setIsPlaying(true);
      setStatusMsg(`${mix.artist} — ${mix.style}`);
      return;
    }

    if (!googleKey) {
      setStatusMsg("Configura tu clave de Google en Ajustes para reproducir.");
      setIsSettingsOpen(true);
      setIsPlaying(false);
      return;
    }

    setStatusMsg(`Buscando: ${mix.artist}...`);
    searchVideoWithKey(mix.searchQuery, googleKey).then(foundId => {
      if (foundId) {
        setMixes(prev => prev.map((m, i) => i === currentMixIndex ? { ...m, videoId: foundId } : m));
        setStatusMsg(`${mix.artist} — ${mix.style}`);
        setIsPlaying(true);
      } else {
        setStatusMsg(`No se encontró video para ${mix.artist}`);
        handleNext();
      }
    }).catch(() => {
      setStatusMsg("Error buscando video. Verifica tu clave API.");
      setIsPlaying(false);
    });
  }, [currentMixIndex, googleKey]);

  const handlePlayCard = (mix: MusicMix) => {
    const index = mixes.findIndex(m => m.id === mix.id);
    if (index === currentMixIndex) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentMixIndex(index);
    }
  };

  const handleNext = useCallback(() => {
    setCurrentMixIndex(prev => {
      if (shuffle) {
        if (mixes.length <= 1) return prev;
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * mixes.length);
        }
        return next;
      }
      if (prev < mixes.length - 1) return prev + 1;
      setIsPlaying(false);
      setStatusMsg('');
      return -1;
    });
  }, [mixes.length, shuffle]);

  const handlePrev = useCallback(() => {
    setCurrentMixIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);
  
  const handlePlayAll = () => {
    if (mixes.length > 0) {
      setCurrentMixIndex(0);
      setIsPlaying(true);
    }
  };

  const handleMapSelect = (mix: MusicMix) => {
    handlePlayCard(mix);
  };

  // --- YouTube Playlist ---

  const handleSavePlaylist = async () => {
    if (!googleClientId) {
      setStatusMsg("Configura tu Google Client ID en Ajustes para crear playlists.");
      setIsSettingsOpen(true);
      return;
    }

    if (mixes.length === 0) {
      setStatusMsg("No hay mixes para guardar.");
      return;
    }

    setIsSavingPlaylist(true);

    try {
      // 1. Authenticate with Google
      setStatusMsg("Autenticando con Google...");
      const accessToken = await getGoogleAccessToken(googleClientId);
      
      // 2. Search for videos that don't have IDs yet
      const updatedMixes = [...mixes];
      if (googleKey) {
        for (let i = 0; i < updatedMixes.length; i++) {
          if (!updatedMixes[i].videoId) {
            setStatusMsg(`Buscando videos... (${i + 1}/${updatedMixes.length})`);
            const foundId = await searchVideoWithKey(updatedMixes[i].searchQuery, googleKey);
            if (foundId) {
              updatedMixes[i] = { ...updatedMixes[i], videoId: foundId };
            }
            await new Promise(r => setTimeout(r, 150));
          }
        }
        setMixes(updatedMixes);
      }
      
      // 3. Filter mixes with video IDs
      const mixesWithVideo = updatedMixes.filter(m => m.videoId);
      
      if (mixesWithVideo.length === 0) {
        setStatusMsg("No se encontraron videos para la playlist.");
        return;
      }
      
      // 4. Create playlist
      setStatusMsg("Creando playlist en YouTube...");
      const title = `Atlas Sónico — ${new Date().toLocaleDateString('es-ES')}`;
      const desc = `Playlist generada por Atlas Sónico con ${mixesWithVideo.length} descubrimientos musicales del mundo.`;
      const playlistId = await createYouTubePlaylist(accessToken, title, desc);
      
      // 5. Add videos to playlist
      let addedCount = 0;
      for (let i = 0; i < mixesWithVideo.length; i++) {
        setStatusMsg(`Añadiendo a playlist... (${i + 1}/${mixesWithVideo.length})`);
        const ok = await addVideoToPlaylist(accessToken, playlistId, mixesWithVideo[i].videoId!);
        if (ok) addedCount++;
        await new Promise(r => setTimeout(r, 200));
      }
      
      setStatusMsg(`Playlist creada con ${addedCount} videos`);
      window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank');
      
    } catch (error: any) {
      console.error("Error creating playlist:", error);
      setStatusMsg(`Error: ${error.message || "No se pudo crear la playlist."}`);
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  // --- AI Generation ---

  const handleGenerate = async () => {
    const keyToUse = geminiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      setStatusMsg("Falta la clave de Gemini.");
      setIsSettingsOpen(true);
      return;
    }

    setLoading(true);
    setCurrentMixIndex(-1);
    setIsPlaying(false);
    setStatusMsg("Generando descubrimientos musicales con IA...");
    
    try {
      const newMixes = await generateStrangeMixes(keyToUse, criteria);
      setMixes(newMixes);
      setStatusMsg(`${newMixes.length} descubrimientos generados`);
    } catch (error) {
      console.error(error);
      setStatusMsg("Error generando mezclas. Verifica tu clave de Gemini.");
      setIsSettingsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCriteria({ ...criteria, [e.target.name]: e.target.value });
  };

  const currentMix = currentMixIndex >= 0 ? mixes[currentMixIndex] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                Atlas <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Sónico</span>
              </h1>
              <p className="text-zinc-500 text-xs">Descubre música rara del mundo con IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {statusMsg && (
              <div className="text-xs text-zinc-400 font-mono max-w-[250px] truncate hidden md:block">
                {statusMsg}
              </div>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-all border border-zinc-700/50"
              title="Configuración"
              aria-label="Abrir configuración"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6" style={{ paddingBottom: currentMix ? 240 : 40 }}>
        
        {/* Filters */}
        <section className="mb-8 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Explorar sonidos</h2>
            <span className="text-[10px] text-zinc-600 font-mono">{mixes.length} resultados</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select 
              name="continent"
              value={criteria.continent}
              onChange={handleInputChange}
              aria-label="Seleccionar continente"
              className="bg-zinc-950 border border-zinc-800/60 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            >
              <option value="">Cualquier continente</option>
              <option value="Africa">África</option>
              <option value="Asia">Asia</option>
              <option value="Europe">Europa</option>
              <option value="North America">América del Norte</option>
              <option value="South America">América del Sur</option>
              <option value="Oceania">Oceanía</option>
            </select>

            <input type="text" name="country" placeholder="País..." value={criteria.country}
              onChange={handleInputChange}
              className="bg-zinc-950 border border-zinc-800/60 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            />

            <div>
              <input type="text" name="style" list="style-suggestions" placeholder="Estilo..." 
                value={criteria.style} onChange={handleInputChange}
                className="bg-zinc-950 border border-zinc-800/60 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              />
              <datalist id="style-suggestions">
                {SUGGESTED_STYLES.map(style => <option key={style} value={style} />)}
              </datalist>
            </div>

            <input type="text" name="year" placeholder="Década..." value={criteria.year}
              onChange={handleInputChange}
              className="bg-zinc-950 border border-zinc-800/60 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            />

            <input type="number" name="bpm" placeholder="BPM..." value={criteria.bpm}
              onChange={handleInputChange}
              className="bg-zinc-950 border border-zinc-800/60 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
            {mixes.length > 0 && (
              <>
                <button onClick={handleSavePlaylist} disabled={isSavingPlaylist}
                  className="px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm border border-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPlaylist ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M19 11v6M16 14h6" />
                      </svg>
                      Guardar playlist en YouTube
                    </>
                  )}
                </button>

                <button onClick={handlePlayAll}
                  className="px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm border border-zinc-700/50"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Reproducir todo
                </button>
              </>
            )}

            <button onClick={handleGenerate} disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generar con IA
                </>
              )}
            </button>
          </div>
        </section>

        {/* Map */}
        <WorldMap 
          mixes={mixes} 
          onSelect={handleMapSelect} 
          selectedId={currentMix?.id}
          apiKey={googleKey}
        />

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mixes.map((mix) => (
            <MixCard 
              key={mix.id} 
              mix={mix} 
              onPlay={handlePlayCard}
              isPlaying={currentMix?.id === mix.id && isPlaying}
              isCurrent={currentMix?.id === mix.id}
            />
          ))}
        </div>
        
        {mixes.length === 0 && !loading && (
          <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800/50">
            <div className="text-4xl mb-4">🌍</div>
            <p className="text-zinc-500 text-lg mb-2">No hay resultados</p>
            <p className="text-zinc-600 text-sm">Configura los filtros y haz clic en "Generar con IA"</p>
          </div>
        )}
      </main>

      {/* Player */}
      <PlayerBar 
        currentMix={currentMix}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onNext={handleNext}
        onPrev={handlePrev}
        videoId={currentMix?.videoId}
        onVideoEnd={handleNext}
        currentIndex={currentMixIndex}
        totalTracks={mixes.length}
        onSavePlaylist={handleSavePlaylist}
        isSavingPlaylist={isSavingPlaylist}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle(!shuffle)}
      />

      {/* Settings */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        googleKey={googleKey}
        setGoogleKey={setGoogleKey}
        googleClientId={googleClientId}
        setGoogleClientId={setGoogleClientId}
      />
    </div>
  );
}
