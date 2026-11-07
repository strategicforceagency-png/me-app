import { AlertTriangle, BookMarked, Check, CheckCircle2, ChevronRight, CircleHelp, ExternalLink, FileVideo, Globe, Image as ImageIcon, Inbox, Instagram, Loader2, Paperclip, RefreshCw, Scale, Sparkles, Trash2, X, XCircle, Youtube } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "../components/ui";
import { CORSI } from "../academy/content";
import { useApp } from "../lib/store";
import { fn, supabase, uploadBlob, uploadImage, useSignedUrl, videoFrames } from "../lib/supabase";
import { illustrateContent, TutorialRow, TutorialView, useTutorials } from "./Tutorials";

/* ------------------------------------------------------------------ */
/* tipi                                                                */
/* ------------------------------------------------------------------ */
export type Content = {
  id: string;
  kind: "profilo" | "link" | "file";
  source: string | null;
  tipo: string | null;
  title: string | null;
  nota: string | null;
  status: "nuovo" | "raccolta" | "analisi" | "verifica" | "pronto" | "errore";
  media: { images?: string[]; videos?: { path: string }[]; youtube?: string; text?: string; captions?: string[] };
  analysis: { titolo?: string; riassunto?: string; temi?: string[]; insegnamenti?: unknown[]; stile?: unknown; fonti?: { immagini: number; video: number; testo: boolean; didascalie: number } } | null;
  inspiration_id: string | null;
  error: string | null;
  created_at: string;
};
export type Knowledge = {
  id: string;
  content_id: string | null;
  tema: string;
  corso: string | null;
  titolo: string;
  affermazione: string;
  dettaglio: string | null;
  verdetto: "fondato" | "in_parte" | "opinione" | "infondato" | "non_verificabile";
  spiegazione: string | null;
  versione_corretta: string | null;
  fonti: { titolo: string; url: string }[];
  stato: "proposta" | "approvata" | "scartata";
  created_at: string;
};

export const VERDETTO: Record<Knowledge["verdetto"], { label: string; cls: string; icon: ReactNode }> = {
  fondato: { label: "Fondato", cls: "bg-[#2E6B47]/12 text-[#2E6B47] dark:text-[#7FC79B]", icon: <CheckCircle2 size={13} /> },
  in_parte: { label: "Vero in parte", cls: "bg-gold-tint text-gold", icon: <Scale size={13} /> },
  opinione: { label: "Opinione / gusto", cls: "bg-card text-muted", icon: <Sparkles size={13} /> },
  infondato: { label: "Infondato", cls: "bg-danger-tint text-danger", icon: <XCircle size={13} /> },
  non_verificabile: { label: "Non verificabile", cls: "bg-card text-muted", icon: <CircleHelp size={13} /> },
};
const STEP: Record<Content["status"], string> = {
  nuovo: "In coda",
  raccolta: "Raccolgo foto, video e testi…",
  analisi: "Guardo e ascolto tutto, faccio la cernita…",
  verifica: "Verifico ogni insegnamento sul web…",
  pronto: "Pronto",
  errore: "Errore",
};
const COURSE_NAME = Object.fromEntries(CORSI.map((c) => [c.id, c.titolo]));

/* ------------------------------------------------------------------ */
/* lavorazione: continua anche se cambi schermata                      */
/* ------------------------------------------------------------------ */
const running = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function processContent(c: Pick<Content, "id" | "status" | "media" | "analysis" | "kind">) {
  if (running.has(c.id)) return;
  running.add(c.id);
  notify();
  try {
    const hasMedia = !!(c.media?.images?.length || c.media?.videos?.length || c.media?.youtube || c.media?.text || c.media?.captions?.length);
    if (c.kind !== "file" && (!hasMedia || c.status === "raccolta" || c.status === "nuovo")) {
      await fn("contenuti", "", { action: "raccogli", id: c.id });
      notify();
    }
    if (!c.analysis || c.status === "analisi") {
      await fn("contenuti", "", { action: "analizza", id: c.id });
      notify();
    }
    await fn("contenuti", "", { action: "verifica", id: c.id });
    notify();
    // i tutorial trovati ricevono le illustrazioni (se la fatturazione di Gemini è attiva)
    illustrateContent(c.id);
  } catch {
    /* l'errore è salvato sul contenuto */
  } finally {
    running.delete(c.id);
    notify();
  }
}

export function useContents() {
  const [contents, setContents] = useState<Content[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, force] = useState(0);
  const load = useCallback(async () => {
    const [c, k] = await Promise.all([supabase.from("contents").select("*").order("created_at", { ascending: false }), supabase.from("knowledge").select("*").order("created_at")]);
    setContents((c.data as Content[]) || []);
    setKnowledge((k.data as Knowledge[]) || []);
    setLoaded(true);
  }, []);
  useEffect(() => {
    load();
    const l = () => {
      force((n) => n + 1);
      load();
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [load]);
  // aggiorna mentre qualcosa è in lavorazione
  useEffect(() => {
    if (!running.size) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  });
  return { contents, knowledge, loaded, reload: load, setKnowledge };
}

/* ------------------------------------------------------------------ */
/* componenti                                                          */
/* ------------------------------------------------------------------ */
const H = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between mt-8 mb-3">
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {children}
    </h2>
    {right}
  </div>
);

function TypeIcon({ c }: { c: Content }) {
  const t = c.tipo || c.kind;
  const cls = "text-gold";
  if (t.startsWith("instagram")) return <Instagram size={18} className={cls} />;
  if (t === "youtube") return <Youtube size={18} className={cls} />;
  if (t === "file") return <FileVideo size={18} className={cls} />;
  if (t === "immagine") return <ImageIcon size={18} className={cls} />;
  return <Globe size={18} className={cls} />;
}

export function KnowledgeCard({ k, onDecide, compact }: { k: Knowledge; onDecide?: (stato: "approvata" | "scartata") => void; compact?: boolean }) {
  const v = VERDETTO[k.verdetto] || VERDETTO.non_verificabile;
  const approved = k.stato === "approvata";
  return (
    <div className="rounded-[20px] bg-surface shadow-soft p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">{k.tema}</span>
        {k.corso && COURSE_NAME[k.corso] && <span className="text-[10.5px] text-muted">· corso {COURSE_NAME[k.corso]}</span>}
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${v.cls}`}>
          {v.icon} {v.label}
        </span>
      </div>
      <div className="text-[16.5px] font-semibold leading-snug mt-2">{k.titolo}</div>
      {approved && !compact ? (
        <p className="text-[14.5px] leading-relaxed mt-1.5">{k.versione_corretta || k.affermazione}</p>
      ) : (
        <>
          <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted">Cosa dice il contenuto</div>
          <p className="text-[14.5px] leading-relaxed mt-0.5">{k.affermazione}</p>
          {k.dettaglio && !compact && <p className="text-[13px] text-muted leading-relaxed mt-1">{k.dettaglio}</p>}
        </>
      )}
      {k.spiegazione && (
        <div className="mt-3 rounded-[14px] bg-card p-3.5">
          <div className="text-[11px] uppercase tracking-[0.1em] text-muted mb-0.5">La verifica</div>
          <p className="text-[13.5px] leading-relaxed">{k.spiegazione}</p>
          {k.versione_corretta && !approved && (
            <p className="text-[13.5px] leading-relaxed mt-2">
              <b>Versione corretta:</b> {k.versione_corretta}
            </p>
          )}
        </div>
      )}
      {k.fonti?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {k.fonti.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11.5px] text-muted hover:text-gold">
              <ExternalLink size={11} /> {f.titolo}
            </a>
          ))}
        </div>
      )}
      {onDecide && (
        <div className="mt-4 flex gap-2">
          {k.stato !== "approvata" && (
            <button onClick={() => onDecide("approvata")} className="flex-1 h-11 rounded-full bg-brand text-brand-fg text-[14px] font-semibold flex items-center justify-center gap-1.5">
              <Check size={16} /> {k.versione_corretta ? "Approva corretta" : k.verdetto === "infondato" ? "Approva comunque" : "Approva"}
            </button>
          )}
          <button onClick={() => onDecide("scartata")} className={`h-11 rounded-full bg-card text-[14px] font-semibold flex items-center justify-center gap-1.5 ${k.stato === "approvata" ? "flex-1" : "px-5"}`}>
            <X size={16} /> {k.stato === "approvata" ? "Togli dal quaderno" : "Scarta"}
          </button>
        </div>
      )}
    </div>
  );
}

function ContentSheet({ c, knowledge, onClose, onChanged, onTutorial }: { c: Content | null; knowledge: Knowledge[]; onClose: () => void; onChanged: () => void; onTutorial: (id: string) => void }) {
  const app = useApp();
  const tut = useTutorials();
  if (!c) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const items = knowledge.filter((k) => k.content_id === c.id);
  const busy = running.has(c.id);
  const del = async () => {
    const paths = [...(c.media?.images || []), ...(c.media?.videos || []).map((v) => v.path)];
    if (paths.length && !c.inspiration_id) await supabase.storage.from("inspirations").remove(paths);
    await supabase.from("contents").delete().eq("id", c.id);
    onClose();
    onChanged();
  };
  const f = c.analysis?.fonti;
  return (
    <Sheet open onClose={onClose} eyebrow={c.source || "File caricati"} title={c.title || "Contenuto"} full>
      <div className="space-y-4 pb-8">
        {c.analysis?.riassunto && <p className="text-[15px] leading-relaxed">{c.analysis.riassunto}</p>}
        {f && (
          <div className="text-[12.5px] text-muted">
            Ho analizzato {f.immagini} immagini{f.video ? `, ${f.video} video per intero` : ""}
            {f.testo ? ", il testo della pagina" : ""}
            {f.didascalie ? ` e ${f.didascalie} didascalie` : ""}.
          </div>
        )}
        {c.analysis?.temi?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {c.analysis.temi.map((t) => (
              <span key={t} className="rounded-full bg-gold-tint px-3 py-1 text-[12px] font-medium">
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {c.inspiration_id && (
          <button onClick={() => app.setTab("stile")} className="w-full text-left rounded-[16px] bg-card p-4 flex items-center gap-3">
            <Sparkles size={18} className="text-gold" />
            <span className="flex-1 text-[14px]">
              Ci sono outfit e capi: <b>l'analisi di stile è nelle tue Ispirazioni</b>
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        )}
        {c.status === "errore" && (
          <div className="rounded-[16px] bg-danger-tint text-danger p-4 text-[14px] flex gap-2">
            <AlertTriangle size={18} className="shrink-0" /> {c.error}
          </div>
        )}
        {(busy || !["pronto", "errore"].includes(c.status)) && (
          <div className="rounded-[16px] bg-card p-4 text-[14px] flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-gold" /> {STEP[c.status]}
          </div>
        )}
        {(tut.list || [])
          .filter((t) => t.content_id === c.id && t.stato !== "scartato")
          .map((t) => (
            <TutorialRow
              key={t.id}
              t={t}
              onOpen={() => {
                onClose();
                onTutorial(t.id);
              }}
            />
          ))}
        {items.map((k) => (
          <KnowledgeCard
            key={k.id}
            k={k}
            onDecide={async (stato) => {
              await supabase.from("knowledge").update({ stato, decided_at: new Date().toISOString() }).eq("id", k.id);
              onChanged();
            }}
          />
        ))}
        <div className="flex gap-2 pt-2">
          {!busy && (c.status === "errore" || c.status === "pronto") && (
            <button
              onClick={() => {
                processContent(c.status === "pronto" ? { ...c, status: "verifica" } : c);
                app.toast(c.status === "pronto" ? "Rifaccio la verifica" : "Riprendo da dove si era fermato");
              }}
              className="flex-1 h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} /> {c.status === "pronto" ? "Riverifica" : "Riprova"}
            </button>
          )}
          <button onClick={del} className="flex-1 h-11 rounded-full bg-danger-tint text-danger text-[14px] font-medium flex items-center justify-center gap-2">
            <Trash2 size={15} /> Elimina
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Preview({ f }: { f: File }) {
  const url = useMemo(() => URL.createObjectURL(f), [f]);
  return f.type.startsWith("video/") ? <video src={url} muted className="h-full w-full object-cover" /> : <img src={url} className="h-full w-full object-cover" />;
}
function Thumb({ path }: { path?: string }) {
  const url = useSignedUrl("inspirations", path || null);
  return url ? <img src={url} className="h-full w-full object-cover" /> : null;
}

/* ------------------------------------------------------------------ */
/* schermata                                                           */
/* ------------------------------------------------------------------ */
export function ContentsScreen() {
  const app = useApp();
  const { contents, knowledge, loaded, reload, setKnowledge } = useContents();
  const [view, setView] = useState<"proposte" | "quaderno" | "contenuti">("proposte");
  const [text, setText] = useState("");
  const [nota, setNota] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [tema, setTema] = useState<string>("Tutti");
  const ref = useRef<HTMLInputElement>(null);

  const proposte = knowledge.filter((k) => k.stato === "proposta");
  const tut = useTutorials();
  const tutProposte = (tut.list || []).filter((t) => t.stato === "proposta");
  const tutOk = (tut.list || []).filter((t) => t.stato === "approvato");
  const [openTut, setOpenTut] = useState<string | null>(null);
  const approvate = knowledge.filter((k) => k.stato === "approvata");
  const temi = ["Tutti", ...Array.from(new Set(approvate.map((k) => k.tema)))];

  // riprende i contenuti rimasti a metà (app chiusa durante la lavorazione)
  useEffect(() => {
    if (!loaded) return;
    contents.filter((c) => ["nuovo", "raccolta", "analisi", "verifica"].includes(c.status) && !running.has(c.id) && Date.now() - Date.parse(c.created_at) < 3 * 86400000).forEach((c) => processContent(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const decide = async (k: Knowledge, stato: "approvata" | "scartata") => {
    setKnowledge((list) => list.map((x) => (x.id === k.id ? { ...x, stato } : x)));
    await supabase.from("knowledge").update({ stato, decided_at: new Date().toISOString() }).eq("id", k.id);
    if (stato === "approvata") app.toast("Aggiunto al quaderno");
  };

  const submit = async () => {
    const lines = text
      .split(/[\n\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length && !files.length) return app.toast("Incolla un link o un @profilo, oppure allega foto o video");
    setBusy("Preparo…");
    try {
      const rows: Partial<Content>[] = lines.map((s) => {
        const isProfile = /^@[\w.]+$/.test(s) || /^https?:\/\/(www\.)?instagram\.com\/[\w.]+\/?(\?.*)?$/.test(s);
        const url = /^https?:\/\//.test(s) ? s : isProfile ? s : `https://${s}`;
        return { kind: isProfile ? "profilo" : "link", source: url, nota: nota || null };
      });
      if (files.length) {
        const images: string[] = [];
        const videos: { path: string; mime: string }[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setBusy(`Carico ${i + 1} di ${files.length}…`);
          if (f.type.startsWith("video/")) {
            if (f.size <= 45 * 1024 * 1024 && videos.length < 3) {
              const vp = `${app.uid}/vid-${crypto.randomUUID()}.${f.type.includes("quicktime") ? "mov" : "mp4"}`;
              const { error } = await supabase.storage.from("inspirations").upload(vp, f, { contentType: f.type || "video/mp4" });
              if (!error) videos.push({ path: vp, mime: f.type || "video/mp4" });
              const frames = await videoFrames(f, 3);
              for (const fr of frames) images.push(await uploadBlob("inspirations", app.uid, fr, "frame"));
            } else {
              const frames = await videoFrames(f, 10);
              for (const fr of frames) images.push(await uploadBlob("inspirations", app.uid, fr, "frame"));
            }
          } else images.push(await uploadImage("inspirations", app.uid, f, "shot"));
        }
        rows.push({ kind: "file", source: null, title: `${files.length} file caricati`, nota: nota || null, media: { images, videos, captions: [] } as Content["media"], status: "analisi" });
      }
      const { data, error } = await supabase.from("contents").insert(rows).select();
      if (error) throw error;
      (data as Content[]).forEach((c) => processContent(c));
      setText("");
      setNota("");
      setFiles([]);
      setView("contenuti");
      app.toast(`${data.length === 1 ? "Contenuto" : `${data.length} contenuti`} in lavorazione: ti avviso qui quando ci sono le proposte`);
      reload();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy("");
  };

  const seg = (id: typeof view, label: string, n?: number) => (
    <button onClick={() => setView(id)} className={`h-9 px-4 rounded-full text-[13.5px] font-semibold shrink-0 ${view === id ? "bg-brand text-brand-fg" : "bg-card text-muted"}`}>
      {label}
      {n ? <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${view === id ? "bg-white/20" : "bg-gold text-ongold"}`}>{n}</span> : null}
    </button>
  );

  const current = contents.find((c) => c.id === open) || null;

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Contenuti</h1>
      <p className="text-[14.5px] text-muted mt-2 leading-relaxed">
        Porta qui tutto quello che trovi in giro: profili Instagram, post e reel, video YouTube, articoli, foto e video salvati. Faccio la cernita di ogni insegnamento, lo verifico su fonti autorevoli e te lo propongo. Nel tuo quaderno entra solo quello che approvi.
      </p>

      {/* raccolta */}
      <div className="mt-5 rounded-[24px] bg-surface shadow-soft p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"@profilo oppure link, uno per riga\ninstagram.com/reel/…  ·  youtube.com/…  ·  articolo"}
          className="w-full min-h-[96px] p-3.5 rounded-[16px] bg-card text-[15.5px] outline-none focus:ring-1 focus:ring-gold"
        />
        {files.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {files.map((f, i) => (
              <div key={i} className="relative h-20 w-16 rounded-[12px] overflow-hidden bg-card shrink-0">
                <Preview f={f} />
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white grid place-items-center" aria-label="Togli">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota facoltativa: cosa ti interessa di questo contenuto?" className="mt-3 w-full h-11 px-3.5 rounded-[14px] bg-card text-[14.5px] outline-none" />
        <div className="mt-3 flex gap-2">
          <button onClick={() => ref.current?.click()} className="h-11 px-4 rounded-full bg-card text-[14px] font-medium flex items-center gap-2">
            <Paperclip size={16} /> Foto o video
          </button>
          <button onClick={submit} disabled={!!busy} className="flex-1 h-11 rounded-full bg-brand text-brand-fg text-[14.5px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy || "Analizza e verifica"}
          </button>
        </div>
        <input ref={ref} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && setFiles((x) => [...x, ...Array.from(e.target.files!)].slice(0, 12))} />
        <div className="mt-2.5 text-[11.5px] text-muted">I profili Instagram devono essere Creator o Business. Per profili personali o privati registra lo schermo e allega il video.</div>
      </div>

      <div className="mt-6 flex gap-1.5 overflow-x-auto no-scrollbar">
        {seg("proposte", "Da approvare", proposte.length + tutProposte.length)}
        {seg("quaderno", "Quaderno", approvate.length + tutOk.length)}
        {seg("contenuti", "Contenuti", contents.filter((c) => running.has(c.id)).length)}
      </div>

      {view === "proposte" && tutProposte.length > 0 && (
        <>
          <H right={<span className="text-[12px] text-muted">in stile WikiHow</span>}>Tutorial da approvare</H>
          <div className="space-y-2.5">
            {tutProposte.map((t) => (
              <TutorialRow key={t.id} t={t} onOpen={() => setOpenTut(t.id)} />
            ))}
          </div>
        </>
      )}
      {view === "proposte" && (
        <>
          {proposte.length === 0 && tutProposte.length === 0 ? (
            <div className="mt-4 rounded-[20px] bg-surface shadow-soft p-6 text-center text-[14px] text-muted">
              <Inbox size={26} className="mx-auto text-gold mb-2" />
              Nessuna proposta in attesa. Porta un contenuto e qui troverai ogni insegnamento, con la verifica e le fonti.
            </div>
          ) : (
            contents
              .filter((c) => proposte.some((k) => k.content_id === c.id))
              .map((c) => (
                <div key={c.id}>
                  <H right={<span className="text-[12px] text-muted">{proposte.filter((k) => k.content_id === c.id).length} da decidere</span>}>{c.title || c.source}</H>
                  <div className="space-y-3">
                    {proposte
                      .filter((k) => k.content_id === c.id)
                      .map((k) => (
                        <KnowledgeCard key={k.id} k={k} onDecide={(s) => decide(k, s)} />
                      ))}
                  </div>
                </div>
              ))
          )}
        </>
      )}

      {view === "quaderno" && tutOk.length > 0 && (
        <>
          <H>Tutorial</H>
          <div className="space-y-2.5">
            {tutOk.map((t) => (
              <TutorialRow key={t.id} t={t} onOpen={() => setOpenTut(t.id)} />
            ))}
          </div>
        </>
      )}
      {view === "quaderno" && (
        <>
          {approvate.length === 0 && tutOk.length === 0 ? (
            <div className="mt-4 rounded-[20px] bg-surface shadow-soft p-6 text-center text-[14px] text-muted">
              <BookMarked size={26} className="mx-auto text-gold mb-2" />
              Il quaderno è vuoto. Gli insegnamenti che approvi finiscono qui, e nei corsi dell'Accademia a cui appartengono.
            </div>
          ) : (
            <>
              <div className="mt-4 flex gap-1.5 overflow-x-auto no-scrollbar">
                {temi.map((t) => (
                  <button key={t} onClick={() => setTema(t)} className={`h-8 px-3.5 rounded-full text-[12.5px] font-medium shrink-0 ${tema === t ? "bg-gold text-ongold" : "bg-card"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-3 space-y-3">
                {approvate
                  .filter((k) => tema === "Tutti" || k.tema === tema)
                  .map((k) => (
                    <KnowledgeCard key={k.id} k={k} onDecide={(s) => decide(k, s)} />
                  ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "contenuti" && (
        <div className="mt-4 space-y-2.5">
          {contents.length === 0 && <div className="rounded-[20px] bg-surface shadow-soft p-6 text-center text-[14px] text-muted">Ancora nessun contenuto.</div>}
          {contents.map((c) => {
            const n = knowledge.filter((k) => k.content_id === c.id);
            const work = running.has(c.id) || !["pronto", "errore"].includes(c.status);
            return (
              <button key={c.id} onClick={() => setOpen(c.id)} className="w-full text-left rounded-[18px] bg-surface shadow-soft p-3.5 flex items-center gap-3">
                <div className="h-14 w-14 rounded-[12px] bg-card overflow-hidden shrink-0 grid place-items-center">{c.media?.images?.[0] ? <Thumb path={c.media.images[0]} /> : <TypeIcon c={c} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-semibold truncate">{c.title || c.source || "Contenuto"}</div>
                  <div className={`text-[12.5px] flex items-center gap-1.5 ${c.status === "errore" ? "text-danger" : "text-muted"}`}>
                    {work && c.status !== "errore" && <Loader2 size={12} className="animate-spin" />}
                    {c.status === "errore" ? c.error || "Errore" : work ? STEP[c.status] : `${n.length} insegnamenti · ${n.filter((k) => k.stato === "proposta").length} da decidere`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            );
          })}
        </div>
      )}

      <ContentSheet c={current} knowledge={knowledge} onClose={() => setOpen(null)} onChanged={reload} onTutorial={(id) => setOpenTut(id)} />
      <TutorialView t={(tut.list || []).find((t) => t.id === openTut) || null} onClose={() => setOpenTut(null)} onChanged={tut.reload} />
    </div>
  );
}

/** Insegnamenti approvati di un corso, per l'Accademia. */
export function CourseNotes({ corso }: { corso: string }) {
  const [list, setList] = useState<Knowledge[]>([]);
  useEffect(() => {
    supabase
      .from("knowledge")
      .select("*")
      .eq("stato", "approvata")
      .eq("corso", corso)
      .order("created_at")
      .then(({ data }) => setList((data as Knowledge[]) || []));
  }, [corso]);
  if (!list.length) return null;
  return (
    <div className="mt-8">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2 mb-3">
        <BookMarked size={13} className="text-gold" /> Dal tuo quaderno
      </h2>
      <div className="space-y-3">
        {list.map((k) => (
          <KnowledgeCard key={k.id} k={k} compact={false} />
        ))}
      </div>
    </div>
  );
}

/** Invito nella schermata Oggi quando ci sono proposte. */
export function ProposalsBadge() {
  const app = useApp();
  const [n, setN] = useState(0);
  useEffect(() => {
    Promise.all([
      supabase.from("knowledge").select("id", { count: "exact", head: true }).eq("stato", "proposta"),
      supabase.from("tutorials").select("id", { count: "exact", head: true }).eq("stato", "proposta"),
    ]).then(([a, b]) => setN((a.count || 0) + (b.count || 0)));
  }, []);
  if (!n) return null;
  return (
    <button onClick={() => app.setTab("contenuti")} className="mt-3 w-full text-left rounded-[22px] bg-surface shadow-soft p-5 flex items-center gap-4">
      <Inbox size={24} className="text-gold shrink-0" />
      <div className="flex-1">
        <div className="font-semibold text-[15.5px]">
          {n} propost{n === 1 ? "a" : "e"} da approvare
        </div>
        <div className="text-[13px] text-muted">Insegnamenti e tutorial verificati sul web: decidi tu cosa entra.</div>
      </div>
      <ChevronRight size={18} className="text-muted" />
    </button>
  );
}
