import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;

  googleClientId: string;
  setGoogleClientId: (key: string) => void;
  onClearAll: () => void;
}

function validateKeyFormat(key: string, type: 'api' | 'client'): 'valid' | 'invalid' | 'empty' {
  if (!key) return 'empty';
  if (type === 'api') {
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

  googleClientId,
  setGoogleClientId,
  onClearAll,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const geminiStatus = validateKeyFormat(geminiKey, 'api');

  const clientIdStatus = validateKeyFormat(googleClientId, 'client');

  const inputClass =
    'w-full bg-zinc-950 border border-zinc-700/50 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-md p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Configuración</h2>
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
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Obtener clave
              </a>
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
              Para buscar videos (reproducir) y guardar playlists en tu cuenta de YouTube.
              <br />
              <span className="text-zinc-500 text-[10px] leading-relaxed block mt-1">
                Configura en Google Cloud Console:<br />
                • Orígenes de JavaScript: <span className="text-indigo-400 font-mono">http://localhost:5173</span><br />
                • URIs de redireccionamiento: <span className="text-indigo-400 font-mono">http://localhost:5173</span>
              </span>
            </p>
          </div>

          {/* Tip .env */}
          <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
            <p className="text-indigo-300 text-xs leading-relaxed">
              <span className="font-semibold">Tip:</span> Configura las claves en un archivo{' '}
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-200">.env</code> en la raíz del proyecto:
            </p>
            <pre className="text-indigo-200/70 text-[11px] mt-2 font-mono leading-relaxed">
              {`VITE_GEMINI_API_KEY=tu_clave\nVITE_GOOGLE_CLIENT_ID=tu_client_id`}
            </pre>
          </div>

          {/* Ayuda */}
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
            <p className="text-zinc-400 text-xs leading-relaxed">
              <span className="font-semibold text-zinc-300">¿Cómo obtener las claves?</span>
              <br />
              <br />
              <strong className="text-zinc-300">Gemini:</strong> Ve a{' '}
              <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                aistudio.google.com
              </a>{' '}
              y genera una clave API.
              <br />
              <br />
              <strong className="text-zinc-300">Google Cloud:</strong>
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
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
