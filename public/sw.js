/* Habitus – service worker: avvio senza rete + notifiche push.
 * Pagina: prima la rete (così ogni apertura prende la versione nuova), senza rete la copia salvata.
 * File dell'app (nomi con impronta) e caratteri: dalla copia salvata.
 * Dati (Supabase, AI): sempre dalla rete, mai salvati qui. */
const VERSION = "habitus-v4";
const SHELL = ["./", "./manifest.webmanifest", "./habitus.svg?v=4", "./habitus-180.png?v=4", "./habitus-192.png?v=4", "./habitus-512.png?v=4"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putCopy = (req, res) => {
  if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // pagina dell'app
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("./", copy));
          return res;
        })
        .catch(() => caches.match("./", { ignoreSearch: true }))
    );
    return;
  }

  // caratteri di Google
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => putCopy(req, res))));
    return;
  }

  // file dell'app sullo stesso dominio
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => putCopy(req, res))
          .catch(() => hit);
        // i file con impronta non cambiano mai: basta la copia
        return hit && url.pathname.includes("/assets/") ? hit : hit || net;
      })
    );
  }
});

/* ---------------- notifiche ---------------- */
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data && e.data.text() };
  }
  const title = d.title || "Habitus";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || "",
      icon: "habitus-192.png?v=4",
      badge: "habitus-192.png?v=4",
      tag: d.tag || "habitus",
      data: { url: d.url || "./" },
    })
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list)
        if (c.url.startsWith(self.registration.scope)) {
          c.navigate(url);
          return c.focus();
        }
      return self.clients.openWindow(url);
    })
  );
});
