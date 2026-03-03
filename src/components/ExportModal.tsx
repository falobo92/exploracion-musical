import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MusicMix, SearchCriteria } from '@/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mixes: MusicMix[];
  criteria: SearchCriteria;
}

type ExportFormat = 'txt' | 'csv' | 'json';

function generateExportText(mixes: MusicMix[], criteria: SearchCriteria, format: ExportFormat): string {
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (format === 'json') {
    const exportData = {
      metadata: {
        app: 'Atlas Sónico',
        date,
        criteria,
        total: mixes.length
      },
      mixes: mixes.map(m => ({
        id: m.id,
        artist: m.artist,
        songTitle: m.songTitle,
        country: m.country,
        continent: m.continent,
        style: m.style,
        year: m.year,
        bpm: m.bpm,
        description: m.description,
        youtubeId: m.videoId || null,
        youtubeSearchQuery: m.searchQuery
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }

  if (format === 'csv') {
    const header = ['Artist', 'Song', 'Country', 'Continent', 'Style', 'Year', 'BPM', 'Description', 'YouTube_Link'];
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    
    const rows = mixes.map(m => {
      const ytLink = m.videoId 
        ? `https://music.youtube.com/watch?v=${m.videoId}` 
        : `https://music.youtube.com/search?q=${encodeURIComponent(m.searchQuery || m.artist)}`;
      
      return [
        escapeCsv(m.artist),
        escapeCsv(m.songTitle || ''),
        escapeCsv(m.country),
        escapeCsv(m.continent),
        escapeCsv(m.style),
        escapeCsv(m.year),
        escapeCsv(m.bpm?.toString() || ''),
        escapeCsv(m.description),
        escapeCsv(ytLink)
      ].join(',');
    });

    return [header.join(','), ...rows].join('\n');
  }

  // Text format (TXT)
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
    if (mix.songTitle) lines.push(`    🎵 Canción: ${mix.songTitle}`);
    lines.push(`    🎸 Estilo: ${mix.style}`);
    lines.push(`    🌎 ${mix.country} · ${mix.continent}`);
    lines.push(`    📅 ${mix.year} · ${mix.bpm} BPM`);
    lines.push(`    💬 ${mix.description}`);
    
    if (mix.videoId) {
      lines.push(`    ▶️ YouTube Music: https://music.youtube.com/watch?v=${mix.videoId}`);
    } else {
      const query = encodeURIComponent(mix.searchQuery || `${mix.artist} - ${mix.songTitle}`);
      lines.push(`    🔎 Buscar en YT Music: https://music.youtube.com/search?q=${query}`);
    }
    lines.push('');
  });

  lines.push('═'.repeat(55));
  lines.push('Generado con Atlas Sónico — atlas-sonico.app');

  return lines.join('\n');
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, mixes, criteria }) => {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('txt');

  const exportText = useMemo(
    () => (isOpen ? generateExportText(mixes, criteria, format) : ''),
    [isOpen, mixes, criteria, format]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
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

  const downloadFile = () => {
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-sonico-export.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 bg-zinc-900/50 border-b border-white/5 shrink-0 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-sans tracking-tight">Exportar Datos</h2>
                  <p className="text-xs text-zinc-400 font-medium">{mixes.length} canciones listas para descargar o copiar</p>
                </div>
              </div>
              <button onClick={onClose} className="absolute sm:relative top-4 sm:top-0 right-4 sm:right-0 w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formato selector (Tabs) */}
            <div className="flex border-b border-white/5 bg-zinc-900/30 px-6 pt-3 gap-6 shrink-0">
              <button
                onClick={() => setFormat('txt')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${format === 'txt' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Texto (Legible)
                {format === 'txt' && <motion.div layoutId="exportTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full shadow-[0_0_8px_#34d399]" />}
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${format === 'csv' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                CSV (Excel)
                {format === 'csv' && <motion.div layoutId="exportTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full shadow-[0_0_8px_#34d399]" />}
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${format === 'json' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                JSON (Devs)
                {format === 'json' && <motion.div layoutId="exportTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full shadow-[0_0_8px_#34d399]" />}
              </button>
            </div>

            {/* Texto exportado preview */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-zinc-950">
              <pre className="whitespace-pre-wrap text-[11px] sm:text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-900/50 rounded-xl p-5 border border-white/5 select-all h-full overflow-y-auto shadow-inner">
                {exportText}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-6 py-4 bg-zinc-900/50 border-t border-white/5 shrink-0">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-xl transition-all border border-zinc-700/50"
              >
                Cerrar
              </button>
              <div className="flex w-full sm:w-auto gap-3">
                <button
                  onClick={downloadFile}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar {format.toUpperCase()}
                </button>
                <button
                  onClick={handleCopy}
                  className={`flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
