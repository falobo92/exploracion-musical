import React from 'react';
import type { Toast as ToastType } from '@/types';
import { Spinner } from './icons/Spinner';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

const typeConfig: Record<ToastType['type'], { icon: React.ReactNode; accent: string; border: string }> = {
  info: {
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  success: {
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    accent: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  error: {
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: 'text-red-400',
    border: 'border-red-500/20',
  },
  loading: {
    icon: <Spinner className="w-4 h-4 shrink-0 text-indigo-400" />,
    accent: 'text-indigo-400',
    border: 'border-indigo-500/20',
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const config = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/95 backdrop-blur-2xl border ${config.border} shadow-2xl shadow-black/30 cursor-pointer hover:bg-zinc-800/95 transition-colors`}
            onClick={() => onDismiss(toast.id)}
            role="alert"
          >
            <div className={config.accent}>{config.icon}</div>
            <span className="text-sm text-zinc-200 leading-snug flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
