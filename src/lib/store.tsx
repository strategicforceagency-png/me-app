import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Garment, Outfit, prefetchUrls, Profile, supabase } from "./supabase";

type Pending = { id: string; label: string; previewUrl?: string };

type Ctx = {
  uid: string;
  email: string;
  profile: Profile | null;
  garments: Garment[];
  outfits: Outfit[];
  pending: Pending[];
  loading: boolean;
  reload: () => Promise<void>;
  setProfile: (p: Partial<Profile>) => Promise<void>;
  addPending: (p: Pending) => void;
  removePending: (id: string) => void;
  toast: (m: string) => void;
  toastMsg: string | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  addOpen: boolean;
  setAddOpen: (b: boolean) => void;
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  /** apre una lezione dell'Accademia da altre sezioni ("corso/lezione") */
  openLesson: (key: string) => void;
  lessonTarget: string | null;
  clearLessonTarget: () => void;
  /** apre una sessione di allenamento in Fisico */
  openSession: (giorno: string) => void;
  sessionTarget: string | null;
  clearSessionTarget: () => void;
  quizOpen: boolean;
  setQuizOpen: (b: boolean) => void;
};
export type Draft = { top: string[]; bottom: string | null; scarpe: string | null; preview?: string | null };
export type Tab = "percorso" | "armadio" | "outfit" | "stile" | "accademia" | "linguaggio" | "salute" | "fisico" | "profilo" | "budget" | "progressi" | "contenuti" | "persone" | "regali" | "uscite" | "lettere" | "fisionomia" | "profumi" | "pelletteria";

export const AppCtx = createContext<Ctx>(null as unknown as Ctx);
const C = AppCtx;
export const useApp = () => useContext(C);

export function AppProvider({ uid, email, children }: { uid: string; email: string; children: ReactNode }) {
  const [profile, setP] = useState<Profile | null>(null);
  const [garments, setG] = useState<Garment[]>([]);
  const [outfits, setO] = useState<Outfit[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToast] = useState<string | null>(null);
  // la sezione aperta sopravvive all'aggiornamento della pagina (non a una nuova apertura dell'app)
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      return (sessionStorage.getItem("habitus-tab") as Tab) || "percorso";
    } catch {
      return "percorso";
    }
  });
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    try {
      sessionStorage.setItem("habitus-tab", t);
    } catch {
      /* niente */
    }
  }, []);
  const [lessonTarget, setLessonTarget] = useState<string | null>(null);
  const [sessionTarget, setSessionTarget] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const t = useRef<number>();

  const reload = useCallback(async () => {
    const [p, g, o] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("garments").select("*").order("created_at", { ascending: false }),
      supabase.from("outfits").select("*, outfit_items(garment_id, slot, layer)").order("created_at", { ascending: false }),
    ]);
    // senza rete: si riparte dall'ultima copia salvata sul telefono
    const offline = p.error || g.error || o.error;
    if (offline) {
      try {
        const c = JSON.parse(localStorage.getItem(`habitus-cache-${uid}`) || "null");
        if (c) {
          setP(c.profile);
          setG(c.garments || []);
          setO(c.outfits || []);
          setLoading(false);
          return;
        }
      } catch {
        /* nessuna copia */
      }
    }
    const gs = (g.data as Garment[]) || [];
    await prefetchUrls(
      "garments",
      gs.map((x) => x.image_cutout_path || x.image_original_path || "").filter(Boolean),
    );
    if (p.data) setP(p.data as Profile);
    else {
      const { data } = await supabase.from("profiles").insert({ id: uid, nome: email.split("@")[0] }).select().single();
      setP(data as Profile);
    }
    setG(gs);
    setO((o.data as Outfit[]) || []);
    setLoading(false);
    try {
      localStorage.setItem(`habitus-cache-${uid}`, JSON.stringify({ profile: p.data, garments: gs, outfits: o.data || [] }));
    } catch {
      /* spazio esaurito: pazienza */
    }
  }, [uid, email]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setProfile = async (patch: Partial<Profile>) => {
    setP((p) => {
      const n = p ? { ...p, ...patch } : p;
      try {
        const c = JSON.parse(localStorage.getItem(`habitus-cache-${uid}`) || "null");
        if (c && n) localStorage.setItem(`habitus-cache-${uid}`, JSON.stringify({ ...c, profile: n }));
      } catch {
        /* */
      }
      return n;
    });
    await supabase.from("profiles").update(patch).eq("id", uid);
  };
  const toast = (m: string) => {
    setToast(m);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <C.Provider
      value={{
        uid,
        email,
        profile,
        garments,
        outfits,
        pending,
        loading,
        reload,
        setProfile,
        addPending: (p) => setPending((x) => [p, ...x]),
        removePending: (id) => setPending((x) => x.filter((y) => y.id !== id)),
        toast,
        toastMsg,
        tab,
        setTab,
        addOpen,
        setAddOpen,
        draft,
        setDraft,
        openLesson: (k) => {
          setLessonTarget(k);
          setTab("accademia");
        },
        lessonTarget,
        clearLessonTarget: () => setLessonTarget(null),
        openSession: (g) => {
          setSessionTarget(g);
          setTab("fisico");
        },
        sessionTarget,
        clearSessionTarget: () => setSessionTarget(null),
        quizOpen,
        setQuizOpen,
      }}
    >
      {children}
    </C.Provider>
  );
}
