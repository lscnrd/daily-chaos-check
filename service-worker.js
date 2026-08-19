// Minimal service worker: offline app-shell caching + local notifications.
// This does NOT implement server-sent Push (no VAPID/backend yet) — see
// README.md for what that would add in Phase 2.

const CACHE_NAME = "health-trail-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Cache-first for the app shell, network for everything else.
  if (APP_SHELL.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

// Messages from the page ask the service worker to show a notification.
// Showing it from here (rather than directly from page JS) means it can
// still fire while the page is backgrounded, as long as the browser keeps
// this service worker alive.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      renotify: true,
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});

// --- Phase 2 stub (real push, once you have a backend + VAPID keys) ---
// self.addEventListener("push", (event) => {
//   const data = event.data ? event.data.json() : {};
//   event.waitUntil(
//     self.registration.showNotification(data.title || "Health Trail", {
//       body: data.body || "",
//       icon: "/icons/icon-192.png",
//     })
//   );
// });
