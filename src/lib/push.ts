import { SUPABASE_KEY, SUPABASE_URL, fn } from "./supabase";

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function registerSW() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

const unb64u = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t + "===".slice((t.length + 3) % 4)), (c) => c.charCodeAt(0));
};

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Da chiamare dentro un tocco dell'utente (richiesto da iPhone). */
export async function enablePush() {
  if (!pushSupported()) throw new Error(isIOS() && !isStandalone() ? "Su iPhone aggiungi prima Habitus alla schermata Home e aprilo da lì" : "Questo browser non supporta le notifiche");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifiche non autorizzate: attivale nelle impostazioni del telefono");
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("./sw.js"));
  await navigator.serviceWorker.ready;
  const r = await fetch(`${SUPABASE_URL}/functions/v1/promemoria/vapid`, { headers: { apikey: SUPABASE_KEY } });
  const { key } = await r.json();
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options.applicationServerKey) {
    const cur = new Uint8Array(sub.options.applicationServerKey);
    const want = unb64u(key);
    if (cur.length !== want.length || cur.some((x, i) => x !== want[i])) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(key) });
  await fn("promemoria", "subscribe", sub.toJSON());
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (sub) {
    await fn("promemoria", "unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
}
