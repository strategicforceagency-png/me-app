import { Camera, Check, ClipboardCheck, Loader2, Ruler, Sparkles, Trophy } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Sheet } from "../components/ui";
import { allLessons, lessonKey } from "../academy/content";
import { currentWeek, Path, PillarId, PILLARS, Trial } from "../gentleman/types";
import { useApp } from "../lib/store";
import { fn, supabase, uploadImage, useSignedUrl, learnMe } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* dati                                                                */
/* ------------------------------------------------------------------ */
export type Review = { week: number; data: ReviewData; created_at: string };
export type ReviewData = {
  pilastri?: Partial<Record<PillarId, number>>;
  andamento?: number;
  energia?: number;
  sonno?: number;
  tempo?: string;
  allenamento?: string;
  funzionato?: string;
  non_funzionato?: string;
  nota?: string;
};
type Entry = { day: string; metric: string; value: number };
type Photo = { id: string; day: string; angolo: string; path: string };
type TrialRow = { key: string; voto: number | null; note: string | null; done_at: string };

export const MISURE: { id: string; nome: string; unita: string }[] = [
  { id: "peso", nome: "Peso", unita: "kg" },
  { id: "vita", nome: "Vita (all'ombelico)", unita: "cm" },
  { id: "petto", nome: "Petto", unita: "cm" },
  { id: "fianchi", nome: "Fianchi", unita: "cm" },
  { id: "collo", nome: "Collo", unita: "cm" },
  { id: "braccio", nome: "Braccio (contratto)", unita: "cm" },
];
const ANGOLI = ["fronte", "lato", "schiena"];
const PNAME = Object.fromEntries(PILLARS.map((p) => [p.id, p.nome])) as Record<PillarId, string>;

export function useProgressData() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const [r, e, p, t] = await Promise.all([
      supabase.from("path_reviews").select("week, data, created_at").order("week"),
      supabase.from("progress_entries").select("day, metric, value").order("day"),
      supabase.from("progress_photos").select("id, day, angolo, path").order("day"),
      supabase.from("field_trials").select("key, voto, note, done_at"),
    ]);
    setReviews((r.data as Review[]) || []);
    setEntries((e.data as Entry[]) || []);
    setPhotos((p.data as Photo[]) || []);
    setTrials((t.data as TrialRow[]) || []);
    setLoaded(true);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { reviews, entries, photos, trials, loaded, reload: load };
}

/** Cosa c'è da fare oggi in tema di controlli (per la schermata Oggi). */
export function dueReview(path: Path, start: string | null | undefined, reviews: Review[]) {
  const week = currentWeek(start);
  if (!reviews.some((r) => r.week === 0)) return { kind: "partenza" as const, week: 0 };
  const days = start ? Math.floor((Date.now() - Date.parse(start + "T00:00:00")) / 86400000) : 0;
  const dayInWeek = days % 7;
  if (!reviews.some((r) => r.week === week) && (dayInWeek >= 5 || new Date().getDay() === 0)) return { kind: "settimana" as const, week };
  // settimana precedente saltata
  if (week > 1 && !reviews.some((r) => r.week === week - 1) && dayInWeek <= 1) return { kind: "settimana" as const, week: week - 1 };
  void path;
  return null;
}
export const dueTrials = (path: Path, start: string | null | undefined, trials: TrialRow[]) => {
  const week = currentWeek(start);
  return (path.prove || []).filter((t) => t.settimana <= week && !trials.some((x) => x.key === t.id));
};

/* ------------------------------------------------------------------ */
/* componenti di input                                                 */
/* ------------------------------------------------------------------ */
function Scale({ value, onChange, min, max }: { value?: number; onChange: (n: number) => void; min: string; max: string }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} className={`flex-1 h-11 rounded-[12px] font-semibold text-[15px] transition ${value === n ? "bg-brand text-brand-fg" : "bg-card"}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11.5px] text-muted mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
function Q({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-[14.5px] font-semibold">{label}</div>
      {hint && <div className="text-[12.5px] text-muted mt-0.5">{hint}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
const Opts = ({ opts, value, onChange }: { opts: string[]; value?: string; onChange: (s: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {opts.map((o) => (
      <button key={o} onClick={() => onChange(o)} className={`h-9 px-3.5 rounded-full text-[13.5px] font-medium transition ${value === o ? "bg-brand text-brand-fg" : "bg-card"}`}>
        {o}
      </button>
    ))}
  </div>
);
const area = "w-full min-h-[76px] p-3 rounded-[14px] bg-card text-[15px] outline-none focus:ring-1 focus:ring-gold";

function PillarsInput({ value, onChange }: { value: Partial<Record<PillarId, number>>; onChange: (v: Partial<Record<PillarId, number>>) => void }) {
  return (
    <div className="space-y-3">
      {PILLARS.map((p) => (
        <div key={p.id}>
          <div className="text-[13.5px] mb-1">{p.nome}</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => onChange({ ...value, [p.id]: n })} className={`flex-1 h-9 rounded-[10px] text-[13.5px] font-semibold ${value[p.id] === n ? "bg-gold text-ongold" : "bg-card"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MeasuresInput({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MISURE.map((m) => (
        <label key={m.id} className="block">
          <div className="text-[12.5px] text-muted mb-1">
            {m.nome} ({m.unita})
          </div>
          <input inputMode="decimal" value={value[m.id] || ""} onChange={(e) => onChange({ ...value, [m.id]: e.target.value.replace(",", ".") })} className="w-full h-11 px-3 rounded-[12px] bg-card text-[16px] outline-none" />
        </label>
      ))}
    </div>
  );
}

function PhotosInput({ files, onChange }: { files: Record<string, File | undefined>; onChange: (f: Record<string, File | undefined>) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ANGOLI.map((a) => {
        const f = files[a];
        return (
          <label key={a} className="aspect-[3/4] rounded-[14px] bg-card grid place-items-center overflow-hidden relative cursor-pointer">
            {f ? <img src={URL.createObjectURL(f)} className="absolute inset-0 h-full w-full object-cover" /> : <Camera size={22} className="text-muted" />}
            <span className="absolute bottom-1.5 left-1.5 text-[11px] font-semibold bg-surface/90 rounded-full px-2 py-0.5 capitalize">{a}</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onChange({ ...files, [a]: e.target.files?.[0] })} />
          </label>
        );
      })}
    </div>
  );
}

async function saveMeasuresAndPhotos(uid: string, m: Record<string, string>, photos: Record<string, File | undefined>) {
  const day = new Date().toISOString().slice(0, 10);
  const rows = Object.entries(m)
    .filter(([, v]) => v && !isNaN(Number(v)))
    .map(([metric, v]) => ({ day, metric, value: Number(v) }));
  if (rows.length) await supabase.from("progress_entries").upsert(rows);
  for (const [angolo, f] of Object.entries(photos)) {
    if (!f) continue;
    const path = await uploadImage("progress", uid, f, `progressi-${angolo}`);
    await supabase.from("progress_photos").insert({ day, angolo, path });
  }
}

/* ------------------------------------------------------------------ */
/* punto di partenza                                                   */
/* ------------------------------------------------------------------ */
export function BaselineSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const app = useApp();
  const [step, setStep] = useState(0);
  const [m, setM] = useState<Record<string, string>>(() => (app.profile?.peso ? { peso: String(app.profile.peso) } : ({} as Record<string, string>)));
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [pil, setPil] = useState<Partial<Record<PillarId, number>>>({});
  const [busy, setBusy] = useState(false);
  const steps = ["Misure", "Foto", "Autovalutazione", "Linguaggio"];

  const save = async () => {
    setBusy(true);
    try {
      await saveMeasuresAndPhotos(app.uid, m, files);
      await supabase.from("path_reviews").upsert({ week: 0, data: { pilastri: pil } });
      app.toast("Punto di partenza salvato");
      onDone();
      onClose();
      setStep(0);
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow={`Punto di partenza · ${step + 1} di ${steps.length}`} title={steps[step]} full>
      <div className="space-y-5 pb-6">
        {step === 0 && (
          <>
            <p className="text-[14px] text-muted leading-relaxed">Come la prima prova dal sarto: si prendono le misure prima di tagliare. Al mattino, a digiuno, con il metro da sarta. Lascia vuoto quello che non hai.</p>
            <MeasuresInput value={m} onChange={setM} />
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-[14px] text-muted leading-relaxed">Tre foto, stessa luce e stessa distanza, in intimo o maglietta aderente. Restano private: le vedi solo tu, nel confronto tra 4, 8 e 12 settimane.</p>
            <PhotosInput files={files} onChange={setFiles} />
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-[14px] text-muted leading-relaxed">Da 1 a 5, quanto ti senti a posto oggi su ogni pilastro? La rifarai ogni 4 settimane: è il metro per dire «ce l'ho fatta».</p>
            <PillarsInput value={pil} onChange={setPil} />
          </>
        )}
        {step === 3 && (
          <>
            <p className="text-[14px] leading-relaxed">
              Ultimo passo, il più utile: registra <b>un minuto</b> in cui racconti la tua giornata di ieri, come parleresti a un amico. Sarà il tuo riferimento: a fine percorso registri di nuovo e confronti punteggio e intercalari.
            </p>
            <button
              onClick={() => {
                save().then(() => app.setTab("linguaggio"));
              }}
              className="w-full h-12 rounded-full bg-card font-semibold"
            >
              Salva e vai al Laboratorio del linguaggio
            </button>
          </>
        )}
        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="h-12 px-5 rounded-full bg-card font-semibold">
              Indietro
            </button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 h-12 rounded-full bg-brand text-brand-fg font-semibold">
              Avanti
            </button>
          ) : (
            <button onClick={save} disabled={busy || Object.keys(pil).length < 7} className="flex-1 h-12 rounded-full bg-brand text-brand-fg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 size={16} className="animate-spin" />} Salva il punto di partenza
            </button>
          )}
        </div>
        {step === steps.length - 1 && Object.keys(pil).length < 7 && <div className="text-[12px] text-muted text-center">Completa l'autovalutazione di tutti e 7 i pilastri.</div>}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* controllo settimanale                                               */
/* ------------------------------------------------------------------ */
export function ReviewSheet({ open, week, onClose, onDone }: { open: boolean; week: number; onClose: () => void; onDone: () => void }) {
  const app = useApp();
  const monthly = week % 4 === 0;
  const [d, setD] = useState<ReviewData>({});
  const [m, setM] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [busy, setBusy] = useState<"" | "salvo" | "adatto">("");
  const [nota, setNota] = useState<string | null>(null);
  const set = (p: Partial<ReviewData>) => setD((x) => ({ ...x, ...p }));
  const ready = d.andamento && d.energia && d.sonno && d.tempo && d.allenamento && (!monthly || Object.keys(d.pilastri || {}).length === 7);

  const save = async () => {
    setBusy("salvo");
    try {
      await saveMeasuresAndPhotos(app.uid, m, files);
      await supabase.from("path_reviews").upsert({ week, data: d });
      learnMe((sc) => app.setProfile({ scheda: sc }));
      setBusy("adatto");
      const catalog = allLessons.map(({ course, lesson }) => ({ id: lessonKey(course, lesson), titolo: `${course.titolo} – ${lesson.titolo}` }));
      const r = await fn<{ nota: string }>("percorso", "", { mode: "adatta", catalog });
      await app.reload();
      setNota(r.nota || "Percorso aggiornato.");
      onDone();
    } catch (e) {
      app.toast((e as Error).message);
      onDone();
    }
    setBusy("");
  };

  const close = () => {
    setNota(null);
    setD({});
    setM({});
    setFiles({});
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} eyebrow={monthly ? `Settimana ${week} · controllo mensile` : `Settimana ${week}`} title="Il controllo della settimana" full>
      {nota ? (
        <div className="pb-8 space-y-5">
          <div className="rounded-[20px] bg-hero text-herofg p-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Alfred ha ripreso le misure</div>
            <p className="mt-3 text-[15.5px] leading-relaxed">{nota}</p>
          </div>
          <button onClick={close} className="w-full h-12 rounded-full bg-brand text-brand-fg font-semibold">
            Vedi le prossime settimane
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          <p className="text-[14px] text-muted leading-relaxed">Cinque minuti, risposte oneste. In base a queste il percorso viene ritagliato sulle prossime settimane: più leggero se la vita ha preso il sopravvento, più esigente se stai volando.</p>
          <Q label="Com'è andata questa settimana sul percorso?">
            <Scale value={d.andamento} onChange={(n) => set({ andamento: n })} min="Male" max="Benissimo" />
          </Q>
          <Q label="Energia">
            <Scale value={d.energia} onChange={(n) => set({ energia: n })} min="A terra" max="Al massimo" />
          </Q>
          <Q label="Sonno">
            <Scale value={d.sonno} onChange={(n) => set({ sonno: n })} min="Pessimo" max="Ottimo" />
          </Q>
          <Q label="Il carico del percorso è stato…">
            <Opts opts={["Troppo", "Giusto", "Poco, posso fare di più"]} value={d.tempo} onChange={(s) => set({ tempo: s })} />
          </Q>
          <Q label="E gli allenamenti?">
            <Opts opts={["Troppo pesanti", "Giusti", "Troppo leggeri", "Ho avuto dolori", "Non sono riuscito ad allenarmi"]} value={d.allenamento} onChange={(s) => set({ allenamento: s })} />
          </Q>
          <Q label="Cosa ha funzionato?">
            <textarea value={d.funzionato || ""} onChange={(e) => set({ funzionato: e.target.value })} className={area} placeholder="Es. la camminata dopo pranzo, preparare i vestiti la sera…" />
          </Q>
          <Q label="Cosa non ha funzionato, e perché?">
            <textarea value={d.non_funzionato || ""} onChange={(e) => set({ non_funzionato: e.target.value })} className={area} placeholder="Es. la lettura la sera: crollo dal sonno" />
          </Q>
          <Q label={monthly ? "Peso e misure" : "Peso (facoltativo)"} hint={monthly ? "Stesse condizioni del punto di partenza." : undefined}>
            {monthly ? (
              <MeasuresInput value={m} onChange={setM} />
            ) : (
              <input inputMode="decimal" value={m.peso || ""} onChange={(e) => setM({ peso: e.target.value.replace(",", ".") })} className="w-40 h-11 px-3 rounded-[12px] bg-card text-[16px] outline-none" placeholder="kg" />
            )}
          </Q>
          {monthly && (
            <>
              <Q label="Le foto del mese">
                <PhotosInput files={files} onChange={setFiles} />
              </Q>
              <Q label="Autovalutazione dei pilastri" hint="Da confrontare con il punto di partenza.">
                <PillarsInput value={d.pilastri || {}} onChange={(v) => set({ pilastri: v })} />
              </Q>
            </>
          )}
          <button onClick={save} disabled={!ready || !!busy} className="w-full h-12 rounded-full bg-brand text-brand-fg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy === "salvo" ? "Salvo…" : busy === "adatto" ? "Adatto il percorso…" : "Salva e adatta il percorso"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* prova sul campo                                                     */
/* ------------------------------------------------------------------ */
export function TrialSheet({ trial, onClose, onDone }: { trial: Trial | null; onClose: () => void; onDone: () => void }) {
  const app = useApp();
  const [crit, setCrit] = useState<Set<number>>(new Set());
  const [voto, setVoto] = useState<number>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setCrit(new Set());
    setVoto(undefined);
    setNote("");
  }, [trial?.id]);
  const save = async () => {
    if (!trial) return;
    setBusy(true);
    const met = trial.criteri.filter((_, i) => crit.has(i));
    await supabase.from("field_trials").upsert({ key: trial.id, voto, note: [note, met.length ? `Criteri rispettati: ${met.join("; ")}` : ""].filter(Boolean).join("\n") });
    setBusy(false);
    app.toast("Prova registrata");
    onDone();
    onClose();
  };
  return (
    <Sheet open={!!trial} onClose={onClose} eyebrow={trial ? `Prova sul campo · settimana ${trial.settimana}` : ""} title={trial?.titolo}>
      {trial && (
        <div className="space-y-5 pb-6">
          <p className="text-[14.5px] leading-relaxed">{trial.dettaglio}</p>
          <div className="text-[13px] text-muted">L'app non può vederti: questa si fa nel mondo reale. Quando l'hai fatta, valutati con onestà.</div>
          {trial.criteri.length > 0 && (
            <Q label="Cosa ti è riuscito">
              <div className="space-y-1.5">
                {trial.criteri.map((c, i) => {
                  const on = crit.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const n = new Set(crit);
                        if (on) n.delete(i);
                        else n.add(i);
                        setCrit(n);
                      }}
                      className="w-full flex items-start gap-3 py-1.5 text-left"
                    >
                      <span className={`mt-0.5 h-6 w-6 rounded-full border grid place-items-center shrink-0 ${on ? "bg-gold border-gold text-ongold" : "border-line"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                      <span className="text-[14.5px]">{c}</span>
                    </button>
                  );
                })}
              </div>
            </Q>
          )}
          <Q label="Voto complessivo">
            <Scale value={voto} onChange={setVoto} min="Da rifare" max="Impeccabile" />
          </Q>
          <Q label="Note per la prossima volta">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className={area} />
          </Q>
          <button onClick={save} disabled={!voto || busy} className="w-full h-12 rounded-full bg-brand text-brand-fg font-semibold disabled:opacity-50">
            Registra la prova
          </button>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* schermata Progressi                                                 */
/* ------------------------------------------------------------------ */
function PhotoImg({ path }: { path: string }) {
  const url = useSignedUrl("progress", path);
  return url ? <img src={url} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-card" />;
}

const H = ({ children, icon }: { children: ReactNode; icon?: ReactNode }) => (
  <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2 mt-8 mb-3">
    {icon || <span className="h-1.5 w-1.5 rounded-full bg-gold" />} {children}
  </h2>
);

export function ProgressScreen() {
  const app = useApp();
  const path = (app.profile?.path as Path | null) ?? null;
  const { reviews, entries, photos, trials, loaded, reload } = useProgressData();
  const [baseOpen, setBaseOpen] = useState(false);
  const [revWeek, setRevWeek] = useState<number | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [m, setM] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<{ created_at: string; punteggio: number | null; intercalari: number | null }[]>([]);
  const [habitRate, setHabitRate] = useState<{ week: number; pct: number }[]>([]);
  const week = currentWeek(app.profile?.path_started_at);

  useEffect(() => {
    supabase
      .from("language_logs")
      .select("created_at, punteggio, intercalari")
      .order("created_at")
      .then(({ data }) => setLang(data || []));
  }, []);
  useEffect(() => {
    const start = app.profile?.path_started_at;
    if (!path || !start) return;
    supabase
      .from("path_checks")
      .select("key, day")
      .like("key", "h:%")
      .gte("day", start)
      .then(({ data }) => {
        const out: { week: number; pct: number }[] = [];
        for (let w = 1; w <= week; w++) {
          const from = new Date(Date.parse(start + "T00:00:00") + (w - 1) * 7 * 86400000);
          const to = new Date(from.getTime() + 7 * 86400000);
          const n = (data || []).filter((r) => {
            const t = Date.parse(r.day + "T00:00:00");
            return t >= from.getTime() && t < to.getTime();
          }).length;
          const possible = path.abitudini.filter((h) => (h.dalla_settimana || 1) <= w).length * Math.min(7, Math.max(1, Math.floor((Date.now() - from.getTime()) / 86400000) + 1));
          out.push({ week: w, pct: possible ? Math.round((n / possible) * 100) : 0 });
        }
        setHabitRate(out);
      });
  }, [path, app.profile?.path_started_at, week]);

  const base = reviews.find((r) => r.week === 0);
  const lastPill = [...reviews].reverse().find((r) => r.week > 0 && r.data.pilastri && Object.keys(r.data.pilastri).length);
  const measures = useMemo(() => {
    return MISURE.map((mm) => {
      const rows = entries.filter((e) => e.metric === mm.id);
      return { ...mm, first: rows[0], last: rows.length > 1 ? rows[rows.length - 1] : undefined };
    }).filter((x) => x.first);
  }, [entries]);
  const byAngle = ANGOLI.map((a) => {
    const ps = photos.filter((p) => p.angolo === a);
    return { a, first: ps[0], last: ps.length > 1 ? ps[ps.length - 1] : undefined };
  }).filter((x) => x.first);
  const langScored = lang.filter((l) => l.punteggio != null);

  if (!path)
    return (
      <div className="px-5 lg:px-10 pb-28">
        <h1 className="font-display text-[36px] font-semibold">Progressi</h1>
        <p className="text-muted mt-2">Completa prima il questionario e il tuo percorso: i progressi si misurano da lì.</p>
      </div>
    );

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[920px]">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Settimana {week} di 12</div>
      <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none mt-1">I tuoi progressi</h1>
      <p className="text-[14.5px] text-muted mt-2">Il confronto onesto tra chi eri al punto di partenza e chi sei oggi.</p>

      {loaded && !base && (
        <button onClick={() => setBaseOpen(true)} className="mt-5 w-full text-left rounded-[22px] bg-hero text-herofg p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Da fare per primo</div>
          <div className="font-display text-[26px] font-semibold mt-1">Prendi le misure di partenza</div>
          <div className="text-[14px] opacity-80 mt-1">Misure, tre foto, autovalutazione e un minuto di registrazione. Senza punto di partenza non si misura nulla.</div>
        </button>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setRevWeek(week)} className="h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold flex items-center gap-1.5">
          <ClipboardCheck size={15} /> {reviews.some((r) => r.week === week) ? "Rifai il controllo della settimana" : "Controllo della settimana"}
        </button>
        <button onClick={() => setMeasureOpen(true)} className="h-10 px-4 rounded-full bg-card text-[13.5px] font-semibold flex items-center gap-1.5">
          <Ruler size={15} /> Nuove misure
        </button>
        {base && (
          <button onClick={() => setBaseOpen(true)} className="h-10 px-4 rounded-full bg-card text-[13.5px] font-semibold">
            Rifai il punto di partenza
          </button>
        )}
      </div>

      {/* Pilastri */}
      {base?.data.pilastri && (
        <>
          <H>I sette pilastri · partenza e oggi</H>
          <div className="rounded-[22px] bg-surface shadow-soft p-5 space-y-3">
            {PILLARS.map((p) => {
              const a = base.data.pilastri?.[p.id] || 0;
              const b = lastPill?.data.pilastri?.[p.id];
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-[13.5px]">
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-muted">
                      {a}
                      {b != null && (
                        <>
                          {" → "}
                          <b className={b > a ? "text-gold" : b < a ? "text-danger" : ""}>{b}</b>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-card relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-line rounded-full" style={{ width: `${(a / 5) * 100}%` }} />
                    {b != null && <div className="absolute inset-y-0 left-0 bg-gold rounded-full opacity-90" style={{ width: `${(b / 5) * 100}%` }} />}
                  </div>
                </div>
              );
            })}
            {!lastPill && <div className="text-[12.5px] text-muted">Il confronto compare dopo il controllo mensile (settimane 4, 8 e 12).</div>}
          </div>
        </>
      )}

      {/* Costanza */}
      {habitRate.length > 0 && (
        <>
          <H>Costanza nelle abitudini</H>
          <div className="rounded-[22px] bg-surface shadow-soft p-5">
            <div className="flex items-end gap-1.5 h-28">
              {habitRate.map((h) => (
                <div key={h.week} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10.5px] text-muted">{h.pct}%</div>
                  <div className="w-full rounded-t-[6px] bg-gold" style={{ height: `${Math.max(4, h.pct * 0.8)}px` }} />
                  <div className="text-[10.5px] text-muted">S{h.week}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Misure */}
      {measures.length > 0 && (
        <>
          <H icon={<Ruler size={13} className="text-gold" />}>Peso e misure</H>
          <div className="rounded-[22px] bg-surface shadow-soft divide-y divide-line">
            {measures.map((x) => {
              const d = x.last ? +(x.last.value - x.first!.value).toFixed(1) : null;
              return (
                <div key={x.id} className="px-5 py-3 flex items-center gap-3 text-[14px]">
                  <span className="flex-1 font-medium">{x.nome}</span>
                  <span className="text-muted">
                    {x.first!.value} {x.unita}
                  </span>
                  {x.last && (
                    <>
                      <span className="text-muted">→</span>
                      <span className="font-semibold">
                        {x.last.value} {x.unita}
                      </span>
                      <span className={`w-14 text-right text-[12.5px] ${d === 0 ? "text-muted" : "text-gold"}`}>
                        {d! > 0 ? "+" : ""}
                        {d}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Foto */}
      {byAngle.length > 0 && (
        <>
          <H icon={<Camera size={13} className="text-gold" />}>Foto · prima e adesso</H>
          <div className="grid gap-3 sm:grid-cols-3">
            {byAngle.map((x) => (
              <div key={x.a} className="rounded-[18px] bg-surface shadow-soft p-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="aspect-[3/4] rounded-[12px] overflow-hidden">
                    <PhotoImg path={x.first!.path} />
                  </div>
                  <div className="aspect-[3/4] rounded-[12px] overflow-hidden grid place-items-center bg-card text-[11px] text-muted text-center p-2">{x.last ? <PhotoImg path={x.last.path} /> : "Al controllo della settimana 4"}</div>
                </div>
                <div className="text-[12px] text-muted mt-1.5 px-1 capitalize">
                  {x.a} · {new Date(x.first!.day).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  {x.last ? ` → ${new Date(x.last.day).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Linguaggio */}
      {langScored.length > 0 && (
        <>
          <H>Linguaggio</H>
          <div className="rounded-[22px] bg-surface shadow-soft p-5 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] text-muted">Prima analisi</div>
              <div className="font-display text-[34px] font-semibold">{langScored[0].punteggio}</div>
              <div className="text-[12.5px] text-muted">{langScored[0].intercalari ?? 0} intercalari</div>
            </div>
            <div>
              <div className="text-[12px] text-muted">Media ultime 3</div>
              <div className="font-display text-[34px] font-semibold text-gold">{Math.round(langScored.slice(-3).reduce((s, l) => s + (l.punteggio || 0), 0) / Math.min(3, langScored.length))}</div>
              <div className="text-[12.5px] text-muted">{Math.round(langScored.slice(-3).reduce((s, l) => s + (l.intercalari || 0), 0) / Math.min(3, langScored.length))} intercalari in media</div>
            </div>
          </div>
        </>
      )}

      {/* Prove sul campo */}
      {(path.prove || []).length > 0 && (
        <>
          <H icon={<Trophy size={13} className="text-gold" />}>Prove sul campo</H>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {(path.prove || []).map((t) => {
              const done = trials.find((x) => x.key === t.id);
              const open = t.settimana <= week;
              return (
                <button key={t.id} onClick={() => open && setTrial(t)} className={`text-left rounded-[18px] p-4 transition ${done ? "bg-gold-tint border border-gold/40" : "bg-surface shadow-soft"} ${open ? "" : "opacity-60"}`}>
                  <div className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">
                    Settimana {t.settimana} · {PNAME[t.pilastro]}
                  </div>
                  <div className="text-[15px] font-semibold leading-snug mt-1">{t.titolo}</div>
                  <div className="text-[12.5px] text-muted mt-1.5">{done ? `Fatta · voto ${done.voto}/5` : open ? "Da fare" : "Si sblocca più avanti"}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Diario del maestro */}
      {(path.adattamenti || []).length > 0 && (
        <>
          <H icon={<Sparkles size={13} className="text-gold" />}>Il diario di Alfred</H>
          <div className="space-y-2.5">
            {[...(path.adattamenti || [])].reverse().map((a) => (
              <div key={a.data} className="rounded-[18px] bg-surface shadow-soft p-4">
                <div className="text-[11px] text-muted">Dopo la settimana {a.settimana}</div>
                <div className="text-[14px] leading-relaxed mt-1">{a.nota}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <BaselineSheet open={baseOpen} onClose={() => setBaseOpen(false)} onDone={reload} />
      <ReviewSheet open={revWeek != null} week={revWeek || week} onClose={() => setRevWeek(null)} onDone={reload} />
      <TrialSheet trial={trial} onClose={() => setTrial(null)} onDone={reload} />
      <Sheet open={measureOpen} onClose={() => setMeasureOpen(false)} title="Nuove misure">
        <div className="space-y-4 pb-6">
          <MeasuresInput value={m} onChange={setM} />
          <button
            onClick={async () => {
              await saveMeasuresAndPhotos(app.uid, m, {});
              setM({});
              setMeasureOpen(false);
              reload();
              app.toast("Misure salvate");
            }}
            className="w-full h-12 rounded-full bg-brand text-brand-fg font-semibold"
          >
            Salva
          </button>
        </div>
      </Sheet>
    </div>
  );
}
