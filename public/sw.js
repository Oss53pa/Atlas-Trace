/* Atlas Trace — service worker minimal (installabilité PWA + repli hors-ligne).
 * Stratégie : network-first pour la navigation et les données (jamais de contenu périmé
 * sur un outil de contrôle d'accès), cache-first pour les assets statiques immuables.
 * On ne met JAMAIS en cache les appels Supabase (auth/RLS/edge) : toujours le réseau. */
const CACHE = 'atlas-trace-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/pwa-192.png', '/pwa-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Jamais de cache pour le backend (Supabase : REST, auth, storage, edge functions).
  if (url.hostname.endsWith('.supabase.co')) return;

  // Navigation : réseau d'abord, repli sur le shell en cache si hors-ligne.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // Assets : cache d'abord, sinon réseau (et on garnit le cache au passage).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit),
    ),
  );
});
