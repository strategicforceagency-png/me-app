import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../lib/store";
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from "../lib/push";
import { fn, Reminders } from "../lib/supabase";

export const DEFAULT_REMINDERS: Reminders = { attivi: false, tz: "Europe/Rome", mattina: "07:30", sera: "21:30", revisione: "19:00", mattina_on: true, sera_on: true, revisione_on: true };

/** Card con le impostazioni dei promemoria. `compact` = invito breve per la schermata Oggi. */
export function RemindersCard({ compact }: { compact?: boolean }) {
  const app = useApp();
  const r = { ...DEFAULT_REMINDERS, ...(app.profile?.promemoria || {}) };
  const [device, setDevice] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentSubscription().then((s) => setDevice(!!s));
  }, []);

  const save = (patch: Partial<Reminders>) => app.setProfile({ promemoria: { ...r, ...patch, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Rome" } });

  const on = async () => {
    setBusy(true);
    try {
      await enablePush();
      await save({ attivi: true });
      setDevice(true);
      app.toast("Promemoria attivi");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  const off = async () => {
    setBusy(true);
    await disablePush();
    await save({ attivi: false });
    setDevice(false);
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      await fn("promemoria", "test");
      app.toast("Notifica inviata");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };

  const active = r.attivi && device;
  const iosHint = isIOS() && !isStandalone();

  if (compact) {
    if (active || device === null) return null;
    return (
      <div className="mt-4 rounded-[22px] border border-gold/40 bg-gold-tint p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <Bell size={22} className="text-gold shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-[15px]">Attiva i promemoria</div>
          <div className="text-[13px] text-muted mt-0.5">
            {iosHint ? "Su iPhone: Condividi → Aggiungi alla schermata Home, poi apri Habitus da lì e tocca Attiva." : "La mattina il piano del giorno, la sera il resoconto, la domenica il controllo settimanale."}
          </div>
        </div>
        {!iosHint && (
          <button onClick={on} disabled={busy} className="h-10 px-5 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold shrink-0 flex items-center gap-1.5">
            {busy && <Loader2 size={14} className="animate-spin" />} Attiva
          </button>
        )}
      </div>
    );
  }

  const row = (label: string, k: "mattina" | "sera" | "revisione", hint: string) => {
    const flag = `${k}_on` as const;
    const en = r[flag] !== false;
    return (
      <div className="flex items-center gap-3 py-3">
        <button onClick={() => save({ [flag]: !en } as Partial<Reminders>)} className={`h-6 w-10 rounded-full relative transition shrink-0 ${en ? "bg-brand" : "bg-line"}`} aria-label={label}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${en ? "left-[18px]" : "left-0.5"}`} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-medium">{label}</div>
          <div className="text-[12px] text-muted">{hint}</div>
        </div>
        <input type="time" value={r[k]} onChange={(e) => save({ [k]: e.target.value } as Partial<Reminders>)} className="h-10 px-2 rounded-xl bg-card text-[15px]" />
      </div>
    );
  };

  return (
    <div className="rounded-[22px] bg-surface shadow-soft p-5">
      <div className="flex items-center gap-3">
        {active ? <Bell size={20} className="text-gold" /> : <BellOff size={20} className="text-muted" />}
        <div className="flex-1">
          <div className="font-semibold text-[16px]">Promemoria</div>
          <div className="text-[12.5px] text-muted">{active ? "Attivi su questo dispositivo" : !pushSupported() && iosHint ? "Aggiungi Habitus alla schermata Home per attivarli" : "Non attivi su questo dispositivo"}</div>
        </div>
        <button onClick={active ? off : on} disabled={busy} className={`h-10 px-4 rounded-full text-[13.5px] font-semibold flex items-center gap-1.5 ${active ? "bg-card" : "bg-brand text-brand-fg"}`}>
          {busy && <Loader2 size={14} className="animate-spin" />} {active ? "Disattiva" : "Attiva"}
        </button>
      </div>
      <div className="mt-2 divide-y divide-line">
        {row("Mattina", "mattina", "Il piano della giornata")}
        {row("Sera", "sera", "Le abitudini che mancano")}
        {row("Domenica", "revisione", "Il controllo della settimana")}
      </div>
      {active && (
        <button onClick={test} disabled={busy} className="mt-2 text-[13px] text-gold font-medium">
          Invia una notifica di prova
        </button>
      )}
    </div>
  );
}
