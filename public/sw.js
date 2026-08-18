// ContriTrack Service Worker - Network-First Strategy
// Guarantees immediate delivery of new deployments while preserving offline fallback capability.

const CACHE_VERSION = 'contritrack-v2.1.0';
const STATIC_CACHE = `contritrack-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `contritrack-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  // Force active immediately on new deployments
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge all old and stale caches from previous builds
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and external domains (Firebase, Supabase, GitHub, Sentry)
  if (event.request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // 1. ALL HTML PAGES & NAVIGATIONS (Network-First)
  // Ensures all users see new deployments immediately without needing a hard refresh!
  if (
    event.request.mode === 'navigate' || 
    url.pathname === '/' || 
    url.pathname.startsWith('/dashboard') || 
    url.pathname.startsWith('/docs') || 
    url.pathname.startsWith('/hubs') ||
    url.pathname.startsWith('/careers')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to offline cache ONLY when completely disconnected
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Next.js Static JS/CSS Bundles (Network-First)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Static Media Assets (Images, SVGs, Fonts - Stale While Revalidate)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});
