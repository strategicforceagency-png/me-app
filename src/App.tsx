import { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Dumbbell, HeartPulse, Loader2, Shirt, User } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Field, inputCls, PrimaryButton, Toast } from "./components/ui";
import { AppProvider, Tab, useApp } from "./lib/store";
import { supabase } from "./lib/supabase";
import { OutfitBuilder } from "./screens/OutfitBuilder";
import { Profile } from "./screens/Profile";
import { AddGarmentSheet, Wardrobe } from "./screens/Wardrobe";

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

function Hanger({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7a2 2 0 1 1 2-2" />
      <path d="M12 7v1.2L3.2 15.1A1.5 1.5 0 0 0 4.1 18h15.8a1.5 1.5 0 0 0 .9-2.9L12 8.2" />
    </svg>
  );
}

const TABS: { id: Tab; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: "armadio", label: "Armadio", icon: Hanger },
  { id: "outfit", label: "Outfit", icon: (p) => <Shirt {...p} strokeWidth={1.8} /> },
  { id: "salute", label: "Salute", icon: (p) => <HeartPulse {...p} strokeWidth={1.8} /> },
  { id: "fisico", label: "Fisico", icon: (p) => <Dumbbell {...p} strokeWidth={1.8} /> },
  { id: "profilo", label: "Profilo", icon: (p) => <User {...p} strokeWidth={1.8} /> },
];

function Shell() {
  const app = useApp();
  return (
    <div className="mx-auto max-w-[430px] min-h-[100dvh] relative bg-bg">
      <main>
        {app.tab === "armadio" && <Wardrobe />}
        {app.tab === "outfit" && <OutfitBuilder />}
        {app.tab === "profilo" && <Profile />}
        {(app.tab === "salute" || app.tab === "fisico") && <ComingSoon tab={app.tab} />}
      </main>
      {app.tab !== "armadio" && <AddGarmentSheet open={app.addOpen} onClose={() => app.setAddOpen(false)} />}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div className="pointer-events-auto mx-auto rounded-[26px] bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,.08)] border border-white flex justify-around px-2 py-1.5">
          {TABS.map((t) => {
            const on = app.tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => app.setTab(t.id)} className="relative flex-1 flex flex-col items-center gap-0.5 py-1.5">
                {on && <motion.div layoutId="tabbg" className="absolute inset-x-1 inset-y-0 rounded-[18px] bg-card" transition={{ type: "spring", damping: 30, stiffness: 380 }} />}
                <span className={`relative ${on ? "text-ink" : "text-muted"}`}>
                  <Icon size={22} />
                </span>
                <span className={`relative text-[10.5px] ${on ? "text-ink font-semibold" : "text-muted"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <Toast msg={app.toastMsg} />
    </div>
  );
}

function ComingSoon({ tab }: { tab: "salute" | "fisico" }) {
  const s =
    tab === "salute"
      ? { t: "Salute", d: "Piano pasti, lista della spesa, sonno, idratazione e routine beauty.", i: <HeartPulse size={40} /> }
      : { t: "Fisico", d: "Schede di allenamento, carichi, progressi, misure e foto confronto.", i: <Dumbbell size={40} /> };
  return (
    <div className="px-5 pt-[max(18px,env(safe-area-inset-top))]">
      <h1 className="pt-4 text-[30px] font-extrabold tracking-tight">{s.t}</h1>
      <div className="mt-20 flex flex-col items-center text-center px-8">
        <div className="h-24 w-24 rounded-[28px] bg-brand-soft text-brand grid place-items-center">{s.i}</div>
        <div className="mt-5 text-[13px] font-semibold uppercase tracking-wider text-brand">In arrivo</div>
        <p className="mt-2 text-muted">{s.d}</p>
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
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pw })
        : await supabase.auth.signUp({ email, password: pw, options: { data: { nome } } });
    if (r.error) setErr(r.error.message.includes("Invalid login") ? "Email o password errate" : r.error.message.includes("Database error") ? "Registrazioni chiuse: questa app è personale" : r.error.message);
    else if (mode === "up" && !r.data.session) {
      const s = await supabase.auth.signInWithPassword({ email, password: pw });
      if (s.error) setErr("Account creato: ora accedi.");
    }
    setBusy(false);
  };
  return (
    <div className="mx-auto max-w-[430px] min-h-[100dvh] px-6 flex flex-col justify-center">
      <div className="flex items-center gap-3">
        <img src="./icon.svg" alt="" className="h-14 w-14 rounded-[18px] shadow-pill" />
        <div>
          <div className="text-[24px] font-extrabold tracking-tight leading-none">Habitus</div>
          <div className="text-[13px] text-muted mt-1">Vesti, vivi, diventi.</div>
        </div>
      </div>
      <h1 className="mt-6 text-[32px] font-extrabold tracking-tight leading-tight">
        Il tuo stile,
        <br />
        la tua salute, il tuo fisico.
      </h1>
      <p className="mt-2 text-muted">{mode === "in" ? "Accedi per continuare" : "Crea il tuo account personale"}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "up" && (
          <Field label="Nome">
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
        )}
        <Field label="Email">
          <input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
        {err && <p className="text-[14px] text-red-600">{err}</p>}
        <PrimaryButton type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" />} {mode === "in" ? "Accedi" : "Crea account"}
        </PrimaryButton>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 text-brand text-[15px] font-medium">
        {mode === "in" ? "Prima volta? Crea il tuo account" : "Hai già un account? Accedi"}
      </button>
    </div>
  );
}
