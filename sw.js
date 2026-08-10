const CACHE_NAME = "daofa-quiz-1284-v2";
const APP_SHELL = ["./", "./index.html", "./bank1.js", "./bank2.js", "./bank3.js", "./bank4.js", "./bank5.js", "./bank6.js", "./offline-app.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => { if (event.request.method !== "GET") return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); } return response; }))); });
