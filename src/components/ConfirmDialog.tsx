import { useEffect, type ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  icon: LucideIcon;
  /** 'danger' = destructive (red). 'warn' = reversible but significant (amber). */
  tone: 'danger' | 'warn';
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const tones = {
  danger: {
    iconWrap: 'bg-danger-soft text-danger',
    button: 'bg-danger text-white hover:opacity-90',
  },
  warn: {
    iconWrap: 'bg-warn-soft text-warn',
    button: 'bg-warn text-white hover:opacity-90',
  },
};

/** Branded confirmation for destructive / significant actions. */
export function ConfirmDialog({
  open,
  icon: Icon,
  tone,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const t = tones[tone];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${t.iconWrap}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-center font-serif text-xl font-semibold">{title}</h2>
        <div className="mt-2 text-center text-sm text-muted-foreground">{children}</div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 ${t.button}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
