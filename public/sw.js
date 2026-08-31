const CACHE_NAME = "tortuga-shell-v5";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/pwa-icon/192",
  "/pwa-icon/512",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const isNextJsChunk = (url) =>
  url.pathname.startsWith("/_next/static/chunks/") ||
  url.pathname.startsWith("/_next/static/css/") ||
  url.pathname.startsWith("/_next/static/media/");

const isImmutableStaticAsset = (url) =>
  // _next/static assets with content hashes in their filename are immutable
  // (images, fonts, etc. outside chunks). Chunks are handled separately above.
  url.pathname.startsWith("/_next/static/") && !isNextJsChunk(url);

const isStaticShellAsset = (url) =>
  url.pathname.startsWith("/pwa-icon/") ||
  url.pathname === "/manifest.webmanifest";

const isPublicCacheableApi = (url) =>
  [
    "/api/venues",
    "/api/highlights",
    "/api/tortuga-winners",
    "/api/profile/legends",
    "/api/classifiche",
  ].includes(url.pathname);

// ─── Lifecycle ──────────────────────────────────────────────────────────────

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

// ─── SKIP_WAITING message (sent by pwa-controller when update is waiting) ───

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Fetch Strategy ─────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Private and operational APIs must never be stored by the service worker.
  // Public, non-personal data can use a network-first fallback.
  if (url.pathname.startsWith("/api/")) {
    if (!isPublicCacheableApi(url)) {
      event.respondWith(
        fetch(request).catch(
          () =>
            new Response(
              JSON.stringify({ error: "Connessione non disponibile." }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            ),
        ),
      );
      return;
    }

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

  // Navigation (HTML pages): Always network, fallback to /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Next.js JS/CSS chunks: NETWORK FIRST.
  // After a deploy, cached stale chunks cause ChunkLoadErrors.
  // We always try the network; only if that fails we serve from cache
  // (so the user can at least see something while offline).
  if (isNextJsChunk(url)) {
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
          const cached = await caches.match(request);
          return cached ?? Response.error();
        }),
    );
    return;
  }

  // Other immutable static assets (hashed filenames): Cache first, then network
  if (isImmutableStaticAsset(url) || isStaticShellAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cachedResponse ?? Response.error());

        return cachedResponse ?? networkFetch;
      }),
    );
    return;
  }

  // Everything else: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cachedResponse ?? Response.error());

      return cachedResponse ?? networkFetch;
    }),
  );
});

// ─── Push Notifications ─────────────────────────────────────────────────────

const parsePushPayload = (event) => {
  if (!event.data) {
    return {
      title: "Tortuga",
      body: "C'e un nuovo aggiornamento pronto per te.",
      url: "/ciurma",
      tag: "tortuga-update",
    };
  }

  try {
    const json = event.data.json();
    return {
      title: json.title || "Tortuga",
      body: json.body || "C'e un nuovo aggiornamento pronto per te.",
      url: json.url || "/ciurma",
      tag: json.tag || "tortuga-update",
      icon: json.icon || "/pwa-icon/192",
      badge: json.badge || "/pwa-icon/192",
      renotify: Boolean(json.renotify),
    };
  } catch {
    return {
      title: "Tortuga",
      body: event.data.text() || "C'e un nuovo aggiornamento pronto per te.",
      url: "/ciurma",
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
        url: payload.url || "/ciurma",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/ciurma";

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
