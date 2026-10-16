// Service Worker: speichert die App auf dem Handy, damit sie ohne Internet läuft.
// VERSION wird beim Veröffentlichen ersetzt → bei jedem Update ein neuer Cache.
const VERSION = '__BUILD__';
const CACHE = `thailand-app-${VERSION}`;

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './demo-daten.json',
  './css/app.css',
  './js/anpassungen.js',
  './js/app.js',
  './js/aufgaben.js',
  './js/ausgaben.js',
  './js/ausgabenlogik.js',
  './js/bausteine.js',
  './js/budget.js',
  './js/budgetlogik.js',
  './js/buchungen.js',
  './js/daten.js',
  './js/datenansicht.js',
  './js/details.js',
  './js/db.js',
  './js/ideen.js',
  './js/hotel.js',
  './js/ikonen.js',
  './js/karte.js',
  './js/listen.js',
  './js/listenlogik.js',
  './js/mehr.js',
  './js/notfall.js',
  './js/plan.js',
  './js/reise.js',
  './js/tagebuch.js',
  './js/thai.js',
  './js/ui.js',
  './js/version.js',
  './js/versicherung.js',
  './js/visuell.js',
  './js/zeit.js',
  './fonts/inter-latin-400-normal.woff2',
  './fonts/inter-latin-500-normal.woff2',
  './fonts/inter-latin-600-normal.woff2',
  './fonts/inter-latin-700-normal.woff2',
  './fonts/LICENSE-inter.txt',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(DATEIEN.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('thailand-app-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      const seite = await cache.match('./index.html');
      if (seite) return seite;
    }
    const treffer = await cache.match(req, { ignoreSearch: true });
    if (treffer) return treffer;
    try {
      return await fetch(req);
    } catch {
      return new Response('Offline – diese Datei ist nicht gespeichert.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
