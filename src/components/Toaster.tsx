import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, subscribeToasts, type Toast, type ToastTone } from '../lib/toast';

const TONES: Record<ToastTone, { icon: typeof Info; cls: string }> = {
  error: { icon: AlertCircle, cls: 'border-danger/30 bg-danger-soft text-danger' },
  success: { icon: CheckCircle2, cls: 'border-ok/30 bg-ok-soft text-ok' },
  info: { icon: Info, cls: 'border-accent/40 bg-accent-soft text-accent-ink' },
};

/** App-wide toast outlet. Sits above the phone bottom-nav, centered on desktop. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((t) => {
        const { icon: Icon, cls } = TONES[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${cls}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
