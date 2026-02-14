import React, { useState, useMemo } from 'react';
import type { MusicMix, SearchCriteria } from '@/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mixes: MusicMix[];
  criteria: SearchCriteria;
}

function generateExportText(mixes: MusicMix[], criteria: SearchCriteria): string {
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [];

  lines.push('🎵 ATLAS SÓNICO — Exploración Musical');
  lines.push(`📅 ${date}`);
  if (criteria.descriptiveQuery) lines.push(`🔍 Búsqueda: "${criteria.descriptiveQuery}"`);
  if (criteria.continent) lines.push(`🌍 Continente: ${criteria.continent}`);
  if (criteria.country) lines.push(`📍 País: ${criteria.country}`);
  if (criteria.style) lines.push(`🎸 Estilo: ${criteria.style}`);
  if (criteria.year) lines.push(`📆 Época: ${criteria.year}`);
  if (criteria.bpm) lines.push(`💓 BPM: ~${criteria.bpm}`);
  lines.push(`📊 Total: ${mixes.length} canciones`);
  lines.push('');
  lines.push('═'.repeat(55));
  lines.push('');

  mixes.forEach((mix, i) => {
    lines.push(`${String(i + 1).padStart(2, ' ')}. ${mix.artist}`);
    lines.push(`    🎵 Estilo: ${mix.style}`);
    lines.push(`    🌎 ${mix.country} · ${mix.continent}`);
    lines.push(`    📅 ${mix.year} · ${mix.bpm} BPM`);
    lines.push(`    💬 ${mix.description}`);
    if (mix.videoId) {
      lines.push(`    ▶️ YouTube Music: https://music.youtube.com/watch?v=${mix.videoId}`);
      lines.push(`    ▶️ YouTube: https://www.youtube.com/watch?v=${mix.videoId}`);
    }
    lines.push('');
  });

  lines.push('═'.repeat(55));
  lines.push('Generado con Atlas Sónico — atlas-sonico.app');

  return lines.join('\n');
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, mixes, criteria }) => {
  const [copied, setCopied] = useState(false);

  const exportText = useMemo(
    () => (isOpen ? generateExportText(mixes, criteria) : ''),
    [isOpen, mixes, criteria]
  );

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para navegadores sin clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = exportText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Exportar canciones</h2>
              <p className="text-[11px] text-zinc-500">{mixes.length} canciones con enlaces de YouTube Music</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Texto exportado */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          <pre className="whitespace-pre-wrap text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-950/60 rounded-xl p-4 border border-zinc-800/40 select-all">
            {exportText}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/60 rounded-xl transition-all border border-zinc-700/30"
          >
            Cerrar
          </button>
          <button
            onClick={handleCopy}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              copied
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                ¡Copiado!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copiar todo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
