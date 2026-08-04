/* Atlas Trace — service worker minimal (installabilité PWA + repli hors-ligne).
 * Stratégie : network-first pour la navigation et les données (jamais de contenu périmé
 * sur un outil de contrôle d'accès), cache-first pour les assets statiques immuables.
 * On ne met JAMAIS en cache les appels Supabase (auth/RLS/edge) : toujours le réseau. */
// Le numéro de version force le remplacement du service worker et la purge des
// anciens caches à chaque évolution : les appareils reçoivent la mise à jour.
const CACHE = 'atlas-trace-v2';
// On NE précache PAS le HTML (/, /index.html) : la navigation est toujours
// network-first, jamais une page d'app périmée servie depuis le cache.
const APP_SHELL = ['/manifest.webmanifest', '/icon.svg', '/pwa-192.png', '/pwa-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Permet à la page de forcer l'activation immédiate d'un SW en attente.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Jamais de cache pour le backend (Supabase : REST, auth, storage, edge functions).
  if (url.hostname.endsWith('.supabase.co')) return;

  // Navigation : réseau d'abord (toujours la dernière version), et on garde une
  // copie de l'HTML pour le repli hors-ligne uniquement.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
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

/* ---------- Alertes push (Web Push / VAPID) ----------
 * Réveille le téléphone du HSE Officer et du Directeur de la Construction
 * quand un incident est consigné, application fermée. */
self.addEventListener('push', (e) => {
  let d = { titre: 'Atlas Trace', corps: 'Nouvel incident au poste', urgence: 'mineur' };
  try {
    if (e.data) d = { ...d, ...e.data.json() };
  } catch {
    if (e.data) d.corps = e.data.text();
  }
  const majeur = d.urgence === 'majeur';
  e.waitUntil(
    self.registration.showNotification(d.titre, {
      body: d.corps,
      icon: '/pwa-192.png',
      badge: '/favicon-32.png',
      tag: d.id ? `incident-${d.id}` : 'incident',
      renotify: majeur,
      requireInteraction: majeur,
      vibrate: majeur ? [200, 100, 200, 100, 200] : [120],
      data: { url: '/?vue=maincourante', id: d.id || null },
    }),
  );
});

/* Un appui ouvre la main courante, en réutilisant l'onglet déjà ouvert. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cible = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
      for (const c of liste) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      return self.clients.openWindow(cible);
    }),
  );
});
