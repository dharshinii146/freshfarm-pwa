/* FreshFarm Direct - service worker: lets the pages open offline.
   Network first (so your latest edits always show), cache as the fallback. */
var V = "ffd-v1", FILES = ["./", "index.html", "customer.html", "farmer.html", "fpo.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "pictures/Screenshot 2026-11-09 140401.png"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(FILES) }).then(function () { return self.skipWaiting() })) });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== V }).map(function (x) { return caches.delete(x) })) }).then(function () { return self.clients.claim() })) });
self.addEventListener("fetch", function (e) {
   var r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
   e.respondWith(fetch(r).then(function (res) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp) }); return res })
      .catch(function () { return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match("index.html") }) }))
});
