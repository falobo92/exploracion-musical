import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;

  youtubeApiKey: string;
  setYoutubeApiKey: (key: string) => void;

  googleClientId: string;
  setGoogleClientId: (key: string) => void;
  onClearAll: () => void;
}

function validateKeyFormat(key: string, type: 'api' | 'client' | 'youtube'): 'valid' | 'invalid' | 'empty' {
  if (!key) return 'empty';
  if (type === 'api' || type === 'youtube') {
    return key.length >= 20 ? 'valid' : 'invalid';
  }
  // Client ID: debe contener .apps.googleusercontent.com
  return key.includes('.apps.googleusercontent.com') ? 'valid' : 'invalid';
}

const StatusDot: React.FC<{ status: 'valid' | 'invalid' | 'empty' }> = ({ status }) => {
  if (status === 'empty') return null;
  return (
    <div
      className={`w-2 h-2 rounded-full shrink-0 ${status === 'valid' ? 'bg-emerald-400' : 'bg-amber-400'
        }`}
      title={status === 'valid' ? 'Formato válido' : 'Formato inusual'}
    />
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  geminiKey,
  setGeminiKey,
  youtubeApiKey,
  setYoutubeApiKey,
  googleClientId,
  setGoogleClientId,
  onClearAll,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const geminiStatus = validateKeyFormat(geminiKey, 'api');
  const youtubeStatus = validateKeyFormat(youtubeApiKey, 'youtube');
  const clientIdStatus = validateKeyFormat(googleClientId, 'client');

  const inputClass =
    'w-full bg-zinc-950 border border-zinc-700/50 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={e => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] border border-white/10 rounded-3xl w-full max-w-2xl p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Credenciales</p>
            <h2 className="text-2xl font-black text-white mt-1">Configuración</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            aria-label="Cerrar configuración"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Gemini API Key */}
          <div>
            <label className="flex items-center gap-2 text-zinc-400 text-xs uppercase font-bold mb-2 tracking-wider">
              Clave API de Gemini
              <StatusDot status={geminiStatus} />
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              className={inputClass}
              placeholder="AIza..."
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Para generar mezclas musicales con IA.{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Obtener clave
              </a>
            </p>
          </div>

          {/* YouTube API Key */}
          <div>
            <label className="flex items-center gap-2 text-zinc-400 text-xs uppercase font-bold mb-2 tracking-wider">
              Clave API de YouTube Data v3
              <StatusDot status={youtubeStatus} />
            </label>
            <input
              type="password"
              value={youtubeApiKey}
              onChange={e => setYoutubeApiKey(e.target.value)}
              className={inputClass}
              placeholder="AIza..."
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Opcional. Acelera búsquedas y prefetch de videos sin pedir login. La reproducción también puede usar OAuth o el proxy cuando haga falta.
            </p>
          </div>

          {/* Google OAuth Client ID */}
          <div>
            <label className="flex items-center gap-2 text-zinc-400 text-xs uppercase font-bold mb-2 tracking-wider">
              Google OAuth Client ID
              <StatusDot status={clientIdStatus} />
            </label>
            <input
              type="password"
              value={googleClientId}
              onChange={e => setGoogleClientId(e.target.value)}
              className={inputClass}
              placeholder="123456789-abc.apps.googleusercontent.com"
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Necesario para crear playlists en tu cuenta y sirve como respaldo para búsquedas autenticadas.
              <br />
              <span className="text-zinc-500 text-[10px] leading-relaxed block mt-1">
                Configura en Google Cloud Console este origen:<br />
                • Orígenes de JavaScript: <span className="text-emerald-400 font-mono">{currentOrigin}</span><br />
                • URIs de redireccionamiento: <span className="text-emerald-400 font-mono">{currentOrigin}</span>
              </span>
            </p>
          </div>

          {/* Tip .env */}
          <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
            <p className="text-emerald-200 text-xs leading-relaxed">
              <span className="font-semibold">Tip:</span> Configura las claves en un archivo{' '}
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-100">.env</code> en la raíz del proyecto:
            </p>
            <pre className="text-emerald-100/70 text-[11px] mt-2 font-mono leading-relaxed overflow-x-auto">
              {`VITE_GEMINI_API_KEY=tu_clave\nVITE_YOUTUBE_API_KEY=tu_clave_youtube\nVITE_GOOGLE_CLIENT_ID=tu_client_id`}
            </pre>
          </div>

          {/* Ayuda */}
          <div className="bg-zinc-800/40 rounded-2xl p-4 border border-zinc-700/30">
            <p className="text-zinc-400 text-xs leading-relaxed">
              <span className="font-semibold text-zinc-300">Qué desbloquea cada credencial</span>
              <br />
              <br />
              <strong className="text-zinc-300">Gemini:</strong> generación curada de mixes con IA. Ve a{' '}
              <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                aistudio.google.com
              </a>{' '}
              y genera una clave API.
              <br />
              <br />
              <strong className="text-zinc-300">YouTube Data API:</strong> mejora búsquedas sin login y reduce esperas al empezar a reproducir.
              <br />
              <br />
              <strong className="text-zinc-300">Google OAuth:</strong>
              <br />
              1. Ve a{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                console.cloud.google.com
              </a>
              <br />
              2. Crea un proyecto y habilita "YouTube Data API v3"
              <br />
              3. Ve a Credenciales → Crear ID de cliente OAuth 2.0
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          {/* Limpiar claves */}
          <div>
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
              >
                Limpiar todas las claves
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">¿Seguro?</span>
                <button
                  onClick={() => {
                    onClearAll();
                    setShowConfirmClear(false);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
                >
                  Sí
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                >
                  No
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
