// BluPrnt Offline Service Worker
const CACHE_NAME = 'bluprnt-offline-v4';

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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Prevent net::ERR_CACHE_MISS when DevTools or browser sets only-if-cached mode
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') {
    return;
  }

  const url = new URL(req.url);

  // Ignore backend API, WebSockets, external origins, and browser extensions
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
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
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return new Response('You are offline. Reconnect to access BluPrnt.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Only intercept designated static application assets and content
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/content/') ||
    STATIC_ASSETS.includes(url.pathname);

  if (!isStaticAsset) {
    return; // Pass through to browser natively without SW interference
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const fallback = await caches.match(req);
          if (fallback) return fallback;
          return new Response('', { status: 404 });
        });
    })
  );
});
