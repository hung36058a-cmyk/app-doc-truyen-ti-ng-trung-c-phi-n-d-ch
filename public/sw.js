// sw.js — Service worker: lưu app + từ điển vào máy để mở được khi không có mạng.
// Đổi VERSION mỗi khi phát hành bản mới để điện thoại tải bản mới về.

const VERSION = 'v19';
const CACHE = `doc-truyen-${VERSION}`;
const CORE = ['./', './index.html', './manifest.webmanifest', './data/cedict.tsv', './data/hanviet.tsv', './icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('doc-truyen-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Gọi AI không bao giờ lưu cache.
const NEVER_CACHE = ['api.anthropic.com'];
// Phông chữ và thư viện từ CDN: lưu lại sau lần tải đầu.
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NEVER_CACHE.includes(url.hostname)) return;

  // Trang chính: lấy bản mới khi có mạng, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(CACHE).then((c) => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Còn lại (JS, CSS, từ điển, icon, phông chữ, thư viện): ưu tiên bản đã lưu
  if (url.origin === self.location.origin || CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        }),
      ),
    );
  }
});
