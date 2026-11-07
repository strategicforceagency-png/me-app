import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { allLessons, lessonKey } from "../academy/content";
import { useApp } from "../lib/store";
import { fn, supabase } from "../lib/supabase";
import { ALL_QUESTIONS, Answers, SEZIONI } from "./questions";

const DRAFT = "habitus-questionario";
const loadDraft = (): Answers => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT) || "{}");
  } catch {
    return {};
  }
};
const saveDraft = (a: Answers) => {
  try {
    localStorage.setItem(DRAFT, JSON.stringify(a));
  } catch {
    /* ok */
  }
};

const BUILDING = [
  "Leggo le tue risposte…",
  "Valuto i sette pilastri…",
  "Scelgo il tuo archetipo…",
  "Preparo la scheda di allenamento…",
  "Scrivo le missioni delle 12 settimane…",
  "Ultimi ritocchi, come dal sarto…",
];

export function Questionnaire({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const app = useApp();
  const [answers, setAnswers] = useState<Answers>(() => {
    const d = loadDraft();
    if (app.profile?.altezza && d.altezza == null) d.altezza = app.profile.altezza;
    if (app.profile?.peso && d.peso == null) d.peso = app.profile.peso;
    return d;
  });
  const [i, setI] = useState(-1); // -1 = intro
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState<"quiz" | "building" | "error">("quiz");
  const [msg, setMsg] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => saveDraft(answers), [answers]);
  useEffect(() => {
    if (phase !== "building") return;
    const t = window.setInterval(() => setMsg((m) => Math.min(m + 1, BUILDING.length - 1)), 6000);
    return () => window.clearInterval(t);
  }, [phase]);

  const q = i >= 0 ? ALL_QUESTIONS[i] : null;
  const total = ALL_QUESTIONS.length;
  const val = q ? answers[q.id] : undefined;
  const sectionIdx = q ? SEZIONI.findIndex((s) => s.id === q.sezione.id) : -1;
  const firstOfSection = q ? ALL_QUESTIONS.findIndex((x) => x.sezione.id === q.sezione.id) === i : false;

  const valid = useMemo(() => {
    if (!q) return true;
    if (q.tipo === "multi") return Array.isArray(val) && val.length > 0;
    if (q.tipo === "text") return !!q.facoltativa || (typeof val === "string" && val.trim().length > 2);
    if (q.tipo === "number") return typeof val === "number" || q.predefinito != null;
    return val != null && val !== "";
  }, [q, val]);

  const go = (d: number) => {
    setDir(d);
    setI((x) => Math.max(-1, Math.min(total - 1, x + d)));
  };
  const set = (v: string | string[] | number, auto = false) => {
    setAnswers((a) => ({ ...a, [q!.id]: v }));
    if (auto) window.setTimeout(() => (i < total - 1 ? go(1) : submit({ ...answers, [q!.id]: v })), 220);
  };

  const submit = async (final: Answers = answers) => {
    // completa i numeri non toccati con il valore predefinito
    const a: Answers = { ...final };
    for (const x of ALL_QUESTIONS) if (x.tipo === "number" && a[x.id] == null) a[x.id] = x.predefinito;
    setPhase("building");
    setMsg(0);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ gentleman: a, altezza: Number(a.altezza) || null, peso: Number(a.peso) || null })
        .eq("id", app.uid);
      if (error) throw error;
      const catalog = allLessons.map(({ course, lesson }) => ({ id: lessonKey(course, lesson), titolo: `${course.titolo} – ${lesson.titolo}` }));
      await fn("percorso", "", { catalog });
      try {
        localStorage.removeItem(DRAFT);
      } catch {
        /* ok */
      }
      await app.reload();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setPhase("error");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-bg flex flex-col">
      {/* barra superiore */}
      <div className="px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-3 flex items-center gap-3 max-w-[640px] w-full mx-auto">
        {phase === "quiz" && i >= 0 ? (
          <button onClick={() => go(-1)} className="h-9 w-9 grid place-items-center -ml-2 text-muted" aria-label="Indietro">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <span className="w-7" />
        )}
        <div className="flex-1">
          {phase === "quiz" && i >= 0 && (
            <>
              <div className="flex gap-1">
                {SEZIONI.map((s, k) => (
                  <div key={s.id} className="h-1 flex-1 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{
                        width: k < sectionIdx ? "100%" : k > sectionIdx ? "0%" : `${((i - ALL_QUESTIONS.findIndex((x) => x.sezione.id === s.id) + 1) / s.domande.length) * 100}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-gold font-bold mt-2">{q!.sezione.titolo}</div>
            </>
          )}
        </div>
        {phase !== "building" && (
          <button onClick={onClose} className="h-9 w-9 grid place-items-center -mr-2 text-muted" aria-label="Chiudi">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-6 pb-10 min-h-full flex flex-col">
          <AnimatePresence mode="wait" custom={dir}>
            {phase === "building" ? (
              <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-20">
                <div className="relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full border border-gold/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
                  <img src="./habitus.svg?v=3" className="absolute inset-4 rounded-[14px]" />
                </div>
                <div>
                  <div className="font-display text-[30px] font-semibold leading-tight">Sto costruendo il tuo percorso</div>
                  <AnimatePresence mode="wait">
                    <motion.p key={msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-muted mt-2">
                      {BUILDING[msg]}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <p className="text-[12px] text-muted">Ci vuole circa un minuto.</p>
              </motion.div>
            ) : phase === "error" ? (
              <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-20">
                <div className="font-display text-[28px] font-semibold">Qualcosa non è andato</div>
                <p className="text-muted">{err}</p>
                <p className="text-[13px] text-muted">Le tue risposte sono salvate.</p>
                <button onClick={() => submit()} className="h-12 px-6 rounded-full bg-brand text-brand-fg font-semibold shadow-pill">
                  Riprova
                </button>
              </motion.div>
            ) : i < 0 ? (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center py-10">
                <img src="./habitus.svg?v=3" className="h-14 w-14 rounded-[16px] ring-1 ring-gold/30" />
                <div className="text-[11px] uppercase tracking-[0.16em] text-gold font-bold mt-8">Accademia Habitus</div>
                <h1 className="font-display text-[42px] font-semibold leading-[1.03] mt-2">Prima di cominciare, conosciamoci.</h1>
                <p className="text-[16px] text-muted mt-4 leading-relaxed">
                  {total} domande, circa 8 minuti. Servono a capire chi sei oggi per costruire il tuo percorso da gentleman: stile, portamento, linguaggio, fisico, salute, grooming e cultura.
                </p>
                <ul className="mt-6 space-y-2 text-[14.5px]">
                  {SEZIONI.map((s) => (
                    <li key={s.id} className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                      {s.titolo}
                    </li>
                  ))}
                </ul>
                <button onClick={() => go(1)} className="mt-10 h-13 py-3.5 px-6 rounded-full bg-brand text-brand-fg font-semibold shadow-pill flex items-center justify-center gap-2 self-start">
                  {Object.keys(answers).length > 2 ? "Riprendi" : "Iniziamo"} <ArrowRight size={18} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={q!.id}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -dir * 40 }}
                transition={{ duration: 0.22 }}
                className="flex-1 flex flex-col pt-6"
              >
                {firstOfSection && <p className="text-[14px] text-muted italic mb-3">{q!.sezione.intro}</p>}
                <h2 className="font-display text-[30px] sm:text-[34px] font-semibold leading-[1.1]">{q!.domanda}</h2>
                {q!.aiuto && <p className="text-[14px] text-muted mt-2">{q!.aiuto}</p>}

                <div className="mt-7">
                  {q!.tipo === "single" && (
                    <div className="space-y-2.5">
                      {q!.opzioni.map((o) => (
                        <button
                          key={o}
                          onClick={() => set(o, true)}
                          className={`w-full text-left px-4 py-3.5 rounded-[16px] border text-[15.5px] transition flex items-center justify-between ${val === o ? "border-gold bg-gold-tint font-semibold" : "border-line bg-surface"}`}
                        >
                          {o}
                          {val === o && <Check size={18} className="text-gold" />}
                        </button>
                      ))}
                    </div>
                  )}
                  {q!.tipo === "multi" && (
                    <div className="space-y-2.5">
                      {q!.opzioni.map((o) => {
                        const arr = (Array.isArray(val) ? val : []) as string[];
                        const on = arr.includes(o);
                        const none = /^Nessuna/.test(o);
                        const full = q!.tipo === "multi" && q!.max != null && arr.length >= q!.max && !on;
                        return (
                          <button
                            key={o}
                            disabled={full}
                            onClick={() => {
                              let next = on ? arr.filter((x) => x !== o) : [...arr, o];
                              if (!on && none) next = [o];
                              else if (!on) next = next.filter((x) => !/^Nessuna/.test(x));
                              set(next);
                            }}
                            className={`w-full text-left px-4 py-3.5 rounded-[16px] border text-[15.5px] transition flex items-center gap-3 disabled:opacity-40 ${on ? "border-gold bg-gold-tint font-semibold" : "border-line bg-surface"}`}
                          >
                            <span className={`h-5 w-5 rounded-[6px] border grid place-items-center shrink-0 ${on ? "bg-gold border-gold text-ongold" : "border-line"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {q!.tipo === "scale" && (
                    <div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => set(n, true)} className={`h-16 rounded-[16px] border text-[22px] font-display font-semibold transition ${val === n ? "border-gold bg-gold text-ongold" : "border-line bg-surface"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[12.5px] text-muted mt-2">
                        <span>{q!.min}</span>
                        <span>{q!.max}</span>
                      </div>
                    </div>
                  )}
                  {q!.tipo === "number" && (
                    <div className="text-center py-6">
                      <div className="font-display text-[64px] font-semibold leading-none">
                        {typeof val === "number" ? val : q!.predefinito}
                        <span className="text-[24px] text-muted ml-1">{q!.unita}</span>
                      </div>
                      <input
                        type="range"
                        min={q!.minimo}
                        max={q!.massimo}
                        value={typeof val === "number" ? val : q!.predefinito}
                        onChange={(e) => set(+e.target.value)}
                        className="range mt-8"
                        style={{ ["--p" as string]: `${(((typeof val === "number" ? val : q!.predefinito) - q!.minimo) / (q!.massimo - q!.minimo)) * 100}%` }}
                      />
                    </div>
                  )}
                  {q!.tipo === "text" && (
                    <textarea
                      autoFocus
                      value={typeof val === "string" ? val : ""}
                      onChange={(e) => set(e.target.value)}
                      placeholder={q!.placeholder}
                      className="w-full h-36 px-4 py-3.5 rounded-[16px] bg-surface border border-line focus:border-gold outline-none text-[16px] resize-none"
                    />
                  )}
                </div>

                {q!.tipo !== "single" && q!.tipo !== "scale" && (
                  <div className="mt-8 flex items-center gap-3">
                    <button
                      disabled={!valid}
                      onClick={() => (i < total - 1 ? go(1) : submit())}
                      className="h-12 px-6 rounded-full bg-brand text-brand-fg font-semibold shadow-pill flex items-center gap-2 disabled:opacity-40 disabled:shadow-none"
                    >
                      {i < total - 1 ? "Avanti" : "Costruisci il mio percorso"} <ArrowRight size={18} />
                    </button>
                    {q!.tipo === "text" && q!.facoltativa && !val && (
                      <button onClick={() => go(1)} className="text-muted text-[14px]">
                        Salta
                      </button>
                    )}
                  </div>
                )}
                <div className="mt-auto pt-10 text-[12px] text-muted">
                  Domanda {i + 1} di {total}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
