import { useState, useCallback, useRef } from 'react';
import type { Toast } from '@/types';

let toastCounter = 0;

export function useNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: Toast['type'] = 'info', duration = 4000): string => {
      const id = `toast-${++toastCounter}`;
      const toast: Toast = { id, message, type, duration };

      setToasts(prev => {
        // Si es un loading, asegurarnos de que sea el último y no se descarte
        if (type === 'loading') {
          return [...prev.filter(t => t.type !== 'loading'), toast];
        }
        // Limitar a 5 toasts visibles
        const next = [...prev, toast];
        if (next.length > 5) next.shift();
        return next;
      });

      if (type !== 'loading' && duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const update = useCallback(
    (id: string, message: string, type: Toast['type'] = 'success', duration = 3000) => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, message, type } : t)));
      if (type !== 'loading' && duration > 0) {
        const existing = timers.current.get(id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss]
  );

  return { toasts, notify, dismiss, update };
}
