import { useEffect, useState } from 'react';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Connection + save state, so the doctor always knows whether his work
 * has actually reached the cloud:
 *   offline  — no internet; edits are saved on THIS device and will sync later
 *   syncing  — back online, flushing the edits made while offline
 *   online   — everything is saved to the cloud
 */
export type SyncState = 'online' | 'offline' | 'syncing';

export function useSyncStatus(): SyncState {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function goOnline() {
      setOnline(true);
      setSyncing(true);
      // Resolves once every offline edit has been acknowledged by Firestore.
      waitForPendingWrites(db).finally(() => {
        if (!cancelled) setSyncing(false);
      });
    }
    function goOffline() {
      setOnline(false);
      setSyncing(false);
    }

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!online) return 'offline';
  return syncing ? 'syncing' : 'online';
}
