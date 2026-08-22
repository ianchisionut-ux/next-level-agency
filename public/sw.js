// Service worker minim pentru Signal - scopul principal e instalabilitatea
// PWA ("Adaugă pe ecranul principal"), nu functionare completa offline
// (datele din Signal trebuie sa fie mereu la zi, nu dintr-un cache vechi).
//
// Strategie:
// - Navigare (pagini HTML): network-first, fallback pe /offline daca nu merge deloc.
// - Fisiere statice (_next/static, /brand, /icon-*): cache-first (nu se schimba des).
// - Orice altceva (mai ales /api/*): trece direct, fara cache - datele trebuie
//   sa fie mereu proaspete (postari, statistici, autentificare).

const CACHE_NAME = "signal-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/PATCH/DELETE (publicare, editare) - intotdeauna direct la retea

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // resurse externe (fonturi Google etc) - nu ne bagam

  // Niciodata cache pentru API - datele trebuie sa fie mereu la zi.
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((res) => res || Response.error()))
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
  }
});
