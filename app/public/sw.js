// DC Emlak service worker — uygulama kabuğunu önbelleğe alır, çevrimdışıyken
// son görülen sayfaları sunar. Veri senkronu uygulama katmanında yapılır.
const CACHE = "dc-emlak-v2";
const SHELL = ["/", "/hesaplayicilar", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;
  // İmza bağlantıları ve davet kodları önbelleğe alınmaz (paylaşılan cihazda iz bırakmasın)
  if (url.pathname.startsWith("/imza/") || url.searchParams.has("davet")) return;
  // Ağ öncelikli; yalnızca başarılı, aynı kaynaklı ve önbelleğe izin veren yanıtlar saklanır
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && res.type === "basic" && !/no-store/.test(res.headers.get("cache-control") || "")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/"))),
  );
});
