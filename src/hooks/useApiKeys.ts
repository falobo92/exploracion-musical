import { useState } from 'react';
import { env } from '@/config/env';

export function useApiKeys() {
  const [geminiKey, setGeminiKeyState] = useState<string>(env.geminiKey);

  const [googleClientId, setGoogleClientIdState] = useState<string>(env.googleClientId);

  const setGeminiKey = (key: string) => {
    env.geminiKey = key;
    setGeminiKeyState(key);
  };


  const setGoogleClientId = (key: string) => {
    env.googleClientId = key;
    setGoogleClientIdState(key);
  };

  const clearAll = () => {
    env.clearAll();
    setGeminiKeyState('');
    setGoogleClientIdState('');
  };

  const hasGemini = !!geminiKey;
  const hasGoogle = !!googleClientId; // Now dependent solely on OAuth Client ID
  const hasClientId = !!googleClientId;

  return {
    geminiKey,
    setGeminiKey,

    googleClientId,
    setGoogleClientId,
    clearAll,
    hasGemini,
    hasGoogle,
    hasClientId,
  };
}
