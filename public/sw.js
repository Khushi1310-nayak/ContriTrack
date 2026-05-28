const CACHE_NAME = 'contritrack-cache-v1';
const DYNAMIC_CACHE = 'contritrack-dynamic-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for external domains like Supabase or GitHub
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Network-First for APIs and Server Actions (Offline fallback)
  if (url.pathname.startsWith('/api/') || event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If it's a GET, cache it for offline fallback
          if (event.request.method === 'GET' && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback
          if (event.request.method === 'GET') {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;
          }
          
          // Return an offline stub for POST requests (will be handled by client sync engine)
          return new Response(JSON.stringify({ offline: true, success: false, queued: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for Dashboard & Pages
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/dashboard')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise.then(res => {
          if (res) return res;
          // Ultimate offline fallback to cached home if navigation fails completely
          return caches.match('/');
        });
      })
    );
    return;
  }

  // Cache-First for static assets (images, fonts, _next/static JS)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|svg|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        });
      })
    );
  }
});
