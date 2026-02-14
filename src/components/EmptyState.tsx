import React from 'react';

interface EmptyStateProps {
  onGenerate: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onGenerate, onOpenSettings, hasApiKey }) => (
  <div className="text-center py-16 sm:py-24 rounded-2xl border border-dashed border-zinc-800/40 relative overflow-hidden">
    {/* Background glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl" />
    </div>

    <div className="relative">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/30 flex items-center justify-center shadow-xl shadow-black/20">
        <svg className="w-9 h-9 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="text-zinc-300 text-lg font-semibold mb-2">Explora el mundo musical</h3>
      <p className="text-zinc-600 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
        {hasApiKey
          ? 'Configura los filtros y genera descubrimientos musicales con inteligencia artificial.'
          : 'Configura tu clave de Gemini para empezar a descubrir sonidos extraños de todo el planeta.'}
      </p>

      <div className="flex items-center justify-center gap-3">
        {!hasApiKey && (
          <button
            onClick={onOpenSettings}
            className="px-5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-sm font-semibold transition-all border border-zinc-700/40 hover:border-zinc-600/60"
          >
            Configurar claves
          </button>
        )}
        <button
          onClick={onGenerate}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generar con IA
          </span>
        </button>
      </div>
    </div>
  </div>
);
