import { AlertTriangle, BookOpen, Check, ChevronRight, Clock, ExternalLink, Gauge, Lightbulb, ListChecks, Loader2, PlayCircle, Wand2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sheet } from "../components/ui";
import { CORSI } from "../academy/content";
import { useApp } from "../lib/store";
import { fn, supabase, useSignedUrl } from "../lib/supabase";

export type Step = { titolo: string; testo: string; consiglio?: string | null; attenzione?: string | null; momento?: string | null; illustrazione?: string; img?: string | null };
export type Tutorial = {
  id: string;
  content_id: string | null;
  corso: string | null;
  tema: string | null;
  titolo: string;
  data: { intro?: string; difficolta?: string; minuti?: number; occorrente?: string[]; passaggi: Step[]; consigli?: string[]; errori?: string[] };
  verifica: { verdetto: string; spiegazione: string; correzioni: { passaggio: number; nota: string }[]; fonti: { titolo: string; url: string }[] } | null;
  img_status: "da_fare" | "in_corso" | "fatto" | "bloccato";
  img_error: string | null;
  stato: "proposta" | "approvato" | "scartato";
  created_at: string;
};
const COURSE_NAME = Object.fromEntries(CORSI.map((c) => [c.id, c.titolo]));
const VERD: Record<string, { label: string; cls: string }> = {
  fondato: { label: "Verificato", cls: "bg-[#2E6B47]/12 text-[#2E6B47] dark:text-[#7FC79B]" },
  in_parte: { label: "Corretto in parte", cls: "bg-gold-tint text-gold" },
  infondato: { label: "Da rivedere", cls: "bg-danger-tint text-danger" },
  non_verificabile: { label: "Non verificabile", cls: "bg-card text-muted" },
  opinione: { label: "Questione di gusto", cls: "bg-card text-muted" },
};

/* ---------- illustrazioni: un passaggio alla volta, si ferma se manca la fatturazione ---------- */
const drawing = new Set<string>();
const subs = new Set<() => void>();
const ping = () => subs.forEach((f) => f());
export async function illustrate(t: Pick<Tutorial, "id" | "data">, toast?: (m: string) => void) {
  if (drawing.has(t.id)) return;
  drawing.add(t.id);
  ping();
  try {
    for (let i = 0; i < t.data.passaggi.length; i++) {
      if (t.data.passaggi[i].img) continue;
      try {
        await fn("contenuti", "", { action: "illustra", tutorial_id: t.id, step: i });
        ping();
      } catch (e) {
        const m = (e as Error).message;
        if (/fatturazione|quota/i.test(m)) {
          toast?.("Illustrazioni in pausa: serve la fatturazione di Gemini");
          break;
        }
      }
    }
  } finally {
    drawing.delete(t.id);
    ping();
  }
}
/** Dopo la verifica di un contenuto: disegna le illustrazioni dei suoi tutorial. */
export async function illustrateContent(contentId: string) {
  const { data } = await supabase.from("tutorials").select("id, data, img_status").eq("content_id", contentId).neq("img_status", "bloccato");
  for (const t of (data as Tutorial[]) || []) await illustrate(t);
}

export function useTutorials(filter?: { corso?: string; stato?: Tutorial["stato"] }) {
  const [list, setList] = useState<Tutorial[] | null>(null);
  const [, force] = useState(0);
  const load = useCallback(async () => {
    let q = supabase.from("tutorials").select("*").order("created_at", { ascending: false });
    if (filter?.corso) q = q.eq("corso", filter.corso);
    if (filter?.stato) q = q.eq("stato", filter.stato);
    const { data } = await q;
    setList((data as Tutorial[]) || []);
  }, [filter?.corso, filter?.stato]);
  useEffect(() => {
    load();
    const f = () => {
      force((n) => n + 1);
      load();
    };
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, [load]);
  return { list, reload: load };
}

/* ---------- pagina del tutorial ---------- */
function StepImage({ step, n, busy }: { step: Step; n: number; busy: boolean }) {
  const url = useSignedUrl("tutorials", step.img || null);
  return (
    <div className="aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-card grid place-items-center relative">
      {url ? (
        <img src={url} alt={step.titolo} className="h-full w-full object-cover" />
      ) : (
        <div className="text-center text-muted">
          <div className="font-display text-[56px] leading-none text-gold/60">{n}</div>
          <div className="text-[12px] mt-1 flex items-center gap-1.5 justify-center">{busy ? <><Loader2 size={12} className="animate-spin" /> Sto disegnando…</> : "Illustrazione non ancora disponibile"}</div>
        </div>
      )}
    </div>
  );
}

export function TutorialView({ t, onClose, onChanged }: { t: Tutorial | null; onClose: () => void; onChanged?: () => void }) {
  const app = useApp();
  const [, force] = useState(0);
  const [source, setSource] = useState<{ title: string | null; source: string | null } | null>(null);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  useEffect(() => {
    if (!t?.content_id) return setSource(null);
    supabase
      .from("contents")
      .select("title, source")
      .eq("id", t.content_id)
      .maybeSingle()
      .then(({ data }) => setSource(data));
  }, [t?.content_id]);
  if (!t) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const d = t.data;
  const v = t.verifica ? VERD[t.verifica.verdetto] || VERD.non_verificabile : null;
  const busy = drawing.has(t.id);
  const missing = d.passaggi.filter((p) => !p.img).length;
  const decide = async (stato: Tutorial["stato"]) => {
    await supabase.from("tutorials").update({ stato, decided_at: new Date().toISOString() }).eq("id", t.id);
    app.toast(stato === "approvato" ? `Aggiunto ${t.corso && COURSE_NAME[t.corso] ? `al corso ${COURSE_NAME[t.corso]}` : "all'Accademia"}` : stato === "scartato" ? "Tutorial scartato" : "Tolto dal corso");
    onChanged?.();
    ping();
    onClose();
  };

  return (
    <Sheet open onClose={onClose} eyebrow={`Tutorial${t.corso && COURSE_NAME[t.corso] ? ` · ${COURSE_NAME[t.corso]}` : ""}`} title={t.titolo} full>
      <div className="pb-10 max-w-[680px]">
        {d.intro && <p className="text-[15.5px] leading-relaxed">{d.intro}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.difficolta && (
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-[12px]">
              <Gauge size={12} /> {d.difficolta}
            </span>
          )}
          {d.minuti ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-[12px]">
              <Clock size={12} /> {d.minuti} min
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-[12px]">
            <ListChecks size={12} /> {d.passaggi.length} passaggi
          </span>
          {v ? <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${v.cls}`}>{v.label}</span> : <span className="rounded-full bg-card px-3 py-1 text-[12px] text-muted">Verifica in corso…</span>}
        </div>

        {t.stato === "proposta" && (
          <div className="mt-4 rounded-[16px] border border-gold/40 bg-gold-tint p-4 text-[13.5px]">
            Questo tutorial è una <b>proposta</b>: leggilo, guarda la verifica in fondo e decidi se aggiungerlo al corso.
          </div>
        )}

        {(missing > 0 || t.img_status === "bloccato") && (
          <div className="mt-4 rounded-[16px] bg-card p-4 flex items-start gap-3">
            <Wand2 size={18} className="text-gold shrink-0 mt-0.5" />
            <div className="flex-1 text-[13.5px]">
              {busy ? `Sto disegnando le illustrazioni (${d.passaggi.length - missing} di ${d.passaggi.length})…` : t.img_status === "bloccato" ? t.img_error || "Illustrazioni in pausa." : `${missing} illustrazioni da disegnare.`}
              {!busy && (
                <button
                  onClick={async () => {
                    await supabase.from("tutorials").update({ img_status: "da_fare" }).eq("id", t.id);
                    illustrate(t, app.toast);
                  }}
                  className="block mt-2 text-gold font-semibold"
                >
                  Genera illustrazioni
                </button>
              )}
            </div>
          </div>
        )}

        {!!d.occorrente?.length && (
          <div className="mt-6">
            <h3 className="font-display text-[22px]">Cosa ti serve</h3>
            <ul className="mt-2 space-y-1.5">
              {d.occorrente.map((o) => (
                <li key={o} className="flex gap-2 text-[14.5px]">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold shrink-0" /> {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="font-display text-[22px] mt-8">Passaggi</h3>
        <ol className="mt-3 space-y-6">
          {d.passaggi.map((s, i) => {
            const fix = t.verifica?.correzioni?.filter((c) => Number(c.passaggio) === i + 1) || [];
            return (
              <li key={i} className="rounded-[22px] bg-surface shadow-soft p-4">
                <StepImage step={s} n={i + 1} busy={busy && !s.img} />
                <div className="mt-4 flex gap-3">
                  <span className="h-9 w-9 rounded-full bg-brand text-brand-fg grid place-items-center font-display text-[18px] shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-semibold leading-snug">{s.titolo}</div>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed">{s.testo}</p>
                    {s.momento && (
                      <div className="mt-1.5 text-[11.5px] text-muted flex items-center gap-1">
                        <PlayCircle size={12} /> nel video a {s.momento}
                      </div>
                    )}
                    {s.consiglio && (
                      <div className="mt-3 rounded-[12px] bg-gold-tint p-3 text-[13.5px] flex gap-2">
                        <Lightbulb size={16} className="text-gold shrink-0 mt-0.5" /> {s.consiglio}
                      </div>
                    )}
                    {s.attenzione && (
                      <div className="mt-2 rounded-[12px] bg-danger-tint p-3 text-[13.5px] flex gap-2 text-danger">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {s.attenzione}
                      </div>
                    )}
                    {fix.map((f, j) => (
                      <div key={j} className="mt-2 rounded-[12px] border border-gold/50 p-3 text-[13px]">
                        <b>Nota della verifica:</b> {f.nota}
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {!!d.consigli?.length && (
          <div className="mt-8">
            <h3 className="font-display text-[22px]">Consigli</h3>
            <ul className="mt-2 space-y-2">
              {d.consigli.map((c) => (
                <li key={c} className="flex gap-2 text-[14.5px]">
                  <Lightbulb size={15} className="text-gold shrink-0 mt-0.5" /> {c}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!d.errori?.length && (
          <div className="mt-6">
            <h3 className="font-display text-[22px]">Errori da evitare</h3>
            <ul className="mt-2 space-y-2">
              {d.errori.map((c) => (
                <li key={c} className="flex gap-2 text-[14.5px]">
                  <X size={15} className="text-danger shrink-0 mt-0.5" /> {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {t.verifica && (
          <div className="mt-8 rounded-[18px] bg-card p-4">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted">La verifica</div>
            <p className="text-[14px] leading-relaxed mt-1">{t.verifica.spiegazione}</p>
            {!!t.verifica.fonti?.length && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {t.verifica.fonti.map((f) => (
                  <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11.5px] text-muted hover:text-gold">
                    <ExternalLink size={11} /> {f.titolo}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {source && (
          <div className="mt-3 text-[12.5px] text-muted">
            Tratto da: {source.source && /^https?:/.test(source.source) ? <a href={source.source} target="_blank" rel="noreferrer" className="underline">{source.title || source.source}</a> : source.title || source.source || "i tuoi file"}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {t.stato === "proposta" && (
            <>
              <button onClick={() => decide("approvato")} className="flex-1 h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2">
                <Check size={17} /> Aggiungi {t.corso && COURSE_NAME[t.corso] ? "al corso" : "all'Accademia"}
              </button>
              <button onClick={() => decide("scartato")} className="h-12 px-5 rounded-full bg-card font-semibold flex items-center gap-1.5">
                <X size={16} /> Scarta
              </button>
            </>
          )}
          {t.stato === "approvato" && (
            <button onClick={() => decide("proposta")} className="flex-1 h-12 rounded-full bg-card font-medium">
              Togli dal corso
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- elementi per le altre schermate ---------- */
function Cover({ t }: { t: Tutorial }) {
  const first = t.data.passaggi.find((p) => p.img)?.img;
  const url = useSignedUrl("tutorials", first || null);
  return (
    <div className="h-16 w-20 rounded-[12px] bg-card overflow-hidden shrink-0 grid place-items-center">
      {url ? <img src={url} className="h-full w-full object-cover" /> : <BookOpen size={20} className="text-gold" />}
    </div>
  );
}
export function TutorialRow({ t, onOpen }: { t: Tutorial; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full text-left rounded-[18px] bg-surface shadow-soft p-3 flex items-center gap-3">
      <Cover t={t} />
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">Tutorial{t.corso && COURSE_NAME[t.corso] ? ` · ${COURSE_NAME[t.corso]}` : ""}</div>
        <div className="text-[15px] font-semibold leading-snug">{t.titolo}</div>
        <div className="text-[12px] text-muted">
          {t.data.passaggi.length} passaggi{t.data.minuti ? ` · ${t.data.minuti} min` : ""}
          {t.verifica ? ` · ${(VERD[t.verifica.verdetto] || VERD.non_verificabile).label.toLowerCase()}` : " · verifica in corso"}
        </div>
      </div>
      <ChevronRight size={16} className="text-muted" />
    </button>
  );
}

/** Tutorial approvati di un corso (pagina del corso nell'Accademia). */
export function CourseTutorials({ corso }: { corso: string }) {
  const { list } = useTutorials({ corso, stato: "approvato" });
  const [open, setOpen] = useState<string | null>(null);
  if (!list?.length) return null;
  return (
    <div className="mt-8">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2 mb-3">
        <BookOpen size={13} className="text-gold" /> Tutorial illustrati
      </h2>
      <div className="space-y-2.5">
        {list.map((t) => (
          <TutorialRow key={t.id} t={t} onOpen={() => setOpen(t.id)} />
        ))}
      </div>
      <TutorialView t={list.find((x) => x.id === open) || null} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Nella lezione: la guida illustrata passo passo, se c'è. */
export function LessonTutorial({ lezione }: { lezione: string }) {
  const [t, setT] = useState<Tutorial | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let vivo = true;
    supabase
      .from("tutorials")
      .select("*")
      .eq("lezione", lezione)
      .eq("stato", "approvato")
      .maybeSingle()
      .then(({ data }) => vivo && setT((data as Tutorial) || null));
    return () => {
      vivo = false;
    };
  }, [lezione]);
  if (!t) return null;
  return (
    <div className="mt-6">
      <TutorialRow t={t} onOpen={() => setOpen(true)} />
      <TutorialView t={open ? t : null} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Una volta per dispositivo: chiede al server di creare (in background) i tutorial illustrati delle lezioni pratiche. */
export function avviaLibreria() {
  const K = "habitus-libreria-tutorial-v1";
  try {
    if (localStorage.getItem(K)) return;
    localStorage.setItem(K, String(Date.now()));
  } catch {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txt = (b: any): string =>
    b.t === "p" || b.t === "h" || b.t === "tip" ? b.text
    : b.t === "list" ? b.items.map((x: string) => "- " + x).join("\n")
    : b.t === "steps" ? b.items.map((x: { titolo?: string; text: string }, i: number) => `${i + 1}. ${x.titolo ? x.titolo + ": " : ""}${x.text}`).join("\n")
    : b.t === "dodont" ? "Sì: " + b.si.join("; ") + "\nNo: " + b.no.join("; ")
    : b.t === "table" ? [b.head, ...b.rows].map((r: string[]) => r.join(" | ")).join("\n")
    : b.t === "fig" ? b.fig.caption || ""
    : "";
  const lezioni = CORSI.flatMap((c) => c.lezioni.map((l) => ({ corso: c.id, id: l.id, titolo: l.titolo, testo: (l.intro + "\n" + l.blocks.map(txt).join("\n")).slice(0, 5000) })));
  fn("tutorial", "", { action: "libreria", lezioni }).catch(() => {
    try {
      localStorage.removeItem(K);
    } catch {
      /* */
    }
  });
}
