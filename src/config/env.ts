/**
 * Centralización de variables de entorno.
 * Prioridad: localStorage > import.meta.env (archivo .env)
 */

type ClientEnvKey = keyof ImportMetaEnv;

const get = (localKey: string, envKey: ClientEnvKey): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(localKey);
    if (stored) return stored;
  }
  return import.meta.env[envKey] || '';
};

const set = (localKey: string, value: string) => {
  if (value) {
    localStorage.setItem(localKey, value);
  } else {
    localStorage.removeItem(localKey);
  }
};

export const env = {
  get geminiKey() {
    return get('gemini_key', 'VITE_GEMINI_API_KEY');
  },
  set geminiKey(value: string) {
    set('gemini_key', value);
  },


  get googleClientId() {
    return get('google_client_id', 'VITE_GOOGLE_CLIENT_ID');
  },
  set googleClientId(value: string) {
    set('google_client_id', value);
  },

  clearAll() {
    localStorage.removeItem('gemini_key');
    localStorage.removeItem('google_client_id');
  },
};
