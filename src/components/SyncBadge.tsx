import { CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useSyncStatus } from '../lib/sync';

/**
 * Header pill telling the doctor whether his work is safely in the cloud.
 * When everything's synced it stays quiet (a small "Saved"); offline and
 * mid-sync states are loud enough to notice.
 */
export function SyncBadge() {
  const state = useSyncStatus();

  if (state === 'offline') {
    return (
      <span
        className="flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn"
        title="No internet — your changes are saved on this device and will upload when you're back online."
      >
        <CloudOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Offline</span>
      </span>
    );
  }

  if (state === 'syncing') {
    return (
      <span
        className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink"
        title="Uploading the changes you made while offline…"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Syncing…</span>
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok"
      title="All changes are saved to the cloud."
    >
      <RefreshCw className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Saved</span>
    </span>
  );
}
