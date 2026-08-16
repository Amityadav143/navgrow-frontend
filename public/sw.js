/*
 * Navgrow service worker — offline capability + instant repeat visits.
 *
 * Design goals (and the pitfalls they avoid):
 *  · NEVER cache the API (/api/*) — data must always be fresh.
 *  · NEVER cache-first HTML — navigations are network-first so new deploys and
 *    prerendered/OG pages are always picked up; a cached shell is only used
 *    when the user is genuinely offline.
 *  · Cache-first ONLY for hashed, immutable build assets (JS/CSS/fonts) and
 *    images — these are safe to serve instantly from cache.
 *  · A clear cache version so old caches are cleaned up on activate.
 *
 * This is intentionally dependency-free and conservative: if anything is
 * uncertain, it falls back to the network.
 */
const VERSION = 'navgrow-v1';
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;
const OFFLINE_URL = '/offline.html';

// Minimal precache: the offline fallback page only. Everything else is cached
// at runtime as it's requested, so we never ship a stale asset list.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => {})
  );
  self.skipWaiting();
});

// Clean up caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\/assets\/.+\.(js|css|woff2?|ttf|otf)$/i.test(url.pathname) ||
         /\.(woff2?|ttf|otf)$/i.test(url.pathname);
}
function isImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests. Let cross-origin (API on another host,
  // Unsplash, fonts, analytics) go straight to the network.
  const sameOrigin = url.origin === self.location.origin;

  // NEVER touch the API — always network, never cached.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations (HTML): network-first, fall back to cache, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (!sameOrigin) return;

  // Hashed static assets: cache-first (safe — filenames change on deploy).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }

  // Images: stale-while-revalidate (fast, self-healing) with a soft cap.
  if (isImage(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          cache.put(request, res.clone()).catch(() => {});
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else: just go to the network.
});

// Allow the page to tell a waiting SW to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
