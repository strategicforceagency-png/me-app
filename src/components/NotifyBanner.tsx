import { Bell, Loader2, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../lib/store";
import { currentSubscription, enablePush, isIOS, isStandalone, pushSupported } from "../lib/push";
import { DEFAULT_REMINDERS } from "./Reminders";

const KEY = "habitus-banner-notifiche";

/**
 * Banner in cima all'app finché le notifiche non sono attive su questo dispositivo.
 * Si può rimandare (torna dopo 3 giorni). Su iPhone nel browser spiega prima come aggiungere l'app alla Home.
 */
export function NotifyBanner() {
  const app = useApp();
  const [attive, setAttive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [nascosto, setNascosto] = useState(() => {
    try {
      return Number(localStorage.getItem(KEY) || 0) > Date.now();
    } catch {
      return false;
    }
  });
  const negato = typeof Notification !== "undefined" && Notification.permission === "denied";
  const iosBrowser = isIOS() && !isStandalone();

  useEffect(() => {
    currentSubscription()
      .then((s) => setAttive(!!s && !!app.profile?.promemoria?.attivi))
      .catch(() => setAttive(false));
  }, [app.profile?.promemoria?.attivi]);

  if (attive !== false || nascosto || !app.profile) return null;
  if (!pushSupported() && !iosBrowser) return null;

  const rimanda = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + 3 * 86400000));
    } catch {
      /* niente */
    }
    setNascosto(true);
  };
  const attiva = async () => {
    setBusy(true);
    try {
      await enablePush();
      const r = { ...DEFAULT_REMINDERS, ...(app.profile?.promemoria || {}) };
      await app.setProfile({ promemoria: { ...r, attivi: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Rome" } });
      setAttive(true);
      app.toast("Notifiche attive: Alfred la terrà aggiornata");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="mx-5 lg:mx-10 mb-3 rounded-[20px] bg-hero text-white p-4 shadow-soft relative">
      <button onClick={rimanda} className="absolute top-2.5 right-2.5 h-8 w-8 grid place-items-center rounded-full text-white/60" aria-label="Più tardi">
        <X size={16} />
      </button>
      <div className="flex gap-3 pr-6">
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-white/10 grid place-items-center text-gold">
          <Bell size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px]">Attivi le notifiche</div>
          <p className="text-[13px] text-white/75 mt-0.5 leading-snug">
            {iosBrowser
              ? "Su iPhone le notifiche arrivano solo dall'app sulla Home: tocchi Condividi, poi «Aggiungi alla schermata Home», e apra Habitus da lì."
              : negato
                ? "Le notifiche sono bloccate per Habitus: le riattivi in Impostazioni › Notifiche › Habitus (o nelle impostazioni del sito), poi torni qui."
                : "Così Alfred le scrive quando ha finito un incarico, quando il meteo cambia l'outfit, per ricorrenze, revisione dell'armadio e promemoria."}
          </p>
          {!iosBrowser && !negato && (
            <button onClick={attiva} disabled={busy} className="mt-3 h-10 px-4 rounded-full bg-gold text-hero text-[14px] font-semibold flex items-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Attiva le notifiche
            </button>
          )}
          {iosBrowser && (
            <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-gold">
              <Share size={14} /> Condividi › Aggiungi alla schermata Home
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
