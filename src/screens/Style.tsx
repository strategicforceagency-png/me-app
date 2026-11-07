import { motion } from "framer-motion";
import { AtSign, Check, Download, Film, Heart, ImagePlus, Instagram, Link2, Loader2, Plus, RefreshCw, Search, Shirt, Sparkles, Trash2, Unlink, Wand2, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, inputCls, PrimaryButton, Sheet } from "../components/ui";
import { useApp } from "../lib/store";
import { ai, fn, supabase, uploadBlob, uploadImage, useSignedUrl, videoFrames } from "../lib/supabase";
import { WebSearchSheet } from "./Wardrobe";

/* ---------------- tipi ---------------- */
type Analysis = {
  riassunto: string;
  stili: { nome: string; descrizione: string; peso: number }[];
  palette: { nome: string; hex: string }[];
  capi_chiave: { nome: string; categoria: string; colore: string; perche: string }[];
  formule: { nome: string; pezzi: string[]; occasione: string }[];
  look: { immagine: number; titolo: string; pezzi: string[]; stile: string; occasione: string }[];
  brand: string[];
  vestibilita: string;
  dettagli: string[];
};
type Inspiration = {
  id: string;
  kind: "instagram" | "foto" | "link";
  handle: string | null;
  title: string | null;
  image_paths: string[];
  analysis: Analysis | null;
  status: "nuovo" | "analisi" | "pronto" | "errore";
  error: string | null;
  created_at: string;
};
type PickKind = "look" | "stile" | "palette" | "capo" | "formula";
type Pick = { id: string; inspiration_id: string | null; kind: PickKind; key: string; value: unknown };
export type Guide = {
  nome_stile: string;
  manifesto: string;
  parole_chiave: string[];
  palette: { nome: string; hex: string }[];
  capi_essenziali: { nome: string; categoria: string; colore: string; ce_l_hai: boolean; capo_id: string | null; ricerca: string }[];
  formule: { nome: string; pezzi: string[]; occasione: string; con_i_tuoi_capi: string[] }[];
  regole: { si: string[]; no: string[] };
  prossimi_acquisti: { nome: string; perche: string; priorita: "alta" | "media" | "bassa"; ricerca: string; budget: string }[];
  generato_il?: string;
};

const pickId = (insp: string | null, kind: string, key: string) => `${insp}|${kind}|${key}`;

/* ---------------- schermata ---------------- */
export function StyleScreen() {
  const app = useApp();
  const [insps, setInsps] = useState<Inspiration[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [shop, setShop] = useState<string | null>(null);
  const guide = (app.profile?.style_guide as Guide | null) ?? null;

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([
      supabase.from("inspirations").select("*").order("created_at", { ascending: false }),
      supabase.from("style_picks").select("*"),
    ]);
    if (i.error) app.toast("Ispirazioni non disponibili: " + i.error.message);
    setInsps((i.data as Inspiration[]) || []);
    setPicks((p.data as Pick[]) || []);
    setLoading(false);
  }, [app]);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // aggiorna da solo mentre un'analisi è in corso
  useEffect(() => {
    if (!insps.some((i) => i.status === "analisi")) return;
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [insps, load]);

  const picked = useMemo(() => new Set(picks.map((p) => pickId(p.inspiration_id, p.kind, p.key))), [picks]);
  const togglePick = async (insp: string, kind: PickKind, key: string, value: unknown) => {
    const id = pickId(insp, kind, key);
    if (picked.has(id)) {
      setPicks((ps) => ps.filter((p) => pickId(p.inspiration_id, p.kind, p.key) !== id));
      await supabase.from("style_picks").delete().match({ inspiration_id: insp, kind, key });
    } else {
      setPicks((ps) => [...ps, { id, inspiration_id: insp, kind, key, value }]);
      navigator.vibrate?.(8);
      await supabase.from("style_picks").upsert({ user_id: app.uid, inspiration_id: insp, kind, key, value }, { onConflict: "user_id,inspiration_id,kind,key" });
    }
  };

  const build = async () => {
    setBuilding(true);
    try {
      await ai({ action: "style_guide" });
      await app.reload();
      app.toast("La tua guida di stile è pronta");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBuilding(false);
  };

  const open = insps.find((i) => i.id === openId) || null;

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Il tuo stile</h1>
          <p className="text-muted text-[14px] mt-2">Raccogli ispirazioni, scegli ciò che ti rappresenta, il tuo personal shopper fa il resto.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="h-11 w-11 max-lg:hidden grid place-items-center rounded-full bg-brand text-brand-fg shadow-pill shrink-0" aria-label="Aggiungi ispirazione">
          <Plus size={22} />
        </button>
      </header>

      {/* Guida */}
      <section className="mt-6">
        {guide ? (
          <GuideView guide={guide} onShop={setShop} onRebuild={build} building={building} picks={picks.length} />
        ) : (
          <div className="rounded-[22px] bg-hero text-herofg p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl" />
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Personal shopper</div>
            <div className="font-display text-[28px] font-semibold leading-tight mt-2">Costruisci il tuo stile</div>
            <ol className="mt-3 space-y-1.5 text-[14px] opacity-80">
              <li>1. Aggiungi profili Instagram o foto che ti ispirano</li>
              <li>2. Tocca il cuore su look, colori, capi e formule che senti tuoi</li>
              <li>3. Crea la tua guida: stile, palette, outfit e cosa comprare</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setAddOpen(true)} className="h-11 px-5 rounded-full bg-gold text-ongold font-semibold flex items-center gap-2">
                <Plus size={17} /> Aggiungi ispirazione
              </button>
              {picks.length > 0 && (
                <button onClick={build} disabled={building} className="h-11 px-5 rounded-full border border-gold/50 text-gold font-semibold flex items-center gap-2">
                  {building ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />} Crea la mia guida ({picks.length})
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Ispirazioni */}
      <section className="mt-9">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Ispirazioni
          </h2>
          <span className="text-[12px] text-muted">
            <Heart size={12} className="inline -mt-0.5 text-gold fill-gold" /> {picks.length} elementi scelti
          </span>
        </div>
        {loading ? (
          <div className="py-16 grid place-items-center text-muted">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <button onClick={() => setAddOpen(true)} className="aspect-[4/5] rounded-[20px] border-2 border-dashed border-line grid place-items-center text-muted hover:border-gold hover:text-gold transition">
              <div className="flex flex-col items-center gap-2">
                <Instagram size={26} strokeWidth={1.5} />
                <span className="text-[13px] font-medium">Aggiungi</span>
              </div>
            </button>
            {insps.map((i) => (
              <InspirationCard key={i.id} i={i} count={picks.filter((p) => p.inspiration_id === i.id).length} onOpen={() => setOpenId(i.id)} />
            ))}
          </div>
        )}
      </section>

      {picks.length > 0 && guide && (
        <div className="mt-6 flex justify-center">
          <button onClick={build} disabled={building} className="h-11 px-5 rounded-full bg-card text-[14px] font-semibold flex items-center gap-2">
            {building ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Aggiorna la guida con le nuove scelte
          </button>
        </div>
      )}

      <AddInspirationSheet open={addOpen} onClose={() => setAddOpen(false)} onCreated={(id) => { load(); setOpenId(id); }} reload={load} />
      <InspirationSheet insp={open} onClose={() => setOpenId(null)} picked={picked} toggle={togglePick} onDeleted={() => { setOpenId(null); load(); }} onRetry={load} />
      <WebSearchSheet open={!!shop} initialQuery={shop ?? undefined} title="Personal shopper" onClose={() => setShop(null)} onDone={() => setShop(null)} />
    </div>
  );
}

/* ---------------- guida ---------------- */
function GuideView({ guide, onShop, onRebuild, building, picks }: { guide: Guide; onShop: (q: string) => void; onRebuild: () => void; building: boolean; picks: number }) {
  const app = useApp();
  const byId = new Map(app.garments.map((g) => [g.id, g]));
  return (
    <div className="space-y-3">
      <div className="rounded-[22px] bg-hero text-herofg p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Il tuo stile</div>
          <div className="font-display text-[34px] lg:text-[42px] font-semibold leading-[1.05] mt-1.5">{guide.nome_stile}</div>
          <p className="mt-3 text-[14.5px] leading-relaxed opacity-85 max-w-[640px]">{guide.manifesto}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {guide.parole_chiave.map((k) => (
              <span key={k} className="px-2.5 py-1 rounded-full border border-gold/40 text-gold text-[12px]">
                {k}
              </span>
            ))}
          </div>
          {guide.palette.length > 0 && (
            <div className="mt-5 flex gap-2 flex-wrap">
              {guide.palette.map((c) => (
                <div key={c.hex + c.nome} className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 rounded-full ring-1 ring-white/15" style={{ background: c.hex }} />
                  <span className="text-[10px] opacity-70 max-w-[56px] text-center leading-tight">{c.nome}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Da comprare" icon={<Sparkles size={14} />}>
          <div className="divide-y divide-line">
            {guide.prossimi_acquisti.map((a) => (
              <div key={a.nome} className="py-3 flex items-start gap-3">
                <span
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.priorita === "alta" ? "bg-gold" : a.priorita === "media" ? "bg-gold/50" : "bg-line"}`}
                  title={`Priorità ${a.priorita}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-semibold">{a.nome}</div>
                  <div className="text-[12.5px] text-muted mt-0.5">{a.perche}</div>
                  {a.budget && <div className="text-[11.5px] text-gold mt-1">{a.budget}</div>}
                </div>
                <button onClick={() => onShop(a.ricerca || a.nome)} className="h-9 px-3 rounded-full bg-brand text-brand-fg text-[12.5px] font-semibold flex items-center gap-1.5 shrink-0">
                  <Search size={14} /> Cerca
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Capi essenziali" icon={<Shirt size={14} />}>
          <div className="flex flex-wrap gap-2">
            {guide.capi_essenziali.map((c) => {
              const mine = c.capo_id ? byId.get(c.capo_id) : null;
              return (
                <button
                  key={c.nome}
                  onClick={() => !c.ce_l_hai && onShop(c.ricerca || c.nome)}
                  className={`px-3 py-1.5 rounded-full text-[13px] border flex items-center gap-1.5 ${c.ce_l_hai ? "border-gold/40 bg-gold-tint" : "border-line bg-surface"}`}
                  title={mine ? `Ce l'hai: ${mine.nome}` : "Da cercare"}
                >
                  {c.ce_l_hai ? <Check size={13} className="text-gold" /> : <Plus size={13} className="text-muted" />}
                  {c.nome}
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-muted mt-3">
            <Check size={11} className="inline text-gold" /> già nel tuo armadio · <Plus size={11} className="inline" /> tocca per cercarlo
          </p>
        </Card>

        <Card title="Formule outfit" icon={<Wand2 size={14} />}>
          <div className="space-y-3">
            {guide.formule.map((f) => (
              <div key={f.nome}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[14.5px] font-semibold">{f.nome}</div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-gold">{f.occasione}</div>
                </div>
                <div className="text-[13px] text-muted mt-0.5">{f.pezzi.join(" · ")}</div>
                {f.con_i_tuoi_capi?.length > 0 && <div className="text-[12px] mt-1">Con i tuoi: {f.con_i_tuoi_capi.join(", ")}</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Regole" icon={<Check size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ul className="space-y-1.5 text-[13.5px]">
              {guide.regole.si.map((r) => (
                <li key={r} className="flex gap-2">
                  <Check size={15} className="text-gold shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
            <ul className="space-y-1.5 text-[13.5px] text-muted">
              {guide.regole.no.map((r) => (
                <li key={r} className="flex gap-2">
                  <X size={15} className="shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
      <div className="flex items-center justify-between text-[11.5px] text-muted px-1">
        <span>{guide.generato_il ? `Creata il ${new Date(guide.generato_il).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}` : ""}</span>
        <button onClick={onRebuild} disabled={building || !picks} className="flex items-center gap-1 text-gold font-medium">
          {building ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Rigenera
        </button>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[20px] bg-surface shadow-soft p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2 mb-3">
        <span className="text-gold">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ---------------- card ispirazione ---------------- */
function Thumb({ path, className = "" }: { path?: string; className?: string }) {
  const url = useSignedUrl("inspirations", path);
  return url ? <img src={url} className={`object-cover ${className}`} draggable={false} /> : <div className={`shimmer ${className}`} />;
}

function InspirationCard({ i, count, onOpen }: { i: Inspiration; count: number; onOpen: () => void }) {
  const p = i.image_paths;
  return (
    <motion.button layout onClick={onOpen} className="text-left rounded-[20px] bg-surface shadow-soft p-2 active:scale-[.98] transition">
      <div className="relative aspect-[4/5] rounded-[14px] overflow-hidden bg-card grid grid-cols-2 grid-rows-2 gap-0.5">
        {p.length === 1 ? <Thumb path={p[0]} className="col-span-2 row-span-2 w-full h-full" /> : p.slice(0, 4).map((x) => <Thumb key={x} path={x} className="w-full h-full" />)}
        {i.status === "analisi" && (
          <div className="absolute inset-0 bg-ink/45 grid place-items-center">
            <div className="flex flex-col items-center gap-1.5 text-white">
              <Sparkles className="animate-pulse" size={20} />
              <span className="text-[11.5px] font-medium">Analizzo lo stile…</span>
            </div>
          </div>
        )}
        {count > 0 && (
          <div className="absolute top-2 right-2 h-6 min-w-6 px-1.5 rounded-full bg-gold text-ongold text-[11px] font-bold grid place-items-center">
            {count}
          </div>
        )}
      </div>
      <div className="pt-2 px-1">
        <div className="text-[14px] font-semibold truncate">{i.handle ? `@${i.handle}` : i.title || "Ispirazione"}</div>
        <div className="text-[12px] text-muted truncate">
          {i.status === "pronto"
            ? i.analysis?.stili?.slice(0, 2).map((s) => s.nome).join(" · ") || "Analizzata"
            : i.status === "errore"
              ? "Analisi non riuscita"
              : i.status === "analisi"
                ? "In analisi"
                : `${p.length} immagini`}
        </div>
      </div>
    </motion.button>
  );
}

/* ---------------- aggiungi ispirazione ---------------- */
function AddInspirationSheet({ open, onClose, onCreated, reload }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; reload: () => void }) {
  const app = useApp();
  const [mode, setMode] = useState<"instagram" | "link" | "foto">("instagram");
  const [handle, setHandle] = useState("");
  const [links, setLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [ig, setIg] = useState<{ connected: boolean; username: string | null } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    supabase.rpc("instagram_status").then(({ data }) => setIg((data as { connected: boolean; username: string | null }) || null));
  }, [open]);

  const reset = () => {
    setHandle("");
    setLinks("");
    setFiles([]);
    setBusy("");
  };
  const cleanHandle = handle.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  const urls = links.split(/\s+/).filter((l) => /instagram\.com\/(?:[^/]+\/)?(p|reel|tv)\//.test(l));
  const canGo = mode === "link" ? urls.length > 0 : files.length > 0;

  const analyze = (id: string, user: string | null) => {
    // analisi in background: la card mostra lo stato
    ai({ action: "inspire", id })
      .then(() => app.toast(`Stile ${user ? "di @" + user : ""} analizzato`))
      .catch((e) => app.toast((e as Error).message))
      .finally(reload);
  };

  const connectIg = async () => {
    setBusy("Apro Instagram…");
    try {
      const r = await fn<{ url: string }>("instagram", "start");
      window.location.href = r.url;
    } catch (e) {
      app.toast((e as Error).message);
      setBusy("");
    }
  };
  const disconnectIg = async () => {
    await fn("instagram", "disconnect").catch(() => {});
    setIg({ connected: false, username: null });
    app.toast("Instagram scollegato");
  };
  const autoImport = async () => {
    if (!cleanHandle) return;
    setBusy(`Importo i post di @${cleanHandle}…`);
    try {
      const r = await fn<{ id: string; username: string; images: number }>("instagram", "discover", { username: cleanHandle, limit: 12 });
      app.toast(`${r.images} post importati da @${r.username}`);
      analyze(r.id, r.username);
      reset();
      onClose();
      onCreated(r.id);
    } catch (e) {
      app.toast((e as Error).message);
      setBusy("");
    }
  };

  const create = async () => {
    try {
      const paths: string[] = [];
      let user: string | null = cleanHandle || null;
      if (mode === "link") {
        for (let k = 0; k < urls.length; k++) {
          setBusy(`Scarico i post ${k + 1}/${urls.length}…`);
          try {
            const r = await ai<{ path: string; username: string | null }>({ action: "ig_post", url: urls[k] });
            paths.push(r.path);
            user ||= r.username;
          } catch (e) {
            app.toast((e as Error).message);
          }
        }
      }
      for (let k = 0; k < files.length; k++) {
        const f = files[k];
        if (f.type.startsWith("video/")) {
          setBusy(`Estraggo i fotogrammi dal video ${k + 1}/${files.length}…`);
          const frames = await videoFrames(f, 10);
          for (const fr of frames) paths.push(await uploadBlob("inspirations", app.uid, fr, "frame"));
        } else {
          setBusy(`Carico le immagini ${k + 1}/${files.length}…`);
          paths.push(await uploadImage("inspirations", app.uid, f, "shot"));
        }
      }
      if (!paths.length) throw new Error("Nessuna immagine caricata");
      setBusy("Creo l'ispirazione…");
      const { data, error } = await supabase
        .from("inspirations")
        .insert({ user_id: app.uid, kind: mode, handle: user, title: user ? null : "Ispirazione", image_paths: paths, status: "analisi" })
        .select()
        .single();
      if (error) throw error;
      analyze(data.id, user);
      reset();
      onClose();
      onCreated(data.id);
    } catch (e) {
      app.toast((e as Error).message);
      setBusy("");
    }
  };

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} eyebrow="Personal shopper" title="Nuova ispirazione">
      <div className="p-1 rounded-full bg-card grid grid-cols-3 gap-1">
        {([["instagram", "Profilo IG"], ["link", "Link post"], ["foto", "Foto"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`h-9 rounded-full text-[13px] font-semibold transition ${mode === k ? "bg-surface shadow-soft" : "text-muted"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {mode === "instagram" && (
          <>
            <Field label="Profilo Instagram">
              <div className="relative">
                <AtSign size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input className={`${inputCls} pl-11`} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="nomeprofilo" autoCapitalize="none" autoCorrect="off" />
              </div>
            </Field>
            {ig?.connected ? (
              <>
                <PrimaryButton className="w-full" disabled={!cleanHandle || !!busy} onClick={autoImport}>
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} {busy || (cleanHandle ? `Importa i post di @${cleanHandle}` : "Scrivi il nome del profilo")}
                </PrimaryButton>
                <div className="flex items-center justify-between text-[12px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Check size={13} className="text-gold" /> Instagram collegato{ig.username ? ` come @${ig.username}` : ""} · funziona con profili Creator/Business
                  </span>
                  <button onClick={disconnectIg} className="flex items-center gap-1 hover:text-ink">
                    <Unlink size={12} /> Scollega
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-muted pt-1">
                  <span className="h-px flex-1 bg-line" /> oppure screenshot / video <span className="h-px flex-1 bg-line" />
                </div>
              </>
            ) : (
              <div className="rounded-[16px] border border-gold/40 bg-gold-tint p-4">
                <div className="text-[14px] font-semibold flex items-center gap-2">
                  <Instagram size={16} className="text-gold" /> Importa in automatico
                </div>
                <p className="text-[12.5px] text-muted mt-1">Collega il tuo Instagram (account professionale) e importo da solo gli ultimi post di qualsiasi profilo Creator o Business.</p>
                <button onClick={connectIg} disabled={!!busy} className="mt-3 h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold flex items-center gap-2">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Collega Instagram
                </button>
              </div>
            )}
            {cleanHandle && (
              <a href={`https://www.instagram.com/${cleanHandle}/`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gold text-[14px] font-medium">
                <Instagram size={16} /> Apri @{cleanHandle} su Instagram
              </a>
            )}
            <div className="rounded-[16px] bg-card p-4 text-[13px] leading-relaxed">
              <b>Senza collegamento:</b> fai <b>3-8 screenshot</b> della griglia o dei post, oppure una <b>registrazione schermo</b> mentre scorri il profilo (15-30 secondi), e caricali qui sotto.
            </div>
          </>
        )}
        {mode === "link" && (
          <>
            <Field label="Link dei post (uno per riga)">
              <textarea
                className={`${inputCls} h-32 py-3 resize-none`}
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                placeholder={"https://www.instagram.com/p/…\nhttps://www.instagram.com/p/…"}
                autoCapitalize="none"
              />
            </Field>
            <p className="text-[12.5px] text-muted">
              Su Instagram: <b>⋯</b> sul post → <b>Copia link</b>. Funziona con i post pubblici. {urls.length > 0 && <span className="text-gold font-medium">{urls.length} link validi</span>}
            </p>
          </>
        )}

        {mode !== "link" && (
          <div>
            <div className="text-[13px] text-muted mb-2">{mode === "instagram" ? "Screenshot o registrazione schermo del profilo" : "Foto o video (Reel salvati) di outfit che ti piacciono"}</div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => ref.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-line grid place-items-center text-muted">
                <ImagePlus />
              </button>
              {files.map((f, k) => (
                <div key={k} className="relative aspect-square rounded-2xl overflow-hidden bg-card">
                  {f.type.startsWith("video/") ? (
                    <div className="w-full h-full grid place-items-center bg-ink text-gold">
                      <div className="flex flex-col items-center gap-1">
                        <Film size={20} />
                        <span className="text-[10px] text-bg/70">Video</span>
                      </div>
                    </div>
                  ) : (
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => setFiles((x) => x.filter((_, j) => j !== k))} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/55 text-white grid place-items-center">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <input ref={ref} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && setFiles((x) => [...x, ...Array.from(e.target.files!)].slice(0, 14))} />
          </div>
        )}

        {(mode !== "instagram" || !ig?.connected || files.length > 0) && <PrimaryButton className="w-full" disabled={!canGo || !!busy} onClick={create}>
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" /> {busy}
            </>
          ) : (
            <>
              <Sparkles size={17} /> Analizza lo stile
            </>
          )}
        </PrimaryButton>}
      </div>
      <div className="h-4" />
    </Sheet>
  );
}

/* ---------------- dettaglio ispirazione ---------------- */
function HeartBtn({ on, onClick, className = "" }: { on: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-8 w-8 rounded-full grid place-items-center transition ${on ? "bg-gold text-ongold" : "bg-surface/90 text-muted border border-line"} ${className}`}
      aria-label={on ? "Rimuovi dal mio stile" : "Aggiungi al mio stile"}
    >
      <Heart size={15} className={on ? "fill-current" : ""} />
    </button>
  );
}

function InspirationSheet({
  insp,
  onClose,
  picked,
  toggle,
  onDeleted,
  onRetry,
}: {
  insp: Inspiration | null;
  onClose: () => void;
  picked: Set<string>;
  toggle: (insp: string, kind: PickKind, key: string, value: unknown) => void;
  onDeleted: () => void;
  onRetry: () => void;
}) {
  const app = useApp();
  const a = insp?.analysis;
  const is = (kind: PickKind, key: string) => (insp ? picked.has(pickId(insp.id, kind, key)) : false);
  const t = (kind: PickKind, key: string, value: unknown) => insp && toggle(insp.id, kind, key, value);
  const [retrying, setRetrying] = useState(false);

  const del = async () => {
    if (!insp) return;
    await supabase.from("inspirations").delete().eq("id", insp.id);
    if (insp.image_paths.length) await supabase.storage.from("inspirations").remove(insp.image_paths);
    app.toast("Ispirazione eliminata");
    onDeleted();
  };
  const retry = async () => {
    if (!insp) return;
    setRetrying(true);
    try {
      await ai({ action: "inspire", id: insp.id });
    } catch (e) {
      app.toast((e as Error).message);
    }
    setRetrying(false);
    onRetry();
  };

  return (
    <Sheet open={!!insp} onClose={onClose} eyebrow={insp?.kind === "instagram" || insp?.kind === "link" ? "Instagram" : "Ispirazione"} title={insp?.handle ? `@${insp.handle}` : insp?.title || "Ispirazione"} full>
      {insp && (
        <div className="space-y-6 pb-6">
          {insp.status === "analisi" && (
            <div className="rounded-[16px] bg-gold-tint p-4 flex items-center gap-3 text-[14px]">
              <Sparkles className="text-gold animate-pulse shrink-0" size={18} /> Sto analizzando outfit e stile: ci vogliono circa 20-40 secondi.
            </div>
          )}
          {insp.status === "errore" && (
            <div className="rounded-[16px] bg-danger-tint p-4 text-[14px] text-danger">
              {insp.error || "Analisi non riuscita"}
              <button onClick={retry} disabled={retrying} className="mt-2 flex items-center gap-1.5 font-semibold">
                {retrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Riprova
              </button>
            </div>
          )}

          {a && (
            <>
              <p className="text-[15px] leading-relaxed">{a.riassunto}</p>

              <Group title="Stili" hint="Tocca per aggiungerli al tuo stile">
                <div className="flex flex-wrap gap-2">
                  {a.stili.map((s) => (
                    <button
                      key={s.nome}
                      onClick={() => t("stile", s.nome, s)}
                      className={`px-3.5 py-2 rounded-[14px] text-left border transition ${is("stile", s.nome) ? "border-gold bg-gold-tint" : "border-line bg-surface"}`}
                    >
                      <div className="text-[14px] font-semibold flex items-center gap-1.5">
                        {is("stile", s.nome) && <Heart size={13} className="text-gold fill-gold" />}
                        {s.nome} <span className="text-[11px] text-muted font-normal">{s.peso}%</span>
                      </div>
                      <div className="text-[12px] text-muted max-w-[260px]">{s.descrizione}</div>
                    </button>
                  ))}
                </div>
              </Group>

              <Group title="Palette">
                <div className="flex flex-wrap gap-3">
                  {a.palette.map((c) => (
                    <button key={c.hex + c.nome} onClick={() => t("palette", c.hex, c)} className="flex flex-col items-center gap-1">
                      <div className={`h-12 w-12 rounded-full transition ${is("palette", c.hex) ? "ring-[3px] ring-gold ring-offset-2 ring-offset-surface" : "ring-1 ring-line"}`} style={{ background: c.hex }} />
                      <span className="text-[11px] text-muted max-w-[60px] text-center leading-tight">{c.nome}</span>
                    </button>
                  ))}
                </div>
              </Group>

              {a.look.length > 0 && (
                <Group title="Look">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {a.look.map((l) => {
                      const key = `img-${l.immagine}`;
                      return (
                        <div key={key} className={`rounded-[16px] overflow-hidden border transition ${is("look", key) ? "border-gold" : "border-line"} bg-surface`}>
                          <div className="relative aspect-[4/5] bg-card">
                            <Thumb path={insp.image_paths[l.immagine]} className="w-full h-full" />
                            <HeartBtn on={is("look", key)} onClick={() => t("look", key, l)} className="absolute top-2 right-2" />
                          </div>
                          <div className="p-2.5">
                            <div className="text-[13px] font-semibold leading-tight">{l.titolo}</div>
                            <div className="text-[11.5px] text-muted mt-1 line-clamp-3">{l.pezzi.join(" · ")}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Group>
              )}

              <Group title="Capi chiave">
                <div className="divide-y divide-line rounded-[16px] border border-line bg-surface">
                  {a.capi_chiave.map((c) => (
                    <div key={c.nome} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold">{c.nome}</div>
                        <div className="text-[12px] text-muted">{c.perche}</div>
                      </div>
                      <HeartBtn on={is("capo", c.nome)} onClick={() => t("capo", c.nome, c)} />
                    </div>
                  ))}
                </div>
              </Group>

              <Group title="Formule outfit">
                <div className="grid gap-2 sm:grid-cols-2">
                  {a.formule.map((f) => (
                    <div key={f.nome} className={`rounded-[16px] border p-3.5 flex gap-3 ${is("formula", f.nome) ? "border-gold bg-gold-tint" : "border-line bg-surface"}`}>
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold">{f.nome}</div>
                        <div className="text-[12.5px] text-muted mt-0.5">{f.pezzi.join(" + ")}</div>
                        <div className="text-[11px] uppercase tracking-[0.1em] text-gold mt-1">{f.occasione}</div>
                      </div>
                      <HeartBtn on={is("formula", f.nome)} onClick={() => t("formula", f.nome, f)} />
                    </div>
                  ))}
                </div>
              </Group>

              {(a.vestibilita || a.dettagli.length > 0 || a.brand.length > 0) && (
                <Group title="Dettagli">
                  <div className="space-y-2 text-[13.5px]">
                    {a.vestibilita && (
                      <p>
                        <span className="text-muted">Vestibilità:</span> {a.vestibilita}
                      </p>
                    )}
                    {a.dettagli.length > 0 && <p className="text-muted">{a.dettagli.join(" · ")}</p>}
                    {a.brand.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {a.brand.map((b) => (
                          <span key={b} className="px-2.5 py-1 rounded-full bg-card text-[12px]">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Group>
              )}
            </>
          )}

          {!a && insp.image_paths.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {insp.image_paths.map((p) => (
                <Thumb key={p} path={p} className="aspect-[4/5] w-full rounded-[12px]" />
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {a && (
              <button onClick={retry} disabled={retrying} className="flex-1 h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2">
                {retrying ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Rianalizza
              </button>
            )}
            <button onClick={del} className="flex-1 h-11 rounded-full bg-danger-tint text-danger text-[14px] font-medium flex items-center justify-center gap-2">
              <Trash2 size={15} /> Elimina
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          {title}
        </h3>
        {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

