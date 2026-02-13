import React, { useState, useEffect } from 'react';
import { MixCard } from './components/MixCard';
import { PlayerBar } from './components/PlayerBar';
import { WorldMap } from './components/WorldMap';
import { SettingsModal } from './components/SettingsModal';
import { generateStrangeMixes } from './services/gemini';
import { createPlaylist, searchVideo, addVideoToPlaylist } from './services/youtube';
import { MusicMix, GoogleAuthResponse, SearchCriteria } from './types';

// Lista de estilos sugeridos para el datalist
const SUGGESTED_STYLES = [
  "Rock", "Jazz", "Hip Hop", "Electrónica", "Folk", "Metal", "Reggae", 
  "Pop", "Clásica", "Punk", "Blues", "Funk", "Soul", "Disco", "House", 
  "Techno", "Ambient", "Ska", "Gospel", "Country", "Latina", "K-Pop", 
  "Afrobeat", "Cumbia", "Flamenco", "Tango", "Samba", "Bossa Nova", 
  "Salsa", "Reggaeton", "Grunge", "Indie", "Psicodelia", "Experimental", 
  "Industrial", "Synthpop", "Post-Punk", "Shoegaze", "Lo-Fi", "Vaporwave",
  "Trap", "Drum and Bass", "Dubstep", "Grime", "R&B"
].sort();

// Datos de demostración
const DEMO_MIXES: MusicMix[] = [
  { id: '1', style: 'Rap', country: 'Irán', continent: 'Asia', artist: 'Hichkas', year: '2000s', bpm: 90, description: 'El padre del rap persa, mezclando ritmos tradicionales con flujos callejeros de Teherán.', searchQuery: 'Hichkas Persian Rap', coordinates: { lat: 32.4279, lng: 53.6880 } },
  { id: '2', style: 'Rock Progresivo', country: 'Vaticano', continent: 'Europa', artist: 'Metempsychosis', year: '2010s', bpm: 120, description: 'Bandas de rock formadas por seminaristas dentro de los muros del Vaticano.', searchQuery: 'Metempsychosis Vatican Rock', coordinates: { lat: 41.9029, lng: 12.4534 } },
  { id: '3', style: 'Reggae', country: 'Polonia', continent: 'Europa', artist: 'Habakuk', year: '1990s', bpm: 75, description: 'Una visión distintiva polaca del roots reggae mezclado con sensibilidades folk eslavas.', searchQuery: 'Habakuk Polish Reggae', coordinates: { lat: 51.9194, lng: 19.1451 } },
  { id: '4', style: 'Death Metal', country: 'Botsuana', continent: 'África', artist: 'Overthrust', year: '2010s', bpm: 180, description: 'Death metal de la vieja escuela de la subcultura de metaleros vaqueros de Botsuana.', searchQuery: 'Overthrust Botswana Metal', coordinates: { lat: -22.3285, lng: 24.6849 } },
  { id: '5', style: 'Hip Hop', country: 'Mongolia', continent: 'Asia', artist: 'Ginex', year: '2000s', bpm: 95, description: 'Rap con flujo agresivo en mongol sobre ritmos trap pesados.', searchQuery: 'Ginex Mongolian Hip Hop', coordinates: { lat: 46.8625, lng: 103.8467 } },
];

export default function App() {
  const [mixes, setMixes] = useState<MusicMix[]>(DEMO_MIXES);
  const [loading, setLoading] = useState(false);
  
  // Player State
  const [currentMixIndex, setCurrentMixIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // API Key State
  // Use localStorage to persist keys, defaulting Gemini to env but Maps to empty (to avoid InvalidKeyMapError)
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_key') || process.env.API_KEY || "";
  });
  const [mapsApiKey, setMapsApiKey] = useState<string>(() => {
    return localStorage.getItem('maps_key') || "";
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist keys when they change
  useEffect(() => {
    if (geminiKey) localStorage.setItem('gemini_key', geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    if (mapsApiKey) localStorage.setItem('maps_key', mapsApiKey);
  }, [mapsApiKey]);

  // Filtros
  const [criteria, setCriteria] = useState<SearchCriteria>({
    continent: '',
    country: '',
    style: '',
    year: '',
    bpm: ''
  });
  
  // Estado Auth YouTube
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState<string>('');

  useEffect(() => {
    if (window.google) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_CLIENT_ID_HERE', // Reemplazar con variable de entorno en prod
        scope: 'https://www.googleapis.com/auth/youtube',
        callback: (tokenResponse: GoogleAuthResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            setStatusMsg("¡Conectado a YouTube!");
          }
        },
      });
      setTokenClient(client);
    }
  }, []);

  const handleAuth = () => {
    if (tokenClient) {
      try {
        tokenClient.requestAccessToken();
      } catch (e) {
        alert("Google Identity Client ID no configurado. Por favor, revisa el código.");
      }
    } else {
      alert("El script de Google Identity Services no ha cargado.");
    }
  };

  // --- Logic for Player ---
  
  // Resolve Video ID just in time
  useEffect(() => {
    const resolveVideoId = async () => {
      if (currentMixIndex === -1) return;
      
      const mix = mixes[currentMixIndex];
      
      // If we already have the ID, just ensure playing
      if (mix.videoId) {
        if (!isPlaying) setIsPlaying(true);
        return;
      }

      // We need to fetch it
      if (!accessToken) {
        setStatusMsg("Se requiere conexión a YouTube para reproducir.");
        // Try to ask for auth if user clicked play
        handleAuth();
        setIsPlaying(false);
        return;
      }

      setStatusMsg(`Buscando video para ${mix.artist}...`);
      try {
        const foundId = await searchVideo(mix.searchQuery, accessToken);
        if (foundId) {
          // Update the specific mix with the found ID so we don't search again
          setMixes(prev => prev.map((m, i) => i === currentMixIndex ? { ...m, videoId: foundId } : m));
          setStatusMsg(`Reproduciendo: ${mix.artist}`);
          setIsPlaying(true);
        } else {
          setStatusMsg(`No se encontró video para ${mix.artist}, saltando...`);
          handleNext();
        }
      } catch (e) {
        console.error("Error finding video", e);
        setStatusMsg("Error buscando video.");
        setIsPlaying(false);
      }
    };

    resolveVideoId();
  }, [currentMixIndex, accessToken]); // Depend on index change

  const handlePlayCard = (mix: MusicMix) => {
    const index = mixes.findIndex(m => m.id === mix.id);
    if (index === currentMixIndex) {
      // Toggle
      setIsPlaying(!isPlaying);
    } else {
      // New Song
      setCurrentMixIndex(index);
      setIsPlaying(true); // Will trigger effect to load video
    }
  };

  const handleNext = () => {
    if (currentMixIndex < mixes.length - 1) {
      setCurrentMixIndex(prev => prev + 1);
    } else {
      // Loop or stop? Stop for now.
      setIsPlaying(false);
      setCurrentMixIndex(-1);
    }
  };

  const handlePrev = () => {
    if (currentMixIndex > 0) {
      setCurrentMixIndex(prev => prev - 1);
    }
  };
  
  const handlePlayAll = () => {
    if (mixes.length > 0) {
      setCurrentMixIndex(0);
      setIsPlaying(true);
    }
  };

  const handleMapSelect = (mix: MusicMix) => {
    handlePlayCard(mix);
    // Optional: Scroll to card logic could go here
  };

  // ------------------------

  const handleGenerate = async () => {
    const keyToUse = geminiKey || process.env.API_KEY;
    if (!keyToUse) {
      setStatusMsg("API Key faltante. Abre configuración.");
      setIsSettingsOpen(true);
      return;
    }

    setLoading(true);
    setCurrentMixIndex(-1); // Reset player
    setIsPlaying(false);
    setStatusMsg("Consultando al oráculo sónico por sonidos extraños...");
    
    try {
      const newMixes = await generateStrangeMixes(keyToUse, criteria);
      setMixes(newMixes);
      setStatusMsg(`Se encontraron ${newMixes.length} mezclas raras.`);
    } catch (error) {
      console.error(error);
      setStatusMsg("Error generando mezclas. Verifica tu clave API.");
      setIsSettingsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const createMasterPlaylist = async () => {
    if (!accessToken) return;
    setStatusMsg("Creando playlist 'Mezclas Globales Extrañas'...");
    try {
      const id = await createPlaylist(
        `Mezclas Extrañas - ${new Date().toLocaleDateString()}`,
        "Una colección de música global extraña y maravillosa generada por IA.",
        accessToken
      );
      setPlaylistId(id);
      setStatusMsg("¡Playlist creada! Lista para agregar canciones.");
      return id;
    } catch (e) {
      setStatusMsg("Error al crear playlist.");
      console.error(e);
      return null;
    }
  };

  const addToPlaylist = async (mix: MusicMix) => {
    if (!accessToken) {
      handleAuth();
      return;
    }

    setProcessingQueue(prev => new Set(prev).add(mix.id));
    
    try {
      let currentPlaylistId = playlistId;
      if (!currentPlaylistId) {
        currentPlaylistId = await createMasterPlaylist();
      }

      if (currentPlaylistId) {
        // Reuse videoId if we already found it during playback
        let videoId = mix.videoId;
        
        if (!videoId) {
           videoId = await searchVideo(mix.searchQuery, accessToken) || undefined;
           // Cache it
           if (videoId) {
              setMixes(prev => prev.map(m => m.id === mix.id ? { ...m, videoId } : m));
           }
        }

        if (videoId) {
          await addVideoToPlaylist(currentPlaylistId, videoId, accessToken);
          setStatusMsg(`Añadido ${mix.artist} a la playlist.`);
        } else {
          setStatusMsg(`No se encontró video para ${mix.artist}.`);
        }
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Error al añadir a la playlist.");
    } finally {
      setProcessingQueue(prev => {
        const next = new Set(prev);
        next.delete(mix.id);
        return next;
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCriteria({
      ...criteria,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 pb-32 font-sans">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">
            Explorador <span className="text-indigo-500">Sónico</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl">
            Descubre cruces musicales raros. Desde Rap Iraní hasta Rock del Vaticano.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
           <div className="text-xs text-zinc-500 font-mono mb-1 h-4">
             {statusMsg}
           </div>
           
           <div className="flex gap-3">
            <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700"
               title="Configuración"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>

            {!accessToken ? (
               <button 
                 onClick={handleAuth}
                 className="px-5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-all border border-zinc-700 text-sm"
               >
                 Conectar YouTube
               </button>
            ) : (
              <div className="px-5 py-2 rounded-full bg-green-900/30 text-green-400 font-mono text-sm border border-green-900 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                YouTube Conectado
              </div>
            )}
           </div>
        </div>
      </header>

      {/* Barra de Búsqueda y Filtros */}
      <section className="max-w-7xl mx-auto mb-12 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Configurar Búsqueda de IA</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <select 
            name="continent"
            value={criteria.continent}
            onChange={handleInputChange}
            className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
          >
            <option value="">Cualquier Continente</option>
            <option value="Africa">África</option>
            <option value="Asia">Asia</option>
            <option value="Europe">Europa</option>
            <option value="North America">América del Norte</option>
            <option value="South America">América del Sur</option>
            <option value="Oceania">Oceanía</option>
          </select>

          <input 
            type="text" 
            name="country" 
            placeholder="País (ej. Japón)" 
            value={criteria.country}
            onChange={handleInputChange}
            className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
          />

          {/* Input con Datalist para Estilos */}
          <div className="relative">
            <input 
              type="text" 
              name="style" 
              list="style-suggestions"
              placeholder="Estilo (ej. Jazz o elige)" 
              value={criteria.style}
              onChange={handleInputChange}
              className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            />
            <datalist id="style-suggestions">
              {SUGGESTED_STYLES.map(style => (
                <option key={style} value={style} />
              ))}
            </datalist>
          </div>

           <input 
            type="text" 
            name="year" 
            placeholder="Año/Década" 
            value={criteria.year}
            onChange={handleInputChange}
            className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
          />

          <input 
            type="number" 
            name="bpm" 
            placeholder="BPM Aprox." 
            value={criteria.bpm}
            onChange={handleInputChange}
            className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
          />

        </div>
        <div className="mt-4 flex justify-end gap-3">
          {mixes.length > 0 && (
             <button
               onClick={handlePlayAll}
               className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
             >
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
               Reproducir Todo
             </button>
          )}

          <button 
              onClick={handleGenerate}
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 w-full md:w-auto justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>Generar Mezclas</span>
                </>
              )}
            </button>
        </div>
      </section>

      <main className="max-w-7xl mx-auto">
        
        {/* Mapa Mundial */}
        <WorldMap 
          mixes={mixes} 
          onSelect={handleMapSelect} 
          selectedId={mixes[currentMixIndex]?.id}
          apiKey={mapsApiKey}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mixes.map((mix) => (
            <MixCard 
              key={mix.id} 
              mix={mix} 
              accessToken={accessToken}
              onAddToPlaylist={addToPlaylist}
              onPlay={handlePlayCard}
              isAdding={processingQueue.has(mix.id)}
              isPlaying={mixes[currentMixIndex]?.id === mix.id && isPlaying}
              isCurrent={mixes[currentMixIndex]?.id === mix.id}
            />
          ))}
        </div>
        
        {mixes.length === 0 && !loading && (
          <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
            <p className="text-zinc-500 text-xl">Configura los filtros y haz clic en Generar para descubrir nuevos sonidos.</p>
          </div>
        )}
      </main>

      {currentMixIndex !== -1 && (
        <PlayerBar 
          currentMix={mixes[currentMixIndex]}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={handleNext}
          onPrev={handlePrev}
          videoId={mixes[currentMixIndex]?.videoId}
          onVideoEnd={handleNext}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        mapsApiKey={mapsApiKey}
        setMapsApiKey={setMapsApiKey}
      />
    </div>
  );
}