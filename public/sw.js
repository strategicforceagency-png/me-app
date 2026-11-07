/* Habitus – service worker: solo notifiche push (nessuna cache, per non servire versioni vecchie). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  const title = d.title || "Habitus";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || "",
      icon: "habitus-512.png?v=3",
      badge: "habitus-180.png?v=3",
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
      for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.navigate(url); return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
