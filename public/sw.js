/*
 * RMG Clinic Manager — service worker.
 * Strategy:
 *  - Navigations: network-first (fresh app when online), falling back to the
 *    cached shell so the app OPENS with no internet.
 *  - Same-origin assets (hashed JS/CSS, images): cache-first — hashed names
 *    make stale content impossible; new deploys are new names.
 *  - Google Fonts: cache-first so typography survives offline.
 *  - Firebase/Firestore traffic is NEVER intercepted — the SDK has its own
 *    offline persistence and sync queue.
 */
const CACHE = 'rmg-manager-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Booking alerts: the notify function sends DATA-ONLY FCM messages, so this
// handler is the single place notifications are built and displayed.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const d = payload && payload.data ? payload.data : {};
  if (!d.title) return;
  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: d.tag || 'rmg-booking',
      data: { link: d.link || '/' },
    }),
  );
});

// Tapping the notification opens the confirm/decline dashboard.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(self.clients.openWindow(link));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin: only cache fonts; let everything else (Firebase!) pass through.
  if (url.origin !== location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(
        caches.open(CACHE).then(async (cache) => {
          const hit = await cache.match(req);
          if (hit) return hit;
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        }),
      );
    }
    return;
  }

  // App navigations: network-first, offline falls back to the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/__shell__', copy));
          return res;
        })
        .catch(async () => (await caches.match('/__shell__')) ?? Response.error()),
    );
    return;
  }

  // Same-origin assets: cache-first, populate from network.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});
