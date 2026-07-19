import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2, Lock } from 'lucide-react';
import { auth } from '../lib/firebase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError('Wrong email or password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="flex items-center gap-3">
          <img src="/images/logo-icon.png" alt="" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
          <div>
            <div className="font-serif text-lg font-semibold leading-tight">RMG Clinic Manager</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Patient records — clinic staff only
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-semibold">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Sign in
        </button>
      </form>
    </div>
  );
}
