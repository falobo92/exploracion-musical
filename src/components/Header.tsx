import React from 'react';

interface HeaderProps {
  onOpenSettings: () => void;
  hasGemini: boolean;
  hasYoutubeKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, hasGemini, hasYoutubeKey }) => (
  <header className="w-full relative z-10 flex justify-between items-center py-2">
    <div className="flex items-center gap-3.5">
      {/* Logo con gradiente animado de Emerald a Teal */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 relative overflow-hidden group">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
        <svg className="w-5 h-5 text-white relative z-10 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight font-sans">
          Atlas{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Sónico
          </span>
        </h1>
        <p className="text-zinc-400 text-xs font-medium tracking-wide mt-0.5">
          Descubre música del mundo
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2.5">
      {/* API status pills ocultos en mobile estricto, visibles si hay espacio */}
      <div className="hidden sm:flex flex-col gap-1.5 mr-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all ${
          hasGemini
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-zinc-500 bg-zinc-800/40 border-zinc-800/60'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${hasGemini ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-zinc-600'}`} />
          AI
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all ${
          hasYoutubeKey
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-zinc-500 bg-zinc-800/40 border-zinc-800/60'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${hasYoutubeKey ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-zinc-600'}`} />
          YT
        </div>
      </div>

      <button
        onClick={onOpenSettings}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700/50 shadow-sm"
        title="Configuración"
        aria-label="Abrir configuración"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </header>
);
