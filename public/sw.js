/*
 * Workboard service worker.
 *
 * Strategy (documented in docs/pwa.md):
 * - App shell + hashed build assets are precached at install time.
 * - Navigations are network-first with a cached `/index.html` fallback, so SPA
 *   deep links keep working offline.
 * - Same-origin static assets are cache-first with a background refresh
 *   (stale-while-revalidate).
 * - Everything else is network-only; Workboard makes no third-party requests.
 *
 * `scripts/build-sw.mjs` replaces the placeholder below with the real list of
 * files emitted by `vite build`.
 */
const BUILD_VERSION = self.__WORKBOARD_VERSION__ || 'dev';
const PRECACHE_URLS = self.__WORKBOARD_PRECACHE__ || ['/', '/index.html', '/manifest.webmanifest'];

const PRECACHE = `workboard-precache-${BUILD_VERSION}`;
const RUNTIME = `workboard-runtime-${BUILD_VERSION}`;
const APP_SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== PRECACHE && key !== RUNTIME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const isCacheableAsset = (request) => {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/assets/')
  );
};

// `ignoreVary` matters: Vite preview serves assets with `Vary: Origin`, and module
// scripts are CORS requests that send an `Origin` header. A plain `cache.match`
// would miss entries stored by `cache.addAll`, which has no `Origin` header.
const networkFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match(APP_SHELL, { ignoreVary: true });
      if (shell) return shell;
    }
    throw error;
  }
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached || (await network) || Response.error();
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME));
    return;
  }

  if (isCacheableAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, PRECACHE));
  }
});
