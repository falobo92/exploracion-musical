import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  googleKey: string;
  setGoogleKey: (key: string) => void;
  googleClientId: string;
  setGoogleClientId: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  geminiKey, 
  setGeminiKey,
  googleKey,
  setGoogleKey,
  googleClientId,
  setGoogleClientId,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-md p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Configuración</h2>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors p-1"
            title="Cerrar"
            aria-label="Cerrar configuración"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-5">
          {/* Gemini API Key */}
          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-2 tracking-wider">
              Clave API de Gemini
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/50 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
              placeholder="AIza..."
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Para generar mezclas musicales con IA. Obtenerla en <span className="text-indigo-400">aistudio.google.com</span>
            </p>
          </div>

          {/* Google Cloud API Key (Maps + YouTube) */}
          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-2 tracking-wider">
              Clave API de Google Cloud
            </label>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/50 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
              placeholder="AIza..."
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Para el mapa y búsqueda de videos. Necesita tener habilitadas:<br/>
              <span className="text-zinc-500">• Maps JavaScript API</span><br/>
              <span className="text-zinc-500">• YouTube Data API v3</span>
            </p>
          </div>

          {/* Google OAuth Client ID */}
          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-2 tracking-wider">
              Google OAuth Client ID
            </label>
            <input
              type="password"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/50 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
              placeholder="123456789-abc.apps.googleusercontent.com"
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Para guardar playlists en tu cuenta de YouTube.<br/>
              <span className="text-zinc-500">Tipo: Aplicación web · Origen: <span className="text-indigo-400">http://localhost:3000</span></span>
            </p>
          </div>

          {/* Nota sobre .env */}
          <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
            <p className="text-indigo-300 text-xs leading-relaxed">
              <span className="font-semibold">Tip:</span> También puedes configurar las claves en un archivo <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-200">.env</code> en la raíz del proyecto para que se carguen automáticamente al iniciar:
            </p>
            <pre className="text-indigo-200/70 text-[11px] mt-2 font-mono leading-relaxed">
{`GEMINI_API_KEY=tu_clave
GOOGLE_API_KEY=tu_clave
GOOGLE_CLIENT_ID=tu_client_id`}
            </pre>
          </div>

          {/* Ayuda */}
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
            <p className="text-zinc-400 text-xs leading-relaxed">
              <span className="font-semibold text-zinc-300">¿Cómo obtener las claves?</span><br/><br/>
              <strong className="text-zinc-300">Gemini:</strong> Ve a <span className="text-indigo-400">aistudio.google.com</span> y genera una clave API.<br/><br/>
              <strong className="text-zinc-300">Google Cloud (API Key + Client ID):</strong><br/>
              1. Ve a <span className="text-indigo-400">console.cloud.google.com</span><br/>
              2. Crea un proyecto<br/>
              3. Habilita "Maps JavaScript API" y "YouTube Data API v3"<br/>
              4. Ve a Credenciales → Crear clave API<br/>
              5. Para playlists: Credenciales → Crear ID de cliente OAuth 2.0<br/>
              <span className="text-zinc-500 ml-3">→ Tipo: Aplicación web</span><br/>
              <span className="text-zinc-500 ml-3">→ Orígenes autorizados: http://localhost:3000</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button 
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            Guardar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
