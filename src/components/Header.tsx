import React from 'react';

interface HeaderProps {
  onOpenSettings: () => void;
  hasGemini: boolean;
  hasGoogle: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, hasGemini, hasGoogle }) => (
  <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-800/30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {/* Logo con gradiente animado */}
        <div className="w-10 h-10 rounded-xl header-gradient flex items-center justify-center shadow-lg shadow-indigo-500/25 relative">
          <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
            Atlas{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              Sónico
            </span>
          </h1>
          <p className="text-zinc-500 text-[11px] sm:text-xs hidden sm:block">
            Descubre música rara del mundo con IA
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* API status pills */}
        <div className="hidden sm:flex items-center gap-2 mr-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
            hasGemini
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-zinc-600 bg-zinc-800/40 border-zinc-800/60'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${hasGemini ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            Gemini
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
            hasGoogle
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-zinc-600 bg-zinc-800/40 border-zinc-800/60'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${hasGoogle ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            YouTube
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-all border border-zinc-700/30 hover:border-zinc-600/50"
          title="Configuración"
          aria-label="Abrir configuración"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
);
