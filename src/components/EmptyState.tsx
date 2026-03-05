import React from 'react';

interface EmptyStateProps {
  onGenerate: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onGenerate, onOpenSettings, hasApiKey }) => (
  <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_36%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.96))] px-6 py-16 text-center sm:py-20">
    {/* Background glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
    </div>

    <div className="relative">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 shadow-xl shadow-emerald-500/10">
        <svg className="w-9 h-9 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Punto de partida</p>
      <h3 className="mt-2 text-2xl font-black text-white">Explora el mundo musical</h3>
      <p className="mx-auto mt-3 mb-8 max-w-md text-sm leading-relaxed text-zinc-400">
        {hasApiKey
          ? 'Escribe una intención sonora, combina región, época o BPM y deja que la IA construya una ruta de escucha más precisa.'
          : 'Configura tu clave de Gemini para empezar a descubrir sonidos extraños de todo el planeta con recomendaciones guiadas.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!hasApiKey && (
          <button
            onClick={onOpenSettings}
            className="rounded-2xl border border-white/10 bg-zinc-900/80 px-5 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-zinc-800"
          >
            Configurar claves
          </button>
        )}
        <button
          onClick={onGenerate}
          className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-black text-zinc-950 transition-all shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-teal-300"
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
