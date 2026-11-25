/* Aetherbound: Rift Duel — Offline-Capable PWA Service Worker */
const SHELL_CACHE = 'aetherbound-shell-v1';
const ASSET_CACHE = 'aetherbound-assets-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Vite dev / HMR internals and non-http(s) extensions
  if (!url.protocol.startsWith('http')) return;
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // 1. HTML Navigations: Network-First so new Vercel deploys arrive immediately, with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // 2. Same-origin static assets (hashed JS/CSS bundles, card artwork, portraits, arenas, icons):
  //    Cache-First with background population for blazing fast mobile loads & offline play!
  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.webmanifest'
    ) {
      event.respondWith(
        caches.open(ASSET_CACHE).then((cache) =>
          cache.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request)
              .then((response) => {
                if (response && response.ok) {
                  cache.put(request, response.clone());
                }
                return response;
              })
              .catch(() => cached);
          })
        )
      );
      return;
    }
  }

  // 3. Google Fonts: Stale-While-Revalidate so typography works cleanly offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response && (response.ok || response.type === 'opaque')) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
  }
});
