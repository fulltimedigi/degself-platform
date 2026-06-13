// Service worker لـ دق سلف — تثبيت PWA + دعم العمل بدون نت.
// مكتوب يدوياً بلا مكتبات (Next 16 + Turbopack). غيّر الإصدار لتحديث الكاش.
const CACHE = "degself-v1";
const OFFLINE_URL = "/offline.html";

// أصول أساسية نخزّنها وقت التثبيت لضمان شاشة أوفلاين لائقة.
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/brand/logo-arabic.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // التنقّل بين الصفحات: الشبكة أولاً، وعند انقطاع النت نرجع لصفحة الأوفلاين.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // الأصول الثابتة (بناء Next، الأيقونات، اللوقو): الكاش أولاً ثم الشبكة.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/brand")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
  }
});
