// Service worker cho Hub Shell — cache-first để 4 trạm (file nặng, vài MB/trạm)
// chạy offline được sau lần mở đầu tiên. Bump CACHE_VERSION mỗi khi cập nhật
// nội dung bất kỳ file nào trong CORE_ASSETS để buộc trình duyệt tải bản mới.
const CACHE_VERSION = 'hubshell-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './Hub_Shell.html',
  './manifest.webmanifest',
  './RefrigDesignNH3.html',
  './NH3_Vessel_Calculator.html',
  './Pressure_Vessel_Calculator.html',
  './BOQ_Cost_Estimate_Calculator.html',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
