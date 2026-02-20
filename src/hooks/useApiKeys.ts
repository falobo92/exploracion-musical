import { useState } from 'react';
import { env } from '@/config/env';

export function useApiKeys() {
  const [geminiKey, setGeminiKeyState] = useState<string>(env.geminiKey);
  const [googleClientId, setGoogleClientIdState] = useState<string>(env.googleClientId);
  const [youtubeApiKey, setYoutubeApiKeyState] = useState<string>(env.youtubeApiKey);

  const setGeminiKey = (key: string) => {
    env.geminiKey = key;
    setGeminiKeyState(key);
  };


  const setGoogleClientId = (key: string) => {
    env.googleClientId = key;
    setGoogleClientIdState(key);
  };

  const setYoutubeApiKey = (key: string) => {
    env.youtubeApiKey = key;
    setYoutubeApiKeyState(key);
  };

  const clearAll = () => {
    env.clearAll();
    setGeminiKeyState('');
    setGoogleClientIdState('');
    setYoutubeApiKeyState('');
  };

  const hasGemini = !!geminiKey;
  const hasYoutubeKey = !!youtubeApiKey;
  const hasClientId = !!googleClientId;

  return {
    geminiKey,
    setGeminiKey,

    googleClientId,
    setGoogleClientId,

    youtubeApiKey,
    setYoutubeApiKey,

    clearAll,
    hasGemini,
    hasYoutubeKey,
    hasClientId,
  };
}
