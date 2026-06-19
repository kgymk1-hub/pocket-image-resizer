const CACHE_NAME = "pocket-image-resizer-v17-sw-waiting";
const REQUIRED_ASSETS = [
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/image-loader.js",
  "./js/resize-service.js",
  "./js/file-service.js",
  "./js/settings-service.js",
  "./js/preset-service.js",
  "./libs/jszip.min.js",
  "./manifest.json",
  "./icons/icon.svg"
];

const OPTIONAL_ASSETS = [
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(REQUIRED_ASSETS);
      // PNGアイコンは差し替え時にCACHE_NAME更新が必要。任意キャッシュにしてinstall失敗を防ぐ。
      await Promise.all(OPTIONAL_ASSETS.map((asset) => cache.add(asset).catch(() => undefined)));
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
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
