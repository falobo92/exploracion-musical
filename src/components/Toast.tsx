import React from 'react';
import type { Toast as ToastType } from '@/types';
import { Spinner } from './icons/Spinner';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

const typeConfig: Record<ToastType['type'], { icon: string; accent: string; border: string; bg: string }> = {
  info: {
    icon: 'info',
    accent: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
  },
  success: {
    icon: 'check_circle',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
  },
  error: {
    icon: 'error',
    accent: 'text-rose-400',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/5',
  },
  loading: {
    icon: 'refresh',
    accent: 'text-indigo-400',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-8 right-8 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const config = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`toast-enter pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl bg-zinc-900/90 backdrop-blur-2xl border ${config.border} shadow-2xl shadow-black/40 cursor-pointer hover:bg-zinc-800 transition-all`}
            onClick={() => onDismiss(toast.id)}
            role="alert"
          >
            <div className={config.accent}>
              {toast.type === 'loading' ? (
                <Spinner className="w-5 h-5 shrink-0" />
              ) : (
                <span className="material-symbols-outlined text-xl">{config.icon}</span>
              )}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-200 leading-snug flex-1">
              {toast.message}
            </span>
          </div>
        );
      })}
    </div>
  );
};
