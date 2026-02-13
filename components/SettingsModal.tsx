import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  mapsApiKey: string;
  setMapsApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  geminiKey, 
  setGeminiKey,
  mapsApiKey,
  setMapsApiKey
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Configuration</h2>
        
        <div className="mb-4">
          <label className="block text-zinc-400 text-xs uppercase font-bold mb-2">
            Gemini API Key (Required for Mixes)
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="AIza..."
          />
        </div>

        <div className="mb-6">
          <label className="block text-zinc-400 text-xs uppercase font-bold mb-2">
            Google Maps API Key (Optional)
          </label>
          <input
            type="password"
            value={mapsApiKey}
            onChange={(e) => setMapsApiKey(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="AIza..."
          />
          <p className="text-zinc-500 text-xs mt-2">
            Must have "Maps JavaScript API" enabled. If left empty, map will not load.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="bg-white text-black px-4 py-2 rounded-md font-medium text-sm hover:bg-zinc-200 transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};