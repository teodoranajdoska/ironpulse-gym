'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { X } from 'lucide-react';

type ToastKind = 'success' | 'error';
type ToastInput = { kind: ToastKind; message: string };
type Toast = ToastInput & { id: number };
type ToastAction = (toast: ToastInput) => void;

const ToastContext = createContext<ToastAction | null>(null);

export function ToastProvider({
  children,
  dismissLabel,
}: {
  children: ReactNode;
  dismissLabel: string;
}): JSX.Element {
  const [toast, setToast] = useState<Toast | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((nextToast: ToastInput) => {
    if (timeout.current) clearTimeout(timeout.current);
    nextId.current += 1;
    setToast({ ...nextToast, id: nextId.current });
    timeout.current = setTimeout(() => {
      timeout.current = null;
      setToast(null);
    }, 5000);
  }, []);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-5 right-5 z-[120] flex max-w-[min(24rem,calc(100vw-2.5rem))] items-start gap-4 rounded-xl border p-4 shadow-2xl ${
            toast.kind === 'error'
              ? 'border-red-500/40 bg-surface text-foreground'
              : 'border-brand-lime/50 bg-surface text-foreground'
          }`}
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          <p className="text-sm leading-relaxed">{toast.message}</p>
          <button
            aria-label={dismissLabel}
            className="rounded-full p-1 text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
            onClick={dismiss}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastAction {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used within ToastProvider.');
  return toast;
}
