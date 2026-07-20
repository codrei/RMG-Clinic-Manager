import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { ShieldCheck } from 'lucide-react';
import { auth } from '../lib/firebase';

// Patient records shouldn't sit open on an unattended phone. Sign out after
// 30 minutes of no activity, warning for the final minute so nothing is lost.
// (Both are easy to retune — they're just these two constants.)
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 60 * 1000;

const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Idle auto-logout. Any real interaction resets the clock; if the doctor
 * goes idle, a "Still there?" prompt counts down the last minute before
 * signing out. Mounted inside the signed-in app frame only.
 */
export function IdleGuard() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActive = useRef(Date.now());

  useEffect(() => {
    const bump = () => {
      lastActive.current = Date.now();
    };
    ACTIVITY.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = window.setInterval(() => {
      const idle = Date.now() - lastActive.current;
      if (idle >= IDLE_MS) {
        signOut(auth);
      } else if (idle >= IDLE_MS - WARN_MS) {
        setSecondsLeft(Math.max(1, Math.ceil((IDLE_MS - idle) / 1000)));
      } else {
        setSecondsLeft((s) => (s === null ? s : null));
      }
    }, 1000);

    return () => {
      window.clearInterval(tick);
      ACTIVITY.forEach((e) => window.removeEventListener(e, bump));
    };
  }, []);

  function stay() {
    lastActive.current = Date.now();
    setSecondsLeft(null);
  }

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-primary/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center gap-2 font-serif text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-accent-ink" /> Still there?
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          To keep patient records private, you&apos;ll be signed out in{' '}
          <span className="font-semibold tabular-nums text-foreground">{secondsLeft}s</span> from inactivity.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={stay}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            Stay signed in
          </button>
          <button
            onClick={() => signOut(auth)}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
