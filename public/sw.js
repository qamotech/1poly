// 1poly service worker — static asset caching for fast loads + installability.
// Game state lives on the server over socket.io, so multiplayer traffic is
// NEVER intercepted or cached here.
const CACHE = '1poly-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((a) => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never touch socket.io (polling/websocket), non-GET, or cross-origin requests.
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/socket.io/')) {
    return;
  }
  // Navigations: network first so a fresh deploy shows up immediately;
  // fall back to the cached shell when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }
  // Static assets: cache first, then network (and cache the result).
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }))
  );
});
