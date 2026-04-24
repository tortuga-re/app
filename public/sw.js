const CACHE_NAME = "tortuga-shell-v2";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  "/prenota",
  "/profilo",
  "/sedi",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/pwa-icon/192",
  "/pwa-icon/512",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(true);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          return new Response(
            JSON.stringify({ error: "Connessione non disponibile." }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          return cachedPage || caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    }),
  );
});

const parsePushPayload = (event) => {
  if (!event.data) {
    return {
      title: "Tortuga",
      body: "C'e un nuovo aggiornamento pronto per te.",
      url: "/profilo",
      tag: "tortuga-update",
    };
  }

  try {
    const json = event.data.json();
    return {
      title: json.title || "Tortuga",
      body: json.body || "C'e un nuovo aggiornamento pronto per te.",
      url: json.url || "/profilo",
      tag: json.tag || "tortuga-update",
      icon: json.icon || "/pwa-icon/192",
      badge: json.badge || "/pwa-icon/192",
      renotify: Boolean(json.renotify),
    };
  } catch {
    return {
      title: "Tortuga",
      body: event.data.text() || "C'e un nuovo aggiornamento pronto per te.",
      url: "/profilo",
      tag: "tortuga-update",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/192",
      renotify: false,
    };
  }
};

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/pwa-icon/192",
      badge: payload.badge || "/pwa-icon/192",
      tag: payload.tag,
      renotify: payload.renotify,
      data: {
        url: payload.url || "/profilo",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/profilo";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
