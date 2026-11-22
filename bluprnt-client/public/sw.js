// BluPrnt Offline Service Worker
const CACHE_NAME = 'bluprnt-offline-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/content/catalog.json',
  '/content/cases.json',
  '/content/interview.json',
  '/content/flashcards.json',
  '/content/lessons/caching.json',
  '/content/lessons/consistent-hashing.json',
  '/content/lessons/rate-limiting.json',
  '/content/lessons/lsm-trees.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first for HTML navigations to always load the latest deploy;
// Cache-first for static content & hashed assets; Ignore APIs and WebSockets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignore backend API, WebSocket, and chrome-extension calls
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/collab') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-first with cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
          try {
            const fresh = await fetch('/index.html');
            return fresh;
          } catch (e) {
            return new Response('You are offline. Reconnect to access BluPrnt.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            });
          }
        })
    );
    return;
  }

  // 2. Static assets & content: Cache-first with network fallback
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.startsWith('/content/') || url.pathname.startsWith('/assets/'))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const fallback = await caches.match(req);
          if (fallback) return fallback;
          return new Response('', { status: 408 });
        });
    })
  );
});
