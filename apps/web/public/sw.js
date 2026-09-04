/* eslint-disable no-restricted-globals */
/**
 * Gigvora service worker — static asset caching + app-shell offline support.
 *
 * This intentionally does NOT use Workbox/next-pwa; the caching surface we
 * need is small (Next static assets, fonts, images, the manifest/icons) and
 * a hand-rolled worker keeps full control over what is safe to cache in an
 * app with live, authenticated, frequently-changing data.
 *
 * Rules of the road:
 *  - Never intercept non-GET requests (POST/PUT/PATCH/DELETE pass straight
 *    through to the network — mutations must never be served from cache).
 *  - Never cache a request that carries an Authorization header, or any
 *    request aimed at the API origin / a `/api` path / the websocket path —
 *    those are live, authenticated, and must always hit the network.
 *  - Static, hashed Next.js build assets (`/_next/static/...`) and local
 *    image/font assets: cache-first (they're immutable, safe to reuse).
 *  - Everything else same-origin (HTML documents, RSC payloads): network
 *    first, falling back to cache when offline, so users never see stale
 *    authenticated content while online.
 */

const VERSION = 'v1';
const STATIC_CACHE = `gigvora-static-${VERSION}`;
const PAGE_CACHE = `gigvora-pages-${VERSION}`;

const STATIC_DEST = new Set(['style', 'script', 'font', 'image']);

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('gigvora-') && key !== STATIC_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isApiOrRealtime(url) {
  // Same-origin API/websocket paths, if the app is ever proxied through the
  // same origin. Cross-origin API calls (NEXT_PUBLIC_API_URL pointing at a
  // separate host) never reach this worker's fetch handler at all.
  return (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/socket.io')
  );
}

function isStaticAsset(request, url) {
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (url.pathname.startsWith('/icons/')) return true;
  if (url.pathname === '/manifest.webmanifest' || url.pathname === '/manifest.json') return true;
  if (STATIC_DEST.has(request.destination)) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle simple GETs.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin requests other than same-origin static assets: let the
  // browser handle them natively (this also keeps CDNs/analytics/etc. out
  // of scope, and never touches cross-origin API/socket traffic).
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated requests, whatever they are.
  if (request.headers.has('authorization') || request.headers.has('Authorization')) return;

  if (isApiOrRealtime(url)) return;

  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigations / documents / RSC data: network-first with an offline
  // fallback to whatever was last cached for that URL.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
