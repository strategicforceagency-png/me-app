import { CourseNotes } from "./Contents";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock, Feather, Footprints, GraduationCap, Lightbulb, Loader2, Scissors, Send, Shirt, Sparkles, Umbrella, Watch, X } from "lucide-react";
import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Figure } from "../academy/figures";
import { allLessons, CORSI, lessonKey } from "../academy/content";
import type { Block, Course, Lesson } from "../academy/types";
import { useApp } from "../lib/store";
import { fn, supabase } from "../lib/supabase";

/* ---------------- icone corsi ---------------- */
function TieIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M9.5 3h5l-1.2 3.2h-2.6z" />
      <path d="M10.7 6.2 8.5 17.5 12 21l3.5-3.5-2.2-11.3" />
    </svg>
  );
}
const ICONS: Record<string, (p: { size?: number }) => JSX.Element> = {
  shirt: (p) => <Shirt size={p.size} strokeWidth={1.8} />,
  sparkles: (p) => <Sparkles size={p.size} strokeWidth={1.8} />,
  tie: (p) => <TieIcon size={p.size} />,
  scissors: (p) => <Scissors size={p.size} strokeWidth={1.8} />,
  footprints: (p) => <Footprints size={p.size} strokeWidth={1.8} />,
  watch: (p) => <Watch size={p.size} strokeWidth={1.8} />,
  umbrella: (p) => <Umbrella size={p.size} strokeWidth={1.8} />,
  feather: (p) => <Feather size={p.size} strokeWidth={1.8} />,
};

/* ---------------- testo con **grassetto** ed elenchi ---------------- */
function inline(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((s, i) => (s.startsWith("**") && s.endsWith("**") ? <b key={i}>{s.slice(2, -2)}</b> : <Fragment key={i}>{s}</Fragment>));
}
export function RichText({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list;
    out.push(
      L.ordered ? (
        <ol key={out.length} className="list-decimal pl-5 space-y-1">
          {L.items.map((x, i) => <li key={i}>{inline(x)}</li>)}
        </ol>
      ) : (
        <ul key={out.length} className="list-disc pl-5 space-y-1">
          {L.items.map((x, i) => <li key={i}>{inline(x)}</li>)}
        </ul>
      ),
    );
    list = null;
  };
  for (const l of lines) {
    const ul = l.match(/^[-*•]\s+(.*)/);
    const ol = l.match(/^\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul || ol)![1]);
    } else {
      flush();
      out.push(<p key={out.length}>{inline(l.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <div className="space-y-2">{out}</div>;
}

/* ---------------- schermata ---------------- */
type View = { c?: string; l?: string };

export function AcademyScreen() {
  const app = useApp();
  const [view, setView] = useState<View>(() => {
    const [c, l] = (app?.lessonTarget || "").split("/");
    return c ? { c, l } : {};
  });
  useEffect(() => {
    if (!app?.lessonTarget) return;
    const [c, l] = app.lessonTarget.split("/");
    setView({ c, l });
    app.clearLessonTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.lessonTarget]);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("academy_progress")
      .select("lesson_id")
      .then(({ data }) => setDone(new Set((data || []).map((d) => d.lesson_id as string))));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view.c, view.l]);

  const toggleDone = async (key: string) => {
    const on = !done.has(key);
    setDone((s) => {
      const n = new Set(s);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
    if (on) {
      await supabase.from("academy_progress").upsert({ user_id: app.uid, lesson_id: key });
      navigator.vibrate?.(10);
    } else await supabase.from("academy_progress").delete().eq("lesson_id", key);
  };

  const course = CORSI.find((c) => c.id === view.c);
  const lesson = course?.lezioni.find((l) => l.id === view.l);

  if (course && lesson)
    return <LessonView course={course} lesson={lesson} done={done.has(lessonKey(course, lesson))} onToggle={() => toggleDone(lessonKey(course, lesson))} go={setView} doneSet={done} />;
  if (course) return <CourseView course={course} done={done} go={setView} />;
  return <AcademyHome done={done} go={setView} />;
}

function AcademyHome({ done, go }: { done: Set<string>; go: (v: View) => void }) {
  const total = allLessons.length;
  const n = allLessons.filter(({ course, lesson }) => done.has(lessonKey(course, lesson))).length;
  const next = allLessons.find(({ course, lesson }) => !done.has(lessonKey(course, lesson)));
  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12">
      <header>
        <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Accademia</h1>
        <p className="text-muted text-[14px] mt-2">Stile, galateo, linguaggio, grooming e accessori: le regole del gentleman, una lezione alla volta.</p>
      </header>

      <div className="mt-6 rounded-[22px] bg-hero text-herofg p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-full border border-gold/40 grid place-items-center text-gold shrink-0">
            <GraduationCap size={26} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Il tuo percorso</div>
            <div className="font-display text-[24px] font-semibold leading-tight">
              {n} di {total} lezioni
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-gold rounded-full" initial={{ width: 0 }} animate={{ width: `${(n / total) * 100}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        </div>
        {next && (
          <button onClick={() => go({ c: next.course.id, l: next.lesson.id })} className="relative mt-4 w-full rounded-[16px] bg-white/5 border border-white/10 p-3.5 flex items-center gap-3 text-left">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.12em] opacity-60">{n ? "Continua" : "Inizia da qui"} · {next.course.titolo}</div>
              <div className="text-[15px] font-semibold truncate">{next.lesson.titolo}</div>
            </div>
            <span className="h-9 w-9 rounded-full bg-gold text-ongold grid place-items-center shrink-0">
              <ArrowRight size={17} />
            </span>
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CORSI.map((c) => {
          const k = c.lezioni.filter((l) => done.has(lessonKey(c, l))).length;
          const Icon = ICONS[c.icona];
          return (
            <button key={c.id} onClick={() => go({ c: c.id })} className="text-left rounded-[20px] bg-surface shadow-soft p-5 active:scale-[.99] transition">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-[14px] bg-gold-tint text-gold grid place-items-center shrink-0">
                  <Icon size={21} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-semibold leading-tight">{c.titolo}</div>
                  <div className="text-[12.5px] text-muted mt-1 leading-snug">{c.sottotitolo}</div>
                </div>
                {k === c.lezioni.length && <CheckCircle2 size={20} className="text-gold shrink-0" />}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${(k / c.lezioni.length) * 100}%` }} />
                </div>
                <span className="text-[11.5px] text-muted">
                  {k}/{c.lezioni.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CourseView({ course, done, go }: { course: Course; done: Set<string>; go: (v: View) => void }) {
  const Icon = ICONS[course.icona];
  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[820px]">
      <button onClick={() => go({})} className="flex items-center gap-1.5 text-[14px] text-muted mb-4">
        <ArrowLeft size={16} /> Accademia
      </button>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-[14px] bg-gold-tint text-gold grid place-items-center">
          <Icon size={23} />
        </div>
        <div>
          <h1 className="font-display text-[32px] lg:text-[40px] font-semibold leading-none">{course.titolo}</h1>
          <p className="text-muted text-[13.5px] mt-1.5">{course.sottotitolo}</p>
        </div>
      </div>
      <div className="mt-6 rounded-[20px] bg-surface shadow-soft divide-y divide-line">
        {course.lezioni.map((l, i) => {
          const ok = done.has(lessonKey(course, l));
          return (
            <button key={l.id} onClick={() => go({ c: course.id, l: l.id })} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left">
              <span className={`h-8 w-8 rounded-full grid place-items-center text-[13px] font-semibold shrink-0 ${ok ? "bg-gold text-ongold" : "bg-card text-muted"}`}>
                {ok ? <Check size={16} strokeWidth={2.5} /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold">{l.titolo}</div>
                <div className="text-[12.5px] text-muted line-clamp-1">{l.intro}</div>
              </div>
              <span className="text-[11.5px] text-muted flex items-center gap-1 shrink-0">
                <Clock size={12} /> {l.minuti}'
              </span>
              <ChevronRight size={17} className="text-muted shrink-0" />
            </button>
          );
        })}
      </div>
      <CourseNotes corso={course.id} />
    </div>
  );
}

/* ---------------- lettore lezione ---------------- */
function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "p":
      return <p className="text-[15px] leading-relaxed">{inline(b.text)}</p>;
    case "h":
      return <h3 className="font-display text-[24px] font-semibold pt-2">{b.text}</h3>;
    case "list":
      return (
        <ul className="space-y-2">
          {b.items.map((x, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
              <span>{inline(x)}</span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="space-y-3">
          {b.items.map((s, i) => (
            <li key={i} className={`rounded-[18px] bg-surface shadow-soft p-4 ${s.fig ? "grid grid-cols-[1fr_136px] sm:grid-cols-[1fr_170px] gap-3 items-center" : ""}`}>
              <div className="flex gap-3">
                <span className="h-7 w-7 rounded-full bg-ink text-bg grid place-items-center text-[13px] font-bold shrink-0">{i + 1}</span>
                <div>
                  {s.titolo && <div className="text-[15px] font-semibold">{s.titolo}</div>}
                  <div className="text-[14.5px] leading-relaxed text-ink/90">{inline(s.text)}</div>
                </div>
              </div>
              {s.fig && (
                <div className="rounded-[12px] bg-card p-1">
                  <Figure k={s.fig.k} p={s.fig.p} />
                </div>
              )}
            </li>
          ))}
        </ol>
      );
    case "dodont":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] bg-gold-tint p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold mb-2">Sì</div>
            <ul className="space-y-1.5">
              {b.si.map((x) => (
                <li key={x} className="flex gap-2 text-[14px]">
                  <Check size={16} className="text-gold shrink-0 mt-0.5" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[18px] bg-card p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-2">No</div>
            <ul className="space-y-1.5">
              {b.no.map((x) => (
                <li key={x} className="flex gap-2 text-[14px] text-muted">
                  <X size={16} className="shrink-0 mt-0.5" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    case "table":
      return (
        <>
          {b.head.length > 2 && (
            <div className="sm:hidden space-y-2">
              {b.rows.map((r, i) => (
                <div key={i} className="rounded-[16px] bg-surface shadow-soft p-3.5">
                  <div className="text-[15px] font-semibold">{r[0]}</div>
                  {r.slice(1).map((c, j) => (
                    <div key={j} className="mt-1.5 text-[13.5px] leading-snug">
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-gold mr-1.5">{b.head[j + 1]}</span>
                      {c}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        <div className={`rounded-[18px] bg-surface shadow-soft overflow-x-auto ${b.head.length > 2 ? "hidden sm:block" : ""}`}>
          <table className={`w-full text-[13.5px] ${b.head.length > 2 ? "min-w-[480px]" : ""}`}>
            <thead>
              <tr className="text-left">
                {b.head.map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted border-b border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0 align-top">
                  {r.map((c, j) => (
                    <td key={j} className={`px-4 py-3 leading-snug ${j === 0 ? "font-semibold" : "text-ink/85"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      );
    case "tip":
      return (
        <div className="rounded-[18px] border border-gold/40 bg-gold-tint p-4 flex gap-3">
          <Lightbulb size={19} className="text-gold shrink-0 mt-0.5" />
          <p className="text-[14.5px] leading-relaxed">
            <b>Consiglio del maestro. </b>
            {inline(b.text)}
          </p>
        </div>
      );
    case "fig":
      return (
        <figure className="rounded-[20px] bg-surface shadow-soft p-4">
          <Figure k={b.fig.k} p={b.fig.p} />
          {b.fig.caption && <figcaption className="text-[12.5px] text-muted text-center mt-2">{b.fig.caption}</figcaption>}
        </figure>
      );
  }
}

function LessonView({ course, lesson, done, onToggle, go, doneSet }: { course: Course; lesson: Lesson; done: boolean; onToggle: () => void; go: (v: View) => void; doneSet: Set<string> }) {
  const idx = allLessons.findIndex((x) => x.course.id === course.id && x.lesson.id === lesson.id);
  const next = allLessons[idx + 1];
  const prev = allLessons[idx - 1];
  const pos = course.lezioni.findIndex((l) => l.id === lesson.id);
  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[820px]">
      <button onClick={() => go({ c: course.id })} className="flex items-center gap-1.5 text-[14px] text-muted mb-4">
        <ArrowLeft size={16} /> {course.titolo}
      </button>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
        Lezione {pos + 1} di {course.lezioni.length} · {lesson.minuti} minuti
      </div>
      <h1 className="font-display text-[34px] lg:text-[44px] font-semibold leading-[1.05] mt-1.5">{lesson.titolo}</h1>
      <p className="text-[16px] leading-relaxed text-muted mt-3">{lesson.intro}</p>

      <div className="mt-6 space-y-5">
        {lesson.blocks.map((b, i) => (
          <BlockView key={i} b={b} />
        ))}
      </div>

      {lesson.fonti && lesson.fonti.length > 0 && (
        <div className="mt-8 rounded-[16px] border border-line bg-surface p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold mb-2">Fonti verificate</div>
          <ul className="space-y-1.5">
            {lesson.fonti.map((f) => (
              <li key={f.url} className="text-[14px] leading-snug">
                <a href={f.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-gold">
                  {f.titolo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Maestro course={course} lesson={lesson} />

      <div className="mt-8 flex flex-col sm:flex-row gap-2">
        <button
          onClick={onToggle}
          className={`h-12 px-5 rounded-full font-semibold flex items-center justify-center gap-2 transition ${done ? "bg-gold-tint text-gold border border-gold/40" : "bg-brand text-brand-fg shadow-pill"}`}
        >
          {done ? <CheckCircle2 size={18} /> : <Check size={18} />} {done ? "Completata" : "Segna come completata"}
        </button>
        {next && (
          <button
            onClick={() => {
              if (!done) onToggle();
              go({ c: next.course.id, l: next.lesson.id });
            }}
            className="h-12 px-5 rounded-full bg-card font-semibold flex items-center justify-center gap-2 sm:ml-auto"
          >
            <span className="truncate max-w-[240px]">{next.lesson.titolo}</span> <ArrowRight size={17} />
          </button>
        )}
      </div>
      {prev && (
        <button onClick={() => go({ c: prev.course.id, l: prev.lesson.id })} className="mt-3 text-[13px] text-muted flex items-center gap-1.5">
          <ArrowLeft size={14} /> {prev.lesson.titolo}
          {doneSet.has(lessonKey(prev.course, prev.lesson)) && <Check size={13} className="text-gold" />}
        </button>
      )}
    </div>
  );
}

/* ---------------- chiedi al maestro ---------------- */
type Msg = { role: "user" | "model"; text: string };
const SUGGEST: Record<string, string[]> = {
  vestirsi: ["Cosa metto per un colloquio con quello che ho?", "Come capisco se una giacca mi sta bene in negozio?"],
  galateo: ["Chi paga se è lei a invitarmi?", "Come mi comporto a una cena di lavoro?"],
  cravatte: ["Che nodo per una camicia a collo francese?", "Pochette e cravatta: come le abbino?"],
  grooming: ["Come evito l'irritazione dopo la rasatura?", "Dove portarla al primo appuntamento?"],
  scarpe: ["Che scarpe con un abito grigio chiaro?", "Ogni quanto devo lucidare le scarpe?"],
  accessori: ["Che occhiali per il mio viso?", "Che orologio con lo smoking?"],
  inglese: ["Come creo un look da campagna inglese con quello che ho?", "Flanella o fresco di lana per il mio lavoro?"],
  vocabolario: ["Come smetto di dire \"cioè\"?", "Come rispondo a un complimento con eleganza?"],
};
function Maestro({ course, lesson }: { course: Course; lesson: Lesson }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMsgs([]);
    setQ("");
  }, [lesson.id]);
  useEffect(() => {
    if (msgs.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);
  const ctx = useMemo(() => ({ corso: course.titolo, lezione: lesson.titolo, intro: lesson.intro, contenuto: lesson.blocks }), [course, lesson]);
  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const r = await fn<{ answer: string }>("coach", "", { question, history, lesson: ctx });
      setMsgs((m) => [...m, { role: "model", text: r.answer }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "model", text: (e as Error).message }]);
    }
    setBusy(false);
  };
  return (
    <section className="mt-10 rounded-[22px] bg-hero text-herofg p-5 relative overflow-hidden">
      <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-gold" />
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Chiedi al maestro</div>
        </div>
        <p className="text-[13.5px] opacity-70 mt-1">Hai un dubbio su questa lezione o un caso concreto? Il maestro conosce anche il tuo armadio e il tuo stile.</p>

        {msgs.length > 0 && (
          <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={`rounded-[16px] px-3.5 py-2.5 text-[14px] leading-relaxed max-w-[92%] ${m.role === "user" ? "bg-gold text-ongold" : "bg-white/[.06] border border-white/10"}`}>
                  {m.role === "user" ? m.text : <RichText text={m.text} />}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-[13px] opacity-70">
                <Loader2 size={14} className="animate-spin" /> Il maestro sta rispondendo…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {!msgs.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(SUGGEST[course.id] || []).map((s) => (
              <button key={s} onClick={() => ask(s)} className="px-3 py-1.5 rounded-full border border-white/15 text-[12.5px] hover:border-gold hover:text-gold transition">
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="mt-4 flex items-center gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Scrivi la tua domanda…"
            className="flex-1 h-11 px-4 rounded-full bg-white/[.07] border border-white/10 text-[15px] placeholder:text-white/40 outline-none focus:border-gold"
          />
          <button type="submit" disabled={!q.trim() || busy} className="h-11 w-11 rounded-full bg-gold text-ongold grid place-items-center disabled:opacity-40" aria-label="Invia">
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
