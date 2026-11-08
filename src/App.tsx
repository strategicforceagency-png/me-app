import { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { ScanFace, SprayCan, Briefcase, ChevronDown, Compass, Fingerprint, Dumbbell, Feather, GraduationCap, HeartPulse, Loader2, LogOut, Moon, Plus, Shirt, Sparkles, Sun, TrendingUp, User, Wallet, Inbox, Heart, Gift, UtensilsCrossed, PenLine } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Field, inputCls, PrimaryButton, Sheet, Toast } from "./components/ui";
import { AppProvider, Tab, useApp } from "./lib/store";
import { useTheme } from "./lib/theme";
import { passkeyError, passkeySupported, signInPasskey } from "./lib/passkey";
import { BudgetScreen } from "./screens/Budget";
import { ProgressScreen } from "./screens/Progress";
import { ContentsScreen } from "./screens/Contents";
import { MaestroChat } from "./components/MaestroChat";
import { BellButton, NotificationsSheet, useNotifications } from "./components/Notifications";
import { NotifyBanner } from "./components/NotifyBanner";
import { PullToRefresh } from "./components/PullToRefresh";
import { GiftsScreen, LettersScreen, OutingsScreen, PeopleScreen } from "./screens/Life";
import { supabase, useSignedUrl, learnMe } from "./lib/supabase";
import { OutfitBuilder } from "./screens/OutfitBuilder";
import { Profile } from "./screens/Profile";
import { AddGarmentSheet, Wardrobe } from "./screens/Wardrobe";
import { Health } from "./screens/Health";
import { StyleScreen } from "./screens/Style";
import { AcademyScreen } from "./screens/Academy";
import { PathScreen } from "./screens/Path";
import { FitnessScreen } from "./screens/Fitness";
import { FaceScreen } from "./screens/Face";
import { FragrancesScreen, LeatherScreen } from "./screens/Collezione";
import { LanguageScreen } from "./screens/Language";
import { Questionnaire } from "./gentleman/Questionnaire";

export { useTheme } from "./lib/theme";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(() => /type=recovery/.test(window.location.hash));
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (recovery && session) return <NewPassword onDone={() => setRecovery(false)} />;

  if (session === undefined)
    return (
      <div className="h-[100dvh] grid place-items-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!session) return <Auth />;
  return (
    <AppProvider uid={session.user.id} email={session.user.email ?? ""} key={session.user.id}>
      <Shell />
    </AppProvider>
  );
}

/* ---------------- marchio ---------------- */
export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return <img src="./habitus.svg?v=4" alt="" className={`${className} rounded-[10px] ring-1 ring-gold/30`} />;
}
function Wordmark({ sub = true }: { sub?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Mark />
      <div className="leading-none">
        <div className="font-display text-[22px] font-semibold tracking-[0.18em] uppercase">Habitus</div>
        {sub && <div className="text-[10.5px] tracking-[0.14em] uppercase text-gold mt-1">Accademia del gentleman</div>}
      </div>
    </div>
  );
}

function Hanger({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 7a2 2 0 1 1 2-2" />
      <path d="M12 7v1.2L3.2 15.1A1.5 1.5 0 0 0 4.1 18h15.8a1.5 1.5 0 0 0 .9-2.9L12 8.2" />
    </svg>
  );
}

type NavItem = { id: Tab; label: string; short?: string; icon: (p: { size?: number; className?: string }) => JSX.Element; soon?: boolean };
const I = (C: typeof Shirt) => (p: { size?: number; className?: string }) => <C size={p.size ?? 18} className={p.className} strokeWidth={1.8} />;
const ITEMS: Record<Tab, NavItem> = {
  percorso: { id: "percorso", label: "Oggi", short: "Oggi", icon: I(Compass) },
  linguaggio: { id: "linguaggio", label: "Linguaggio", icon: I(Feather) },
  armadio: { id: "armadio", label: "Armadio", icon: (p) => <Hanger size={p.size ?? 18} className={p.className} /> },
  outfit: { id: "outfit", label: "Outfit", icon: I(Shirt) },
  stile: { id: "stile", label: "Ispirazioni", icon: I(Sparkles) },
  budget: { id: "budget", label: "Budget", short: "Budget", icon: I(Wallet) },
  progressi: { id: "progressi", label: "Progressi", icon: I(TrendingUp) },
  contenuti: { id: "contenuti", label: "Contenuti", icon: I(Inbox) },
  persone: { id: "persone", label: "Persone", short: "Persone", icon: I(Heart) },
  regali: { id: "regali", label: "Regali", icon: I(Gift) },
  uscite: { id: "uscite", label: "Uscite", short: "Uscite", icon: I(UtensilsCrossed) },
  lettere: { id: "lettere", label: "Lettere", short: "Lettere", icon: I(PenLine) },
  accademia: { id: "accademia", label: "Lezioni", short: "Lezioni", icon: I(GraduationCap) },
  salute: { id: "salute", label: "Salute", icon: I(HeartPulse) },
  fisico: { id: "fisico", label: "Allenamento", short: "Allenamento", icon: I(Dumbbell) },
  fisionomia: { id: "fisionomia", label: "Fisionomia", icon: I(ScanFace) },
  profumi: { id: "profumi", label: "Profumi", icon: I(SprayCan) },
  pelletteria: { id: "pelletteria", label: "Pelletteria", icon: I(Briefcase) },
  profilo: { id: "profilo", label: "Profilo", icon: I(User) },
};
/** Le cinque aree, uguali nel menu laterale e nella barra in basso. Il profilo sta in alto a destra. */
const GROUPS: { id: string; label: string; icon: NavItem["icon"]; items: Tab[] }[] = [
  { id: "oggi", label: "Oggi", icon: I(Compass), items: ["percorso", "progressi"] },
  { id: "accademia", label: "Accademia", icon: I(GraduationCap), items: ["accademia", "contenuti", "linguaggio"] },
  { id: "stile", label: "Stile", icon: (p) => <Hanger size={p.size ?? 18} className={p.className} />, items: ["armadio", "outfit", "stile", "profumi", "pelletteria", "budget"] },
  { id: "corpo", label: "Corpo", icon: I(Dumbbell), items: ["fisico", "fisionomia", "salute"] },
  { id: "vita", label: "Vita", icon: I(Heart), items: ["persone", "regali", "uscite", "lettere"] },
];
const groupOf = (t: Tab) => GROUPS.find((g) => g.items.includes(t)) || { id: "tu", label: "Tu", icon: I(User), items: ["profilo"] as Tab[] };

/** Segnali nel menu: proposte da approvare, ricorrenze vicine, controllo della settimana. */
type Badges = Partial<Record<Tab, number>>;
function useBadges(tab: Tab) {
  const [b, setB] = useState<Badges>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const [k, t, p] = await Promise.all([
        supabase.from("knowledge").select("id", { count: "exact", head: true }).eq("stato", "proposta"),
        supabase.from("tutorials").select("id", { count: "exact", head: true }).eq("stato", "proposta"),
        supabase.from("people").select("date"),
      ]);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      let soon = 0;
      for (const x of (p.data as { date: { data: string }[] }[]) || [])
        for (const d of x.date || []) {
          const mmdd = String(d.data || "").slice(-5);
          if (!/^\d{2}-\d{2}$/.test(mmdd)) continue;
          let n = new Date(`${now.getFullYear()}-${mmdd}T00:00:00`).getTime();
          if (n < today) n = new Date(`${now.getFullYear() + 1}-${mmdd}T00:00:00`).getTime();
          if ((n - today) / 86400000 <= 7) soon++;
        }
      if (alive) setB({ contenuti: (k.count || 0) + (t.count || 0), persone: soon });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [tab]);
  return b;
}
const groupBadge = (g: { items: Tab[] }, b: Badges) => g.items.reduce((n, id) => n + (b[id] || 0), 0);

/** Aggiunta rapida: le cose che si aggiungono più spesso, da qualunque schermata. */
function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const go = (fn: () => void) => {
    onClose();
    setTimeout(fn, 150);
  };
  const opts: { icon: ReactNode; label: string; hint: string; run: () => void }[] = [
    { icon: <Inbox size={20} />, label: "Un contenuto da analizzare", hint: "Profilo, reel, video, articolo", run: () => app.setTab("contenuti") },
    { icon: <Hanger size={20} />, label: "Un capo nell'armadio", hint: "Foto, link o etichetta", run: () => app.setAddOpen(true) },
    { icon: <Heart size={20} strokeWidth={1.8} />, label: "Una persona o un'idea per lei", hint: "Date, gusti, cose che le piacciono", run: () => app.setTab("persone") },
    { icon: <TrendingUp size={20} strokeWidth={1.8} />, label: "Peso e misure", hint: "Aggiorna i progressi", run: () => app.setTab("progressi") },
    { icon: <Wallet size={20} strokeWidth={1.8} />, label: "Una spesa", hint: "Acquisti, sarto, calzolaio", run: () => app.setTab("budget") },
    { icon: <PenLine size={20} strokeWidth={1.8} />, label: "Un messaggio da scrivere", hint: "Biglietto, lettera, invito", run: () => app.setTab("lettere") },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Cosa vuoi aggiungere?">
      <div className="grid gap-2 pb-6 sm:grid-cols-2">
        {opts.map((o) => (
          <button key={o.label} onClick={() => go(o.run)} className="flex items-center gap-3 rounded-[18px] bg-card p-4 text-left hover:ring-1 hover:ring-gold">
            <span className="h-10 w-10 rounded-full bg-surface grid place-items-center text-gold shrink-0">{o.icon}</span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{o.label}</span>
              <span className="block text-[12.5px] text-muted">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function Avatar({ size = 32 }: { size?: number }) {
  const app = useApp();
  const photo = useSignedUrl("avatars", app.profile?.avatar_photo_path);
  return (
    <span className="rounded-full overflow-hidden bg-gold-tint grid place-items-center font-display text-gold shrink-0" style={{ height: size, width: size, fontSize: size * 0.45 }}>
      {photo ? <img src={photo} className="h-full w-full object-cover object-top" /> : (app.profile?.nome || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Sotto-sezioni dell'area corrente, in alto sul telefono. */
function SubTabs({ badges }: { badges: Badges }) {
  const app = useApp();
  const g = groupOf(app.tab);
  if (g.items.length < 2) return null;
  return (
    <div className="lg:hidden px-5 mb-3 -mt-0.5 flex gap-1.5 overflow-x-auto no-scrollbar">
      {g.items.map((id) => {
        const on = app.tab === id;
        return (
          <button key={id} onClick={() => app.setTab(id)} className={`h-9 px-4 rounded-full text-[13.5px] font-semibold shrink-0 transition ${on ? "bg-brand text-brand-fg" : "bg-card text-muted"}`}>
            {ITEMS[id].short || ITEMS[id].label}
            {!!badges[id] && <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${on ? "bg-white/20" : "bg-gold text-ongold"}`}>{badges[id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- barra laterale (computer) e menu (telefono) ---------------- */
function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  const key = `habitus-menu-chiuso:${label}`;
  const [chiuso, setChiuso] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const cambia = () => {
    setChiuso(!chiuso);
    try {
      localStorage.setItem(key, !chiuso ? "1" : "0");
    } catch {
      /* ok */
    }
  };
  return (
    <div className="mt-1.5">
      <button onClick={cambia} className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted hover:text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${chiuso ? "-rotate-90" : ""}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ${chiuso ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}>
        <div className={`min-h-0 overflow-hidden space-y-0.5 ${chiuso ? "" : "pt-0.5"}`}>{children}</div>
      </div>
    </div>
  );
}

function SidebarBody({ onNav, badges, onAdd, bell }: { onNav?: () => void; badges: Badges; onAdd: () => void; bell?: ReactNode }) {
  const app = useApp();
  const { theme, toggle } = useTheme();
  const go = (t: Tab) => {
    app.setTab(t);
    onNav?.();
  };
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-1 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Wordmark />
        </div>
        {bell}
        <button
          onClick={() => {
            onAdd();
            onNav?.();
          }}
          className="h-9 w-9 shrink-0 grid place-items-center rounded-full bg-brand text-brand-fg shadow-pill active:scale-[.96] transition"
          aria-label="Aggiungi"
          title="Aggiungi"
        >
          <Plus size={18} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3" aria-label="Navigazione principale">
        {GROUPS.map((g) => (
          <NavGroup key={g.label} label={g.label}>
            {g.items.map((id) => {
              const it = ITEMS[id];
              const on = app.tab === id;
              return (
                <button
                  key={id}
                  onClick={() => go(id)}
                  className={`relative flex h-[31px] w-full items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] transition-colors ${
                    on ? "bg-sidebar-active font-bold text-ink" : "text-muted hover:bg-sidebar-active/60 hover:text-ink"
                  }`}
                >
                  {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gold" />}
                  <it.icon size={18} />
                  <span className="flex-1 text-left">{it.label}</span>
                  {!!badges[id] && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gold text-ongold text-[11px] font-bold grid place-items-center">{badges[id]}</span>}
                </button>
              );
            })}
          </NavGroup>
        ))}
      </nav>
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-[12px] border border-line bg-surface p-1.5">
          <button onClick={() => go("profilo")} className="min-w-0 flex-1 text-left flex items-center gap-2.5">
            <Avatar />
            <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{app.profile?.nome}</span>
            <span className="block truncate text-[11px] text-muted">Profilo e impostazioni</span>
            </span>
          </button>
          <button onClick={toggle} className="h-8 w-8 grid place-items-center text-muted hover:text-ink" aria-label={theme === "dark" ? "Tema chiaro" : "Tema scuro"} title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="h-8 w-8 grid place-items-center text-muted hover:text-ink" aria-label="Esci" title="Esci">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const app = useApp();
  const badges = useBadges(app.tab);
  const notifiche = useNotifications();
  // se la scheda su di te è vecchia di qualche giorno, si aggiorna da sola in background
  useEffect(() => {
    const sc = app.profile?.scheda as { aggiornata?: string } | undefined;
    if (!app.profile?.path) return;
    if (!sc?.aggiornata || Date.now() - Date.parse(sc.aggiornata) > 3 * 86400000) learnMe((x) => app.setProfile({ scheda: x }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!app.profile]);
  // tutorial illustrati delle lezioni pratiche: si creano una volta, in background
  useEffect(() => {
    if (app.profile) import("./screens/Tutorials").then((m) => m.avviaLibreria());
  }, [!!app.profile]);
  const [bellOpen, setBellOpen] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [last, setLast] = useState<Record<string, Tab>>({});
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let hidden = 0;
    const vis = () => {
      if (document.hidden) hidden = Date.now();
      else if (hidden && Date.now() - hidden > 5 * 60 * 1000) app.reload();
    };
    const on = () => {
      setOnline(true);
      app.reload();
    };
    const off = () => setOnline(false);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setLast((l) => ({ ...l, [groupOf(app.tab).id]: app.tab }));
    window.scrollTo({ top: 0 });
  }, [app.tab]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const vai = q.get("vai");
    if (vai === "revisione") {
      app.setTab("percorso");
      setTimeout(() => window.dispatchEvent(new CustomEvent("habitus:revisione")), 600);
    } else if (vai === "alfred") setTimeout(() => window.dispatchEvent(new CustomEvent("habitus:apri-alfred")), 800);
    else if (vai && ["percorso", "linguaggio", "budget", "accademia", "fisico", "progressi", "armadio", "contenuti", "persone", "regali", "uscite", "lettere", "fisionomia", "profumi", "pelletteria", "outfit", "stile"].includes(vai)) app.setTab(vai as Tab);
    if (q.size) history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ritorno dal collegamento Whoop (?whoop=ok)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ig = q.get("instagram");
    if (ig) {
      app.setTab("stile");
      app.toast(
        ig === "ok"
          ? "Instagram collegato"
          : ig === "annullato"
            ? "Collegamento Instagram annullato"
            : ig === "nessun-account-professionale"
              ? "Nessun account Instagram professionale collegato a una Pagina Facebook"
              : `Instagram: ${ig}`,
      );
      history.replaceState(null, "", window.location.pathname);
      return;
    }
    const w = q.get("whoop");
    if (!w) return;
    app.setTab("salute");
    app.toast(w === "ok" ? "Whoop collegato" : w === "annullato" ? "Collegamento Whoop annullato" : `Whoop: ${w}`);
    history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="min-h-[100dvh] bg-bg">
      {/* Barra laterale su computer */}
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-line bg-sidebar lg:block">
        <SidebarBody badges={badges} onAdd={() => setAddMenu(true)} bell={<BellButton count={notifiche.count} onClick={() => setBellOpen(true)} className="shrink-0" />} />
      </aside>

      {/* Intestazione su telefono */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <button onClick={() => app.setTab("percorso")} aria-label="Home">
          <Wordmark sub={false} />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <BellButton count={notifiche.count} onClick={() => setBellOpen(true)} />
          <button onClick={() => setAddMenu(true)} className="h-9 w-9 grid place-items-center rounded-full bg-brand text-brand-fg shadow-pill" aria-label="Aggiungi">
            <Plus size={19} />
          </button>
          <button onClick={() => app.setTab("profilo")} className={`h-9 w-9 grid place-items-center rounded-full ${app.tab === "profilo" ? "ring-2 ring-gold" : ""}`} aria-label="Profilo e impostazioni">
            <Avatar size={32} />
          </button>
        </div>
      </header>

      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1180px] pt-3 lg:pt-8">
          {!online && (
            <div className="mx-5 lg:mx-10 mb-3 rounded-full bg-burgundy/10 text-burgundy text-[12.5px] font-medium px-4 py-2 text-center">
              Sei senza rete: vedi l'ultima copia salvata. Le modifiche torneranno possibili appena sei di nuovo online.
            </div>
          )}
          <NotifyBanner />
          <SubTabs badges={badges} />
          {app.tab === "budget" && <BudgetScreen />}
          {app.tab === "progressi" && <ProgressScreen />}
          {app.tab === "contenuti" && <ContentsScreen />}
          {app.tab === "persone" && <PeopleScreen />}
          {app.tab === "regali" && <GiftsScreen />}
          {app.tab === "uscite" && <OutingsScreen />}
          {app.tab === "lettere" && <LettersScreen />}
          {app.tab === "percorso" && <PathScreen />}
          {app.tab === "linguaggio" && <LanguageScreen />}
          {app.tab === "armadio" && <Wardrobe />}
          {app.tab === "outfit" && <OutfitBuilder />}
          {app.tab === "profilo" && <Profile />}
          {app.tab === "stile" && <StyleScreen />}
          {app.tab === "accademia" && <AcademyScreen />}
          {app.tab === "salute" && <Health />}
          {app.tab === "fisico" && <FitnessScreen />}
          {app.tab === "fisionomia" && <FaceScreen />}
          {app.tab === "profumi" && <FragrancesScreen />}
          {app.tab === "pelletteria" && <LeatherScreen />}
        </div>
      </main>
      {app.tab !== "armadio" && <AddGarmentSheet open={app.addOpen} onClose={() => app.setAddOpen(false)} />}

      <MaestroChat />
      <PullToRefresh />
      <QuickAdd open={addMenu} onClose={() => setAddMenu(false)} />

      {/* Dock sul telefono: le cinque aree; dentro ogni area le sotto-sezioni sono in alto */}
      <nav
        aria-label="Navigazione rapida"
        className="fixed inset-x-3 bottom-[calc(8px+env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-[480px] grid-cols-5 gap-0.5 rounded-[26px] border border-line bg-surface/90 p-1.5 shadow-dock backdrop-blur-md lg:hidden"
      >
        {GROUPS.map((g) => {
          const on = groupOf(app.tab).id === g.id;
          return (
            <button
              key={g.id}
              onClick={() => app.setTab(on ? g.items[0] : last[g.id] || g.items[0])}
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10.5px] font-semibold transition-colors ${on ? "text-brand-fg" : "text-muted"}`}
            >
              {on && <motion.span layoutId="dock" className="absolute inset-0 rounded-[20px] bg-brand shadow-pill" transition={{ type: "spring", damping: 30, stiffness: 380 }} />}
              <span className="relative">
                <g.icon size={20} />
                {groupBadge(g, badges) > 0 && <span className={`absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full ring-2 ${on ? "bg-gold ring-brand" : "bg-gold ring-surface"}`} />}
              </span>
              <span className="relative">{g.label}</span>
            </button>
          );
        })}
      </nav>

      <NotificationsSheet open={bellOpen} onClose={() => setBellOpen(false)} n={notifiche} />

      {app.quizOpen && (
        <Questionnaire
          onClose={() => app.setQuizOpen(false)}
          onDone={() => {
            app.setQuizOpen(false);
            app.setTab("percorso");
            app.toast("Il tuo percorso è pronto");
          }}
        />
      )}
      <Toast msg={app.toastMsg} />
    </div>
  );
}

/* ---------------- nuova password (dal link di recupero) ---------------- */
function NewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setErr("Le due password non coincidono");
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    history.replaceState(null, "", window.location.pathname);
    onDone();
  };
  return (
    <div className="min-h-[100dvh] bg-bg">
      <div className="mx-auto w-full max-w-[430px] min-h-[100dvh] px-6 flex flex-col justify-center">
        <Wordmark />
        <h1 className="mt-8 font-display text-[36px] font-semibold leading-[1.05]">Scegli una nuova password</h1>
        <p className="mt-2 text-muted">Poi, dal profilo, attiva la passkey: così non ti servirà più.</p>
        <form onSubmit={save} className="mt-8 space-y-4">
          <Field label="Nuova password">
            <input className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
          </Field>
          <Field label="Ripeti la password">
            <input className={inputCls} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required />
          </Field>
          {err && <p className="text-[14px] text-danger">{err}</p>}
          <PrimaryButton type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />} Salva e entra
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pkBusy, setPkBusy] = useState(false);
  const [info, setInfo] = useState("");
  const forgot = async () => {
    setErr("");
    setInfo("");
    if (!email.includes("@")) return setErr("Scrivi prima la tua email qui sopra");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    setBusy(false);
    if (error) setErr(/rate|seconds/i.test(error.message) ? "Hai appena chiesto un link: aspetta un minuto e riprova" : error.message);
    else setInfo("Ti ho mandato un'email con il link per scegliere una nuova password. Aprila da questo dispositivo.");
  };
  const passkey = async () => {
    setPkBusy(true);
    setErr("");
    try {
      await signInPasskey();
    } catch (e) {
      const m = passkeyError(e);
      if (m) setErr(m);
    }
    setPkBusy(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pw })
        : await supabase.auth.signUp({ email, password: pw, options: { data: { nome } } });
    if (r.error)
      setErr(
        r.error.message.includes("Invalid login")
          ? "Email o password errate"
          : r.error.message.includes("Database error")
            ? "Registrazioni chiuse: questa app è personale"
            : r.error.message,
      );
    else if (mode === "up" && !r.data.session) {
      const s = await supabase.auth.signInWithPassword({ email, password: pw });
      if (s.error) setErr("Account creato: ora accedi.");
    }
    setBusy(false);
  };
  return (
    <div className="min-h-[100dvh] bg-bg lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#1F3D2E] text-[#F4EFE4] p-12">
        <Wordmark />
        <div>
          <div className="font-display text-[56px] leading-[1.02] font-semibold">
            Il tuo stile,
            <br />
            la tua salute,
            <br />
            il tuo fisico.
          </div>
          <div className="mt-6 h-px w-24 bg-[#C8A65E]" />
          <p className="mt-6 text-[#B9C2B4] max-w-[380px]">Habitus: dal latino, l'abito, l'abitudine e il corpo. Tutto ciò che ti rende te, in un unico posto.</p>
        </div>
        <div className="text-[12px] tracking-[0.14em] uppercase text-[#C8A65E]">Accademia del gentleman</div>
      </div>
      <div className="mx-auto w-full max-w-[430px] min-h-[100dvh] px-6 flex flex-col justify-center">
        <div className="lg:hidden">
          <Wordmark />
          <h1 className="mt-8 font-display text-[40px] font-semibold leading-[1.05]">
            Il tuo stile,
            <br />
            la tua salute, il tuo fisico.
          </h1>
        </div>
        <p className="mt-3 text-muted">{mode === "in" ? "Accedi per continuare" : "Crea il tuo account personale"}</p>
        {mode === "in" && passkeySupported() && (
          <>
            <button onClick={passkey} disabled={pkBusy} className="mt-8 w-full h-14 rounded-full bg-brand text-brand-fg text-[16px] font-semibold flex items-center justify-center gap-2.5 shadow-pill">
              {pkBusy ? <Loader2 size={19} className="animate-spin" /> : <Fingerprint size={20} />} Accedi con passkey
            </button>
            <div className="mt-6 flex items-center gap-3 text-[12px] uppercase tracking-[0.14em] text-muted">
              <span className="h-px flex-1 bg-line" /> oppure con la password <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}
        <form onSubmit={submit} className={`${mode === "in" && passkeySupported() ? "mt-5" : "mt-8"} space-y-4`}>
          {mode === "up" && (
            <Field label="Nome">
              <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} required />
            </Field>
          )}
          <Field label="Email">
            <input className={inputCls} type="email" autoComplete="username webauthn" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input
              className={inputCls}
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          {err && <p className="text-[14px] text-danger">{err}</p>}
          {info && <p className="text-[14px] text-gold">{info}</p>}
          <PrimaryButton type="submit" className={`w-full ${mode === "in" && passkeySupported() ? "!bg-card !text-ink !shadow-none" : ""}`} disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />} {mode === "in" ? "Accedi" : "Crea account"}
          </PrimaryButton>
        </form>
        {mode === "in" && (
          <button onClick={forgot} disabled={busy} className="mt-4 text-muted text-[14px] underline underline-offset-2">
            Password dimenticata?
          </button>
        )}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 text-gold text-[15px] font-medium">
          {mode === "in" ? "Prima volta? Crea il tuo account" : "Hai già un account? Accedi"}
        </button>
      </div>
    </div>
  );
}
