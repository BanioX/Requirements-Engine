/* Minimaler Service Worker für Desktop-/Mobile-App-Installation (PWA).
   Network-first: API- & Healthcheck-Daten bleiben immer 100 % live aus PostgreSQL. */
const CACHE = 'onestrand-reqengine-v4';
const SHELL = ['/', '/styles.css', '/app.js', '/assets/mark.svg', '/assets/favicon.svg', '/assets/apple-touch-icon.png'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname === '/health') {
    return;
  }
  ev.respondWith(fetch(ev.request, { cache: 'no-cache' }).catch(() => caches.match(ev.request)));
});
