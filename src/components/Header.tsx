import React from 'react';

interface HeaderProps {
  onOpenSettings: () => void;
  hasGemini: boolean;
  hasYoutubeKey: boolean;
  hasClientId: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, hasGemini, hasYoutubeKey, hasClientId }) => {
  const statuses = [
    { label: 'IA', active: hasGemini, activeClass: 'text-emerald-200 bg-emerald-500/12 border-emerald-500/25' },
    { label: 'YT', active: hasYoutubeKey, activeClass: 'text-cyan-200 bg-cyan-500/12 border-cyan-500/25' },
    { label: 'Google', active: hasClientId, activeClass: 'text-amber-200 bg-amber-500/12 border-amber-500/25' },
  ];

  return (
    <header className="w-full rounded-[22px] border border-white/8 bg-zinc-900 px-3 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.28)] sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_10px_24px_rgba(16,185,129,0.24)]">
            <div className="absolute inset-[1px] rounded-[15px] bg-zinc-950/20" />
            <svg className="relative z-10 h-5 w-5 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.1}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
                Atlas <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Sónico</span>
              </h1>
              <span className="hidden rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 sm:inline-flex">
                Música global
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
              Descubre rarezas con IA, mapa y reproducción continua.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
            {statuses.map((status) => (
              <div
                key={status.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  status.active
                    ? status.activeClass
                    : 'border-white/8 bg-zinc-900/70 text-zinc-500'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.active ? 'bg-current shadow-[0_0_8px_currentColor]' : 'bg-zinc-600'}`} />
                {status.label}
              </div>
            ))}
          </div>

          <button
            onClick={onOpenSettings}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/80 text-zinc-400 transition-all hover:border-emerald-500/30 hover:text-white"
            title="Configuración"
            aria-label="Abrir configuración"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
        {statuses.map((status) => (
          <div
            key={status.label}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
              status.active
                ? status.activeClass
                : 'border-white/8 bg-zinc-900/70 text-zinc-500'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.active ? 'bg-current shadow-[0_0_8px_currentColor]' : 'bg-zinc-600'}`} />
            {status.label}
          </div>
        ))}
      </div>
    </header>
  );
};
