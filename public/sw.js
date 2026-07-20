const CACHE_NAME = 'lmp-radio-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './img/imgLMP.jpg'
];

// Install — precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean stale caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — Network-First for HTML/routing, Stale-While-Revalidate for other local assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // External requests (Vimeo, fonts, CDN) — network only, don't cache
  if (url.origin !== self.location.origin) return;

  // HTML / Index Page: Network-First
  // Así aseguramos que cualquier cambio en la web se vea inmediatamente en la primera recarga.
  const isHtmlRequest = 
    event.request.mode === 'navigate' || 
    url.pathname.endsWith('.html') || 
    url.pathname === '/' || 
    url.pathname === './';

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // Fallback al cache si está offline
    );
    return;
  }

  // Assets estáticos locales (imágenes, CSS, JS construidos): Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    )
  );
});
