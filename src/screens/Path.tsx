import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, ChevronRight, ClipboardCheck, Dumbbell, Feather, GraduationCap, Loader2, MessageSquareQuote, Mic, RefreshCw, Ruler, Sparkles, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { allLessons, lessonKey } from "../academy/content";
import { Sheet } from "../components/ui";
import { activeHabits, currentWeek, GIORNI, Path, PillarId, PILLARS, todayISO, Trial } from "../gentleman/types";
import { RemindersCard } from "../components/Reminders";
import { InstallCard } from "../components/InstallCard";
import { BaselineSheet, dueReview, dueTrials, ReviewSheet, TrialSheet, useProgressData } from "./Progress";
import { wordOfDay } from "../gentleman/words";
import { useApp } from "../lib/store";
import { fn, supabase } from "../lib/supabase";

const NONE = "1970-01-01";
const PILLAR_NAME = Object.fromEntries(PILLARS.map((p) => [p.id, p.nome])) as Record<PillarId, string>;
const lessonTitle = (key?: string | null) => {
  if (!key) return null;
  const x = allLessons.find(({ course, lesson }) => lessonKey(course, lesson) === key);
  return x ? x.lesson.titolo : null;
};

export function useChecks() {
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const today = todayISO();
  const load = useCallback(async () => {
    const { data } = await supabase.from("path_checks").select("key, day").or(`day.eq.${NONE},day.eq.${today}`);
    setChecks(new Set((data || []).map((r) => `${r.key}|${r.day}`)));
  }, [today]);
  useEffect(() => {
    load();
  }, [load]);
  const has = (key: string, daily: boolean) => checks.has(`${key}|${daily ? today : NONE}`);
  const toggle = async (key: string, daily: boolean) => {
    const day = daily ? today : NONE;
    const id = `${key}|${day}`;
    const on = !checks.has(id);
    setChecks((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    if (on) {
      navigator.vibrate?.(10);
      await supabase.from("path_checks").upsert({ key, day });
    } else await supabase.from("path_checks").delete().match({ key, day });
  };
  return { has, toggle, reload: load };
}

export function PathScreen() {
  const app = useApp();
  const path = (app.profile?.path as Path | null) ?? null;
  const hasDraft = (() => {
    try {
      return !!localStorage.getItem("habitus-questionario");
    } catch {
      return false;
    }
  })();

  if (!path)
    return (
      <div className="px-5 lg:px-10 pb-28 lg:pb-12">
        <div className="rounded-[26px] bg-hero text-herofg p-7 lg:p-10 relative overflow-hidden mt-2">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative max-w-[560px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Accademia Habitus</div>
            <h1 className="font-display text-[42px] lg:text-[56px] font-semibold leading-[1.02] mt-3">Diventare un gentleman è un percorso.</h1>
            <p className="mt-4 text-[15.5px] leading-relaxed opacity-80">
              Stile, portamento, linguaggio, fisico, salute, grooming e cultura. Rispondi a qualche domanda e costruisco il tuo programma personale di 12 settimane, nello spirito del gentiluomo inglese.
            </p>
            <button onClick={() => app.setQuizOpen(true)} className="mt-7 h-12 px-6 rounded-full bg-gold text-ongold font-semibold flex items-center gap-2">
              {hasDraft ? "Riprendi il questionario" : "Inizia il questionario"} <ArrowRight size={18} />
            </button>
            <p className="text-[12px] opacity-60 mt-3">Circa 8 minuti · puoi interrompere e riprendere</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Il tuo archetipo", "Chi sei oggi e chi puoi diventare"],
            ["12 settimane", "Missioni concrete, una fase alla volta"],
            ["Ogni giorno", "Abitudini, allenamento e la parola del giorno"],
          ].map(([t, d]) => (
            <div key={t} className="rounded-[20px] bg-surface shadow-soft p-5">
              <div className="font-display text-[22px] font-semibold">{t}</div>
              <div className="text-[13.5px] text-muted mt-1">{d}</div>
            </div>
          ))}
        </div>
      </div>
    );
  return <PathView path={path} />;
}

function PathView({ path }: { path: Path }) {
  const app = useApp();
  const { has, toggle } = useChecks();
  const week = currentWeek(app.profile?.path_started_at);
  const [viewWeek, setViewWeek] = useState(week);
  const [archOpen, setArchOpen] = useState(false);
  const [recovery, setRecovery] = useState<number | null>(null);
  const [regen, setRegen] = useState(false);
  const word = wordOfDay();
  const today = new Date();
  const giorno = GIORNI[today.getDay()];
  const session = path.allenamento.sessioni.find((s) => s.giorno.slice(0, 3).toLowerCase() === giorno.toLowerCase());
  const fase = path.fasi.find((f) => week >= f.da && week <= f.a);
  const w = path.settimane.find((s) => s.n === viewWeek) || path.settimane[0];
  const habits = activeHabits(path, week);
  const habitsDone = habits.filter((h) => has(`h:${h.id}`, true)).length;
  const prog = useProgressData();
  // numerino sull'icona dell'app: le abitudini che mancano oggi
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    const left = habits.length - habitsDone;
    if (left > 0) nav.setAppBadge?.(left).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [habits.length, habitsDone]);
  const due = prog.loaded ? dueReview(path, app.profile?.path_started_at, prog.reviews) : null;
  const trialsDue = prog.loaded ? dueTrials(path, app.profile?.path_started_at, prog.trials) : [];
  const [baseOpen, setBaseOpen] = useState(false);
  const [revWeek, setRevWeek] = useState<number | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [lessonsDone, setLessonsDone] = useState<Set<string> | null>(null);
  useEffect(() => {
    supabase
      .from("academy_progress")
      .select("lesson_id")
      .then(({ data }) => setLessonsDone(new Set((data || []).map((d) => d.lesson_id as string))));
    const open = () => setRevWeek(currentWeek(app.profile?.path_started_at));
    window.addEventListener("habitus:revisione", open);
    return () => window.removeEventListener("habitus:revisione", open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const todayLesson = useMemo(() => {
    if (!lessonsDone) return null;
    const fromMissions = path.settimane
      .filter((s) => s.n <= week)
      .reverse()
      .flatMap((s) => s.missioni)
      .map((m) => m.lezione)
      .find((k) => k && !lessonsDone.has(k) && lessonTitle(k));
    const key = fromMissions || allLessons.map(({ course, lesson }) => lessonKey(course, lesson)).find((k) => !lessonsDone.has(k));
    if (!key) return null;
    const x = allLessons.find(({ course, lesson }) => lessonKey(course, lesson) === key)!;
    return { key, titolo: x.lesson.titolo, corso: x.course.titolo, minuti: x.lesson.minuti };
  }, [lessonsDone, path, week]);
  const weekDone = w ? w.missioni.filter((m) => has(`m:${m.id}`, false)).length : 0;
  const allMissions = path.settimane.flatMap((s) => s.missioni);
  const totalDone = allMissions.filter((m) => has(`m:${m.id}`, false)).length;
  const hello = today.getHours() < 13 ? "Buongiorno" : today.getHours() < 18 ? "Buon pomeriggio" : "Buonasera";

  useEffect(() => {
    supabase
      .from("health_metrics")
      .select("day, value")
      .eq("metric", "recovery")
      .order("day", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const r = data?.[0];
        if (r && Date.now() - Date.parse(r.day) < 2 * 86400000) setRecovery(r.value);
      });
  }, []);

  const pill = useMemo(() => [...path.pilastri].sort((a, b) => a.priorita - b.priorita), [path]);

  const regenerate = async () => {
    setRegen(true);
    try {
      const catalog = allLessons.map(({ course, lesson }) => ({ id: lessonKey(course, lesson), titolo: `${course.titolo} – ${lesson.titolo}` }));
      await fn("percorso", "", { catalog, keepStart: true });
      await app.reload();
      app.toast("Percorso aggiornato");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setRegen(false);
  };

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12">
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[12.5px] text-muted capitalize">{today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none mt-1">
            {hello}, {app.profile?.nome?.split(" ")[0] || ""}
          </h1>
        </div>
      </header>

      {/* Archetipo */}
      <button onClick={() => setArchOpen(true)} className="mt-5 w-full text-left rounded-[24px] bg-hero text-herofg p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
              Settimana {week} di 12{fase ? ` · ${fase.nome}` : ""}
            </div>
            <ChevronRight size={18} className="opacity-50" />
          </div>
          <div className="font-display text-[32px] lg:text-[40px] font-semibold leading-[1.05] mt-2">{path.archetipo.nome}</div>
          <div className="text-[14.5px] italic opacity-80 mt-1.5">"{path.archetipo.motto}"</div>
          <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full bg-gold rounded-full" initial={{ width: 0 }} animate={{ width: `${(totalDone / Math.max(1, allMissions.length)) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
          <div className="text-[11.5px] opacity-60 mt-1.5">
            {totalDone} missioni su {allMissions.length} completate
          </div>
        </div>
      </button>

      <InstallCard />
      <RemindersCard compact />

      {due && (
        <button onClick={() => (due.kind === "partenza" ? setBaseOpen(true) : setRevWeek(due.week))} className="mt-4 w-full text-left rounded-[22px] border border-gold/50 bg-gold-tint p-5 flex items-center gap-4">
          {due.kind === "partenza" ? <Ruler size={24} className="text-gold shrink-0" /> : <ClipboardCheck size={24} className="text-gold shrink-0" />}
          <div className="flex-1">
            <div className="font-semibold text-[15.5px]">{due.kind === "partenza" ? "Prendi le misure di partenza" : `Il controllo della settimana ${due.week}`}</div>
            <div className="text-[13px] text-muted mt-0.5">
              {due.kind === "partenza" ? "Misure, foto, autovalutazione e un minuto di voce: il riferimento per tutto il percorso." : "Cinque minuti: in base alle risposte il percorso si adatta alle prossime settimane."}
            </div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </button>
      )}

      {trialsDue.map((t) => (
        <button key={t.id} onClick={() => setTrial(t)} className="mt-3 w-full text-left rounded-[22px] bg-surface shadow-soft p-5 flex items-center gap-4">
          <Trophy size={24} className="text-gold shrink-0" />
          <div className="flex-1">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">Prova sul campo</div>
            <div className="font-semibold text-[15.5px] leading-snug">{t.titolo}</div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </button>
      ))}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* Abitudini */}
        <section className="rounded-[22px] bg-surface shadow-soft p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Le abitudini di oggi
            </h2>
            <span className="text-[12px] text-muted">
              {habitsDone}/{habits.length}
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            {habits.map((h) => {
              const on = has(`h:${h.id}`, true);
              return (
                <button key={h.id} onClick={() => toggle(`h:${h.id}`, true)} className="w-full flex items-center gap-3 py-2 text-left">
                  <span className={`h-6 w-6 rounded-full border grid place-items-center shrink-0 transition ${on ? "bg-gold border-gold text-ongold" : "border-line"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[14.5px] ${on ? "line-through text-muted" : ""}`}>{h.titolo}</span>
                    {h.minimo && !on && <span className="block text-[11.5px] text-muted">Giornata storta? Anche solo: {h.minimo}</span>}
                  </span>
                  <span className="text-[10.5px] uppercase tracking-[0.1em] text-muted">{h.quando}</span>
                </button>
              );
            })}
            {path.abitudini.length > habits.length && <div className="text-[11.5px] text-muted pt-1">Altre {path.abitudini.length - habits.length} abitudini arriveranno nelle prossime settimane, una alla volta.</div>}
          </div>
        </section>

        <div className="grid gap-3">
          {/* Allenamento */}
          <section className="rounded-[22px] bg-surface shadow-soft p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
              <Dumbbell size={13} className="text-gold" /> Allenamento di oggi
            </h2>
            {session ? (
              <>
                <div className="flex items-end justify-between mt-2 gap-3">
                  <div>
                    <div className="text-[18px] font-semibold">{session.nome}</div>
                    <div className="text-[12.5px] text-muted">
                      {session.esercizi.length} esercizi · {session.durata_min} min
                    </div>
                  </div>
                  <button onClick={() => app.openSession(session.giorno)} className="h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold shadow-pill flex items-center gap-1.5 shrink-0">
                    Inizia <ArrowRight size={15} />
                  </button>
                </div>
                {recovery != null && (
                  <div className={`mt-3 rounded-[12px] px-3 py-2 text-[12.5px] ${recovery < 34 ? "bg-danger-tint text-danger" : "bg-gold-tint"}`}>
                    Recovery {Math.round(recovery)}% ·{" "}
                    {recovery >= 67 ? "sei pronto: puoi spingere sui carichi." : recovery >= 34 ? "allenati come da scheda, senza cercare record." : "oggi versione leggera: metà delle serie e carichi ridotti, oppure mobilità e camminata."}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 text-[14px] text-muted">Giorno di riposo attivo: 30 minuti di camminata a passo svelto e 10 minuti di mobilità.</div>
            )}
          </section>

          {/* Lezione di oggi */}
          {todayLesson && (
            <button onClick={() => app.openLesson(todayLesson.key)} className="text-left rounded-[22px] bg-surface shadow-soft p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
                <GraduationCap size={13} className="text-gold" /> La lezione di oggi · {todayLesson.minuti} min
              </h2>
              <div className="text-[18px] font-semibold mt-2 leading-snug">{todayLesson.titolo}</div>
              <div className="text-[12.5px] text-muted">{todayLesson.corso}</div>
            </button>
          )}

          {/* Parola del giorno */}
          <button onClick={() => app.setTab("linguaggio")} className="text-left rounded-[22px] bg-surface shadow-soft p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
              <Feather size={13} className="text-gold" /> La parola del giorno
            </h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[28px] font-semibold">{word.parola}</span>
              <span className="text-[12px] text-muted italic">{word.tipo}</span>
            </div>
            <div className="text-[13.5px] text-muted">{word.significato}</div>
            <div className="text-[13.5px] italic mt-1.5">"{word.esempio}"</div>
            <div className="mt-3 text-[12.5px] text-gold font-medium flex items-center gap-1">
              <MessageSquareQuote size={14} /> Usala oggi in una conversazione
            </div>
            <div className="mt-1.5 text-[12.5px] text-muted flex items-center gap-1">
              <Mic size={13} /> Esercizio: registra 60 secondi in cui la usi, poi analizzali nel Laboratorio
            </div>
            {word.fonte && (
              <a href={word.fonte} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1.5 inline-block text-[11.5px] text-muted underline underline-offset-2">
                Fonte: vocabolario Treccani
              </a>
            )}
          </button>
        </div>
      </div>

      {/* Missioni */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Missioni · settimana {viewWeek}
          </h2>
          <span className="text-[12px] text-muted">
            {weekDone}/{w?.missioni.length || 0}
          </span>
        </div>
        <div className="mt-3 -mx-5 px-5 lg:-mx-10 lg:px-10 flex gap-1.5 overflow-x-auto no-scrollbar">
          {path.settimane.map((s) => {
            const all = s.missioni.length && s.missioni.every((m) => has(`m:${m.id}`, false));
            return (
              <button
                key={s.n}
                onClick={() => setViewWeek(s.n)}
                className={`h-9 min-w-9 px-2 rounded-full text-[13px] font-semibold shrink-0 transition ${s.n === viewWeek ? "bg-brand text-brand-fg" : all ? "bg-gold-tint text-gold" : s.n === week ? "border border-gold text-gold" : "bg-card text-muted"}`}
              >
                {all ? <Check size={14} className="inline" /> : s.n}
              </button>
            );
          })}
        </div>
        {w && (
          <>
            <div className="font-display text-[24px] font-semibold mt-4">{w.tema}</div>
            <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
              {w.missioni.map((m) => {
                const on = has(`m:${m.id}`, false);
                const lt = lessonTitle(m.lezione);
                return (
                  <div key={m.id} className={`rounded-[18px] p-4 border transition ${on ? "border-gold/40 bg-gold-tint" : "border-transparent bg-surface shadow-soft"}`}>
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggle(`m:${m.id}`, false)}
                        className={`h-7 w-7 rounded-full border grid place-items-center shrink-0 transition ${on ? "bg-gold border-gold text-ongold" : "border-line"}`}
                        aria-label="Completa"
                      >
                        {on && <Check size={15} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">{PILLAR_NAME[m.pilastro]}</div>
                        <div className={`text-[15px] font-semibold leading-snug mt-0.5 ${on ? "line-through text-muted" : ""}`}>{m.titolo}</div>
                        <div className="text-[13px] text-muted mt-1 leading-relaxed">{m.dettaglio}</div>
                        {lt && (
                          <button onClick={() => app.openLesson(m.lezione!)} className="mt-2 text-[12.5px] text-gold font-medium flex items-center gap-1.5">
                            <BookOpen size={13} /> Lezione: {lt}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Pilastri */}
      <section className="mt-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> I sette pilastri
        </h2>
        <div className="mt-3 rounded-[22px] bg-surface shadow-soft divide-y divide-line">
          {pill.map((p) => (
            <div key={p.id} className="px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-[14.5px] font-semibold">{PILLAR_NAME[p.id]}</div>
                {p.priorita <= 3 && <span className="text-[10px] uppercase tracking-[0.12em] text-gold font-bold whitespace-nowrap">Priorità {p.priorita}</span>}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-2 w-5 rounded-full ${n <= p.punteggio ? "bg-gold" : "bg-line"}`} />
                  ))}
                </div>
              </div>
              <div className="text-[12.5px] text-muted mt-1">{p.diagnosi}</div>
              <div className="text-[12.5px] mt-0.5">
                <span className="text-gold">Obiettivo:</span> {p.obiettivo}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <button onClick={() => app.setQuizOpen(true)} className="h-10 px-4 rounded-full bg-card text-[13px] font-medium flex items-center gap-1.5">
          <Sparkles size={14} /> Rifai il questionario
        </button>
        <button onClick={regenerate} disabled={regen} className="h-10 px-4 rounded-full bg-card text-[13px] font-medium flex items-center gap-1.5">
          {regen ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Rigenera il percorso
        </button>
      </div>

      <BaselineSheet open={baseOpen} onClose={() => setBaseOpen(false)} onDone={prog.reload} />
      <ReviewSheet open={revWeek != null} week={revWeek || week} onClose={() => setRevWeek(null)} onDone={prog.reload} />
      <TrialSheet trial={trial} onClose={() => setTrial(null)} onDone={prog.reload} />

      <Sheet open={archOpen} onClose={() => setArchOpen(false)} eyebrow="Il tuo archetipo" title={path.archetipo.nome}>
        <div className="space-y-5 pb-6">
          <p className="text-[15px] leading-relaxed">{path.archetipo.descrizione}</p>
          <p className="text-[14.5px] italic text-muted">"{path.archetipo.motto}"</p>
          <div className="rounded-[16px] bg-card p-4 text-[14px] leading-relaxed">{path.ritratto}</div>
          {path.archetipo.icone.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-2">A cui ispirarti</div>
              <ul className="space-y-1.5">
                {path.archetipo.icone.map((x) => (
                  <li key={x} className="flex gap-2 text-[14px]">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-2">Le tre fasi</div>
            <div className="space-y-2">
              {path.fasi.map((f) => (
                <div key={f.nome} className={`rounded-[14px] p-3.5 ${week >= f.da && week <= f.a ? "bg-gold-tint border border-gold/40" : "bg-card"}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold text-[14.5px]">{f.nome}</span>
                    <span className="text-[12px] text-muted">
                      Settimane {f.da}–{f.a}
                    </span>
                  </div>
                  <div className="text-[13px] text-muted mt-1">{f.focus}</div>
                </div>
              ))}
            </div>
          </div>
          {path.guardaroba?.direzione && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-2">Direzione di stile</div>
              <p className="text-[14px] leading-relaxed">{path.guardaroba.direzione}</p>
              {path.guardaroba.strategia && <p className="text-[13.5px] leading-relaxed text-muted mt-2">{path.guardaroba.strategia}</p>}
              {path.guardaroba.essenziali.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {path.guardaroba.essenziali.map((e) => (
                    <li key={e.nome} className="flex items-center gap-2 text-[13.5px]">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${e.priorita === "alta" ? "bg-gold" : e.priorita === "media" ? "bg-gold/50" : "bg-line"}`} />
                      <span className="flex-1">{e.nome}</span>
                      <span className="text-muted text-[12px]">{e.budget}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
