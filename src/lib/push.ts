import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db } from './firebase';

/**
 * Booking alerts (web push). Enabling on a device registers an FCM token in
 * `fcmTokens/{token}`; the booking site's notify function reads that
 * collection with admin credentials and pushes to every registered device
 * the moment a booking is made. The service worker displays the
 * notification; tapping it opens the admin dashboard to confirm/decline.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_KEY = 'rmg:fcmToken';

export type PushError = 'unsupported' | 'not-configured' | 'denied' | 'failed';

/** True when THIS device has alerts on (best-effort local view). */
export function pushEnabled(): boolean {
  try {
    return (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      Boolean(localStorage.getItem(TOKEN_KEY))
    );
  } catch {
    return false;
  }
}

export async function enablePush(): Promise<PushError | null> {
  if (!VAPID_KEY) return 'not-configured';
  // Push needs the production service worker — dev never registers one.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return 'unsupported';
  if (!(await isSupported().catch(() => false))) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return 'failed';
    await setDoc(doc(db, 'fcmTokens', token), {
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
    localStorage.setItem(TOKEN_KEY, token);
    return null;
  } catch {
    return 'failed';
  }
}

export async function disablePush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  try {
    if (token) await deleteDoc(doc(db, 'fcmTokens', token));
  } catch {
    // The token doc lingering is harmless — the sender prunes dead tokens.
  }
  try {
    await deleteToken(getMessaging(app));
  } catch {
    // Token already invalid — nothing to revoke.
  }
}
