import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * SAME Firebase project as the booking site (rmg-dental-clinic) — one
 * database, one clinic login, two apps. Patient-record collections are
 * locked to authenticated users by the shared Firestore rules.
 *
 * Offline persistence is on: the app keeps working through WiFi drops
 * and syncs when the connection returns.
 */
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(cfg.apiKey && cfg.projectId);

const app = initializeApp(cfg);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const auth = getAuth(app);
