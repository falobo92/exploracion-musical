import { useState, useEffect } from 'react';
import { env } from '@/config/env';

export function useApiKeys() {
  const [geminiKey, setGeminiKeyState] = useState<string>(env.geminiKey);
  const [googleKey, setGoogleKeyState] = useState<string>(env.googleKey);
  const [googleClientId, setGoogleClientIdState] = useState<string>(env.googleClientId);

  const setGeminiKey = (key: string) => {
    env.geminiKey = key;
    setGeminiKeyState(key);
  };

  const setGoogleKey = (key: string) => {
    env.googleKey = key;
    setGoogleKeyState(key);
  };

  const setGoogleClientId = (key: string) => {
    env.googleClientId = key;
    setGoogleClientIdState(key);
  };

  const clearAll = () => {
    env.clearAll();
    setGeminiKeyState('');
    setGoogleKeyState('');
    setGoogleClientIdState('');
  };

  const hasGemini = !!geminiKey;
  const hasGoogle = !!googleKey;
  const hasClientId = !!googleClientId;

  return {
    geminiKey,
    setGeminiKey,
    googleKey,
    setGoogleKey,
    googleClientId,
    setGoogleClientId,
    clearAll,
    hasGemini,
    hasGoogle,
    hasClientId,
  };
}
