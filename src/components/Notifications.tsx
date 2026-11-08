import { Bell, BookOpen, Briefcase, CalendarHeart, CheckCheck, ChevronRight, ClipboardCheck, Compass, Inbox, ListChecks, Trash2 } from "lucide-react";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { activeHabits, currentWeek, todayISO, type Path } from "../gentleman/types";
import { useApp, type Tab } from "../lib/store";
import { supabase } from "../lib/supabase";
import { dueReview, dueTrials } from "../screens/Progress";
import { Sheet } from "./ui";

/** Una cosa da fare adesso: si calcola dai dati e sparisce da sola quando è fatta. */
type Live = { id: string; icon: ReactNode; titolo: string; testo: string; vai: Tab; evento?: string };
/** Un promemoria arrivato (ricorrenze, controllo della settimana…): resta finché non lo leggi o lo cancelli. */
type Stored = { id: string; kind: string; titolo: string; testo: string | null; vai: string | null; letta: boolean; created_at: string };

const TABS: Tab[] = ["percorso", "linguaggio", "budget", "accademia", "fisico", "progressi", "armadio", "contenuti", "persone", "regali", "uscite", "lettere", "stile", "salute", "outfit", "fisionomia", "profumi", "pelletteria"];

type Nav = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

export function useNotifications() {
  const app = useApp();
  const [live, setLive] = useState<Live[]>([]);
  const [stored, setStored] = useState<Stored[]>([]);
  const path = (app.profile?.path as Path | null) ?? null;
  const start = app.profile?.path_started_at;

  const load = useCallback(async () => {
    const today = todayISO();
    const [k, t, people, notes, reviews, trials, checks] = await Promise.all([
      supabase.from("knowledge").select("id", { count: "exact", head: true }).eq("stato", "proposta"),
      supabase.from("tutorials").select("id", { count: "exact", head: true }).eq("stato", "proposta"),
      supabase.from("people").select("nome, date"),
      supabase.from("notifications").select("id, kind, titolo, testo, vai, letta, created_at").order("created_at", { ascending: false }).limit(40),
      path ? supabase.from("path_reviews").select("week, data, created_at") : Promise.resolve({ data: [] }),
      path ? supabase.from("field_trials").select("key, voto, note, done_at") : Promise.resolve({ data: [] }),
      path ? supabase.from("path_checks").select("key").eq("day", today) : Promise.resolve({ data: [] }),
    ]);
    const pelle = await supabase.from("collezione").select("nome, ultima_cura, created_at").eq("tipo", "pelle").eq("stato", "mio");
    const out: Live[] = [];

    // ricorrenze entro 7 giorni
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const soon: { n: number; txt: string }[] = [];
    for (const x of (people.data as { nome: string; date: { tipo: string; data: string }[] }[]) || [])
      for (const d of x.date || []) {
        const mmdd = String(d.data || "").slice(-5);
        if (!/^\d{2}-\d{2}$/.test(mmdd)) continue;
        let n = new Date(`${now.getFullYear()}-${mmdd}T00:00:00`).getTime();
        if (n < t0) n = new Date(`${now.getFullYear() + 1}-${mmdd}T00:00:00`).getTime();
        const days = Math.round((n - t0) / 86400000);
        if (days <= 7) soon.push({ n: days, txt: `${d.tipo || "Ricorrenza"} di ${x.nome} ${days === 0 ? "oggi" : days === 1 ? "domani" : `tra ${days} giorni`}` });
      }
    soon.sort((a, b) => a.n - b.n);
    for (const [i, s] of soon.entries())
      out.push({ id: `ric-${i}`, icon: <CalendarHeart size={18} />, titolo: s.n === 0 ? "È oggi" : "Si avvicina", testo: s.txt, vai: "persone" });

    // pelle da nutrire (ogni 4 mesi circa)
    const daNutrire = ((pelle.data as { nome: string; ultima_cura: string | null; created_at: string }[]) || []).filter((x) => (Date.now() - Date.parse(x.ultima_cura || x.created_at)) / 86400000 >= 120);
    if (daNutrire.length)
      out.push({ id: "pelle", icon: <Briefcase size={18} />, titolo: daNutrire.length === 1 ? "Un pezzo in pelle da nutrire" : `${daNutrire.length} pezzi in pelle da nutrire`, testo: daNutrire.map((x) => x.nome).slice(0, 3).join(", "), vai: "pelletteria" });

    // contenuti da approvare
    const prop = (k.count || 0) + (t.count || 0);
    if (prop) out.push({ id: "proposte", icon: <Inbox size={18} />, titolo: "Contenuti da approvare", testo: prop === 1 ? "Un insegnamento attende il tuo sì" : `${prop} insegnamenti e tutorial attendono il tuo sì`, vai: "contenuti" });

    if (path) {
      // controllo della settimana
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const due = dueReview(path, start, (reviews.data as any[]) || []);
      if (due)
        out.push({
          id: "revisione",
          icon: <ClipboardCheck size={18} />,
          titolo: due.kind === "partenza" ? "Il punto di partenza" : `Controllo della settimana ${due.week}`,
          testo: due.kind === "partenza" ? "Misure e foto di oggi, per vedere i progressi" : "Cinque minuti: il percorso si adatta alle tue risposte",
          vai: "percorso",
          evento: "habitus:revisione",
        });
      // prove sul campo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tr = dueTrials(path, start, (trials.data as any[]) || []);
      if (tr.length) out.push({ id: "prove", icon: <Compass size={18} />, titolo: tr.length === 1 ? "Una prova sul campo" : `${tr.length} prove sul campo`, testo: tr[0].titolo || "Da fare questa settimana", vai: "percorso" });
      // abitudini di oggi
      const habits = activeHabits(path, currentWeek(start));
      const done = new Set(((checks.data as { key: string }[]) || []).map((c) => c.key));
      const left = habits.filter((h) => !done.has(`h:${h.id}`)).length;
      if (left) out.push({ id: "abitudini", icon: <ListChecks size={18} />, titolo: left === 1 ? "Ti manca un'abitudine" : `Ti mancano ${left} abitudini`, testo: `${habits.length - left} di ${habits.length} fatte oggi`, vai: "percorso" });
    } else out.push({ id: "questionario", icon: <BookOpen size={18} />, titolo: "Il tuo percorso", testo: "Completa il questionario d'ingresso", vai: "percorso" });

    setLive(out);
    setStored((notes.data as Stored[]) || []);
  }, [path, start]);

  useEffect(() => {
    load().catch(() => {});
  }, [load, app.tab]);
  useEffect(() => {
    const f = () => load().catch(() => {});
    const vis = () => document.visibilityState === "visible" && f();
    window.addEventListener("habitus:notifiche", f);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("habitus:notifiche", f);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load]);

  const unread = stored.filter((s) => !s.letta).length;
  const count = live.length + unread;

  // numerino sull'icona dell'app = quante notifiche ci sono
  useEffect(() => {
    const nav = navigator as Nav;
    if (count > 0) nav.setAppBadge?.(count).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [count]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setStored((s) => s.map((x) => (ids.includes(x.id) ? { ...x, letta: true } : x)));
    await supabase.from("notifications").update({ letta: true }).in("id", ids);
  };
  const remove = async (id: string) => {
    setStored((s) => s.filter((x) => x.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };
  const clearRead = async () => {
    const ids = stored.filter((s) => s.letta).map((s) => s.id);
    setStored((s) => s.filter((x) => !x.letta));
    if (ids.length) await supabase.from("notifications").delete().in("id", ids);
  };
  return { live, stored, count, unread, markRead, remove, clearRead, reload: load };
}

export function BellButton({ count, onClick, className = "" }: { count: number; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`relative h-9 w-9 grid place-items-center rounded-full text-ink active:scale-[.96] transition ${className}`} aria-label={count ? `Notifiche, ${count} nuove` : "Notifiche"} title="Notifiche">
      <Bell size={20} strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d64545] text-white text-[10.5px] font-bold grid place-items-center ring-2 ring-bg">{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );
}

const when = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 60) return diff < 2 ? "ora" : `${Math.round(diff)} min fa`;
  if (diff < 60 * 24 && d.getDate() === new Date().getDate()) return `oggi, ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < 60 * 48) return "ieri";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

export function NotificationsSheet({ open, onClose, n }: { open: boolean; onClose: () => void; n: ReturnType<typeof useNotifications> }) {
  const app = useApp();
  const go = (vai: string | null | undefined, evento?: string) => {
    onClose();
    if (vai && (TABS as string[]).includes(vai)) app.setTab(vai as Tab);
    else if (vai === "revisione") {
      app.setTab("percorso");
      evento = "habitus:revisione";
    }
    if (evento) setTimeout(() => window.dispatchEvent(new CustomEvent(evento!)), 450);
  };
  const unreadIds = n.stored.filter((s) => !s.letta).map((s) => s.id);
  return (
    <Sheet open={open} onClose={onClose} title="Notifiche">
      {n.live.length > 0 && (
        <>
          <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted mb-2">Da fare</div>
          <div className="rounded-[16px] bg-card overflow-hidden divide-y divide-line mb-5">
            {n.live.map((x) => (
              <button key={x.id} onClick={() => go(x.vai, x.evento)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-surface/60">
                <span className="h-9 w-9 shrink-0 rounded-full bg-gold/15 text-gold grid place-items-center">{x.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium">{x.titolo}</span>
                  <span className="block text-[13px] text-muted">{x.testo}</span>
                </span>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center mb-2">
        <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Promemoria</div>
        <div className="ml-auto flex gap-3">
          {unreadIds.length > 0 && (
            <button onClick={() => n.markRead(unreadIds)} className="text-[12.5px] font-semibold text-gold flex items-center gap-1">
              <CheckCheck size={14} /> Segna tutte lette
            </button>
          )}
          {!unreadIds.length && n.stored.length > 0 && (
            <button onClick={n.clearRead} className="text-[12.5px] font-semibold text-muted">
              Svuota
            </button>
          )}
        </div>
      </div>
      {n.stored.length ? (
        <div className="rounded-[16px] bg-card overflow-hidden divide-y divide-line">
          {n.stored.map((x) => (
            <div key={x.id} className="flex items-start gap-3 px-3.5 py-3">
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${x.letta ? "bg-transparent" : "bg-[#d64545]"}`} />
              <button
                onClick={() => {
                  n.markRead([x.id]);
                  go(x.vai);
                }}
                className="flex-1 min-w-0 text-left"
              >
                <span className={`block text-[15px] ${x.letta ? "text-muted" : "font-medium"}`}>{x.titolo}</span>
                {x.testo && <span className="block text-[13px] text-muted">{x.testo}</span>}
                <span className="block text-[11.5px] text-muted/80 mt-0.5">{when(x.created_at)}</span>
              </button>
              <button onClick={() => n.remove(x.id)} className="h-8 w-8 -mr-1 grid place-items-center text-muted shrink-0" aria-label="Elimina">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] bg-card px-4 py-5 text-[13.5px] text-muted text-center">
          Qui arrivano i promemoria di ricorrenze, pensierini e controlli settimanali. Toccane uno per andare dritto alla sezione.
        </div>
      )}
    </Sheet>
  );
}
