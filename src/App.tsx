import { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Compass, Fingerprint, Dumbbell, Feather, GraduationCap, HeartPulse, Loader2, LogOut, Moon, Plus, Shirt, Sparkles, Sun, TrendingUp, User, Wallet } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Field, inputCls, PrimaryButton, Toast } from "./components/ui";
import { AppProvider, Tab, useApp } from "./lib/store";
import { useTheme } from "./lib/theme";
import { passkeyError, passkeySupported, signInPasskey } from "./lib/passkey";
import { BudgetScreen } from "./screens/Budget";
import { ProgressScreen } from "./screens/Progress";
import { supabase, useSignedUrl } from "./lib/supabase";
import { OutfitBuilder } from "./screens/OutfitBuilder";
import { Profile } from "./screens/Profile";
import { AddGarmentSheet, Wardrobe } from "./screens/Wardrobe";
import { Health } from "./screens/Health";
import { StyleScreen } from "./screens/Style";
import { AcademyScreen } from "./screens/Academy";
import { PathScreen } from "./screens/Path";
import { FitnessScreen } from "./screens/Fitness";
import { LanguageScreen } from "./screens/Language";
import { Questionnaire } from "./gentleman/Questionnaire";

export { useTheme } from "./lib/theme";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

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
  percorso: { id: "percorso", label: "Il mio percorso", short: "Oggi", icon: I(Compass) },
  linguaggio: { id: "linguaggio", label: "Linguaggio", icon: I(Feather) },
  armadio: { id: "armadio", label: "Armadio", icon: (p) => <Hanger size={p.size ?? 18} className={p.className} /> },
  outfit: { id: "outfit", label: "Outfit", icon: I(Shirt) },
  stile: { id: "stile", label: "Ispirazioni", icon: I(Sparkles) },
  budget: { id: "budget", label: "Budget e acquisti", short: "Budget", icon: I(Wallet) },
  progressi: { id: "progressi", label: "Progressi", icon: I(TrendingUp) },
  accademia: { id: "accademia", label: "Accademia", short: "Impara", icon: I(GraduationCap) },
  salute: { id: "salute", label: "Salute", icon: I(HeartPulse) },
  fisico: { id: "fisico", label: "Fisico", icon: I(Dumbbell) },
  profilo: { id: "profilo", label: "Profilo", icon: I(User) },
};
/** Gruppi del menu, come i riquadri di Navy OS. */
const GROUPS: { id: string; label: string; short: string; icon: NavItem["icon"]; items: Tab[] }[] = [
  { id: "oggi", label: "Percorso", short: "Oggi", icon: I(Compass), items: ["percorso", "progressi"] },
  { id: "impara", label: "Accademia", short: "Impara", icon: I(GraduationCap), items: ["accademia", "linguaggio"] },
  { id: "stile", label: "Stile", short: "Stile", icon: (p) => <Hanger size={p.size ?? 18} className={p.className} />, items: ["armadio", "outfit", "stile", "budget"] },
  { id: "corpo", label: "Corpo", short: "Corpo", icon: I(Dumbbell), items: ["fisico", "salute"] },
  { id: "tu", label: "Tu", short: "Tu", icon: I(User), items: ["profilo"] },
];
const groupOf = (t: Tab) => GROUPS.find((g) => g.items.includes(t)) || GROUPS[0];

/** Sotto-sezioni dell'area corrente, in alto sul telefono. */
function SubTabs() {
  const app = useApp();
  const g = groupOf(app.tab);
  if (g.items.length < 2) return null;
  return (
    <div className="lg:hidden px-5 mb-3 -mt-0.5 flex gap-1.5 overflow-x-auto no-scrollbar">
      {g.items.map((id) => {
        const on = app.tab === id;
        return (
          <button key={id} onClick={() => app.setTab(id)} className={`h-9 px-4 rounded-full text-[13.5px] font-semibold shrink-0 transition ${on ? "bg-brand text-brand-fg" : "bg-card text-muted"}`}>
            {ITEMS[id].short && id !== "percorso" ? ITEMS[id].short : id === "percorso" ? "Oggi" : ITEMS[id].label}
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
    <div className="mt-3 rounded-[16px] border border-line bg-surface/50 p-1.5">
      <button onClick={cambia} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted hover:text-ink">
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

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const app = useApp();
  const { theme, toggle } = useTheme();
  const photo = useSignedUrl("avatars", app.profile?.avatar_photo_path);
  const go = (t: Tab) => {
    app.setTab(t);
    onNav?.();
  };
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-3">
        <Wordmark />
      </div>
      <button
        onClick={() => {
          app.setAddOpen(true);
          onNav?.();
        }}
        className="mx-3 mb-1 flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-semibold text-brand-fg shadow-pill active:scale-[.98] transition"
      >
        <Plus size={17} /> Aggiungi capo
      </button>
      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Navigazione principale">
        {GROUPS.map((g) => (
          <NavGroup key={g.label} label={g.label}>
            {g.items.map((id) => {
              const it = ITEMS[id];
              const on = app.tab === id;
              return (
                <button
                  key={id}
                  onClick={() => go(id)}
                  className={`relative flex min-h-11 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-[14.5px] transition-colors ${
                    on ? "bg-sidebar-active font-bold text-ink" : "text-muted hover:bg-sidebar-active/60 hover:text-ink"
                  }`}
                >
                  {on && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-gold" />}
                  <it.icon size={18} />
                  <span className="flex-1 text-left">{it.label}</span>
                  {it.soon && <span className="text-[10px] uppercase tracking-[0.1em] text-gold">Presto</span>}
                </button>
              );
            })}
          </NavGroup>
        ))}
      </nav>
      <div className="border-t border-line px-3 py-3 space-y-1">
        <button onClick={toggle} className="flex h-10 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] text-muted hover:bg-sidebar-active/60 hover:text-ink">
          {theme === "dark" ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          {theme === "dark" ? "Tema chiaro" : "Tema scuro"}
        </button>
        <div className="flex items-center gap-2.5 rounded-[12px] border border-line bg-surface p-1.5">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-card grid place-items-center text-[13px] font-semibold">
            {photo ? <img src={photo} className="h-full w-full object-cover object-top" /> : (app.profile?.nome || "?").slice(0, 1).toUpperCase()}
          </div>
          <button onClick={() => go("profilo")} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-semibold">{app.profile?.nome}</div>
            <div className="truncate text-[11px] text-muted">{app.email}</div>
          </button>
          <button onClick={() => supabase.auth.signOut()} className="h-8 w-8 grid place-items-center text-muted hover:text-ink" aria-label="Esci">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const app = useApp();
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
    } else if (vai && ["percorso", "linguaggio", "budget", "accademia", "fisico", "progressi", "armadio"].includes(vai)) app.setTab(vai as Tab);
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
        <SidebarBody />
      </aside>

      {/* Intestazione su telefono */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <button onClick={() => app.setTab("percorso")} aria-label="Home">
          <Wordmark sub={false} />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => app.setAddOpen(true)} className="h-9 w-9 grid place-items-center rounded-full bg-brand text-brand-fg shadow-pill" aria-label="Aggiungi capo">
            <Plus size={19} />
          </button>
          <button onClick={() => app.setTab("profilo")} className="h-9 w-9 grid place-items-center text-ink" aria-label="Profilo">
            <User size={20} strokeWidth={1.8} />
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
          <SubTabs />
          {app.tab === "budget" && <BudgetScreen />}
          {app.tab === "progressi" && <ProgressScreen />}
          {app.tab === "percorso" && <PathScreen />}
          {app.tab === "linguaggio" && <LanguageScreen />}
          {app.tab === "armadio" && <Wardrobe />}
          {app.tab === "outfit" && <OutfitBuilder />}
          {app.tab === "profilo" && <Profile />}
          {app.tab === "stile" && <StyleScreen />}
          {app.tab === "accademia" && <AcademyScreen />}
          {app.tab === "salute" && <Health />}
          {app.tab === "fisico" && <FitnessScreen />}
        </div>
      </main>
      {app.tab !== "armadio" && <AddGarmentSheet open={app.addOpen} onClose={() => app.setAddOpen(false)} />}

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
              </span>
              <span className="relative">{g.short}</span>
            </button>
          );
        })}
      </nav>

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

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pkBusy, setPkBusy] = useState(false);
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
          <PrimaryButton type="submit" className={`w-full ${mode === "in" && passkeySupported() ? "!bg-card !text-ink !shadow-none" : ""}`} disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />} {mode === "in" ? "Accedi" : "Crea account"}
          </PrimaryButton>
        </form>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 text-gold text-[15px] font-medium">
          {mode === "in" ? "Prima volta? Crea il tuo account" : "Hai già un account? Accedi"}
        </button>
      </div>
    </div>
  );
}
