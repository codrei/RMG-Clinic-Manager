/**
 * Tiny global toast store — callable from anywhere (components AND plain
 * functions), so a failed save never disappears silently. A single
 * <Toaster /> mounted at the app root subscribes and renders the queue.
 */

export type ToastTone = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<(t: Toast[]) => void>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribeToasts(fn: (t: Toast[]) => void): () => void {
  listeners.add(fn);
  fn(toasts);
  return () => {
    listeners.delete(fn);
  };
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(tone: ToastTone, message: string, ms: number): number {
  const id = nextId++;
  toasts = [...toasts, { id, tone, message }];
  emit();
  if (ms > 0) window.setTimeout(() => dismissToast(id), ms);
  return id;
}

/** Errors linger longest — the doctor needs time to read what failed. */
export const toast = {
  error: (message: string) => push('error', message, 7000),
  success: (message: string) => push('success', message, 3500),
  info: (message: string) => push('info', message, 4500),
};
