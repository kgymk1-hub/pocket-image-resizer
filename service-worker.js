const CACHE_NAME = "pocket-image-resizer-v2";
const ASSETS = [
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/image-loader.js",
  "./js/resize-service.js",
  "./js/file-service.js",
  "./js/settings-service.js",
  "./js/preset-service.js",
  "./manifest.json",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => {
      if (event.request.mode === "navigate") return caches.match("./index.html");
      throw new Error("Network request failed");
    }))
  );
});
