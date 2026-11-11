/* MARQUE ONE service worker — app shell cache-first, API never cached. */
const VERSION = "marque-one-v1";
const STATIC_CACHE = `${VERSION}-static`;

const CORE_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|mjs|png|jpe?g|svg|webp|gif|ico|woff2?|ttf)$/i.test(pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API traffic: same-origin /api/* and every cross-origin call
  // (the live backend is a different origin).
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Pages: network-first, offline page as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (
          (await caches.match("/offline.html")) ||
          (await caches.match("/")) ||
          new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
        );
      }),
    );
    return;
  }

  // App shell (CSS/JS/images/fonts): cache-first with runtime fill.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
