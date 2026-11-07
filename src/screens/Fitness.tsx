import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Dumbbell, Flame, Pause, Play, Salad, Timer, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GIORNI, Path, Session, todayISO } from "../gentleman/types";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";

type Log = { day: string; exercise: string; set_no: number; weight: number | null; reps: number | null };
const ORDER = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const norm = (g: string) => g.slice(0, 3).charAt(0).toUpperCase() + g.slice(1, 3).toLowerCase();

export function FitnessScreen() {
  const app = useApp();
  const path = (app.profile?.path as Path | null) ?? null;
  const [open, setOpen] = useState<string | null>(app.sessionTarget);
  const [tab, setTab] = useState<"scheda" | "alimentazione">("scheda");
  useEffect(() => {
    if (app.sessionTarget) {
      setOpen(app.sessionTarget);
      app.clearSessionTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.sessionTarget]);
  useEffect(() => window.scrollTo({ top: 0 }), [open]);

  if (!path)
    return (
      <div className="px-5 lg:px-10 pb-28">
        <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Fisico</h1>
        <div className="mt-8 rounded-[22px] bg-surface shadow-soft p-6 text-center">
          <Dumbbell className="mx-auto text-gold" />
          <p className="mt-3 text-muted">La tua scheda di allenamento nasce dal questionario d'ingresso.</p>
          <button onClick={() => app.setQuizOpen(true)} className="mt-4 h-11 px-5 rounded-full bg-brand text-brand-fg font-semibold shadow-pill">
            Inizia il questionario
          </button>
        </div>
      </div>
    );

  const sessions = [...path.allenamento.sessioni].sort((a, b) => ORDER.indexOf(norm(a.giorno)) - ORDER.indexOf(norm(b.giorno)));
  const session = sessions.find((s) => norm(s.giorno) === (open ? norm(open) : ""));
  if (session) return <SessionView s={session} onBack={() => setOpen(null)} />;
  const today = GIORNI[new Date().getDay()];

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[900px]">
      <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Fisico</h1>
      <p className="text-muted text-[14px] mt-2">{path.allenamento.obiettivo}</p>

      <div className="mt-5 p-1 rounded-full bg-card w-fit flex gap-1">
        {(["scheda", "alimentazione"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 h-9 rounded-full text-[13.5px] font-semibold capitalize ${tab === t ? "bg-surface shadow-soft" : "text-muted"}`}>
            {t === "scheda" ? "Allenamento" : "Alimentazione"}
          </button>
        ))}
      </div>

      {tab === "scheda" ? (
        <>
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {ORDER.map((g) => {
              const s = sessions.find((x) => norm(x.giorno) === g);
              const isToday = g === today;
              return (
                <button
                  key={g}
                  disabled={!s}
                  onClick={() => s && setOpen(s.giorno)}
                  className={`rounded-[14px] py-2.5 text-center transition ${s ? (isToday ? "bg-brand text-brand-fg shadow-pill" : "bg-surface shadow-soft") : "bg-card text-muted"} ${isToday && !s ? "ring-1 ring-gold" : ""}`}
                >
                  <div className="text-[11px] font-semibold uppercase">{g}</div>
                  <div className="mt-1 flex justify-center">{s ? <Dumbbell size={14} /> : <span className="h-[14px] text-[10px]">riposo</span>}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            {sessions.map((s) => (
              <button key={s.giorno} onClick={() => setOpen(s.giorno)} className="w-full text-left rounded-[20px] bg-surface shadow-soft p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{s.giorno}</div>
                  <div className="text-[12px] text-muted">{s.durata_min} min</div>
                </div>
                <div className="text-[18px] font-semibold mt-1">{s.nome}</div>
                <div className="text-[13px] text-muted mt-1 line-clamp-2">{s.esercizi.map((e) => e.nome).join(" · ")}</div>
              </button>
            ))}
          </div>

          {(path.allenamento.progressione || path.allenamento.note) && (
            <div className="mt-5 rounded-[20px] border border-gold/40 bg-gold-tint p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold flex items-center gap-2">
                <TrendingUp size={14} /> Come progredire
              </div>
              <p className="text-[14px] leading-relaxed mt-2">{path.allenamento.progressione}</p>
              {path.allenamento.note && <p className="text-[13px] text-muted mt-2">{path.allenamento.note}</p>}
            </div>
          )}
        </>
      ) : (
        <Nutrition path={path} />
      )}
    </div>
  );
}

function Nutrition({ path }: { path: Path }) {
  const a = path.alimentazione;
  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-[20px] bg-surface shadow-soft p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold flex items-center gap-2">
          <Salad size={14} /> Obiettivo
        </div>
        <p className="text-[15px] mt-2 leading-relaxed">{a.obiettivo}</p>
        <ul className="mt-3 space-y-2">
          {a.principi.map((p) => (
            <li key={p} className="flex gap-2.5 text-[14px]">
              <Check size={16} className="text-gold shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-[20px] bg-surface shadow-soft divide-y divide-line">
        <div className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Una giornata tipo</div>
        {a.giornata_tipo.map((g) => (
          <div key={g.pasto} className="px-5 py-3">
            <div className="text-[13px] font-semibold text-gold">{g.pasto}</div>
            <div className="text-[14px] mt-0.5">{g.esempio}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] bg-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Da limitare</div>
          <ul className="mt-2 space-y-1.5">
            {a.da_limitare.map((x) => (
              <li key={x} className="flex gap-2 text-[14px] text-muted">
                <X size={15} className="shrink-0 mt-0.5" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[20px] bg-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Idratazione</div>
          <p className="text-[14px] mt-2">{a.idratazione}</p>
        </div>
      </div>
      <p className="text-[11.5px] text-muted px-1">Linee guida generali. Per esigenze di salute specifiche rivolgiti a un medico o a un nutrizionista.</p>
    </div>
  );
}

/* ---------------- sessione con registro dei carichi ---------------- */
function SessionView({ s, onBack }: { s: Session; onBack: () => void }) {
  const app = useApp();
  const day = todayISO();
  const [logs, setLogs] = useState<Log[]>([]);
  const [rest, setRest] = useState<{ left: number; total: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const names = useMemo(() => s.esercizi.map((e) => e.nome), [s]);

  useEffect(() => {
    supabase
      .from("workout_logs")
      .select("day, exercise, set_no, weight, reps")
      .in("exercise", names)
      .order("day", { ascending: false })
      .limit(400)
      .then(({ data }) => setLogs((data as Log[]) || []));
  }, [names]);

  useEffect(() => {
    if (!rest || paused) return;
    if (rest.left <= 0) {
      navigator.vibrate?.([200, 100, 200]);
      setRest(null);
      return;
    }
    const t = window.setTimeout(() => setRest((r) => (r ? { ...r, left: r.left - 1 } : r)), 1000);
    return () => window.clearTimeout(t);
  }, [rest, paused]);

  const todayLog = (ex: string, n: number) => logs.find((l) => l.day === day && l.exercise === ex && l.set_no === n);
  const lastSession = (ex: string) => {
    const prev = logs.filter((l) => l.exercise === ex && l.day !== day);
    if (!prev.length) return null;
    const d = prev[0].day;
    return prev.filter((l) => l.day === d).sort((a, b) => a.set_no - b.set_no);
  };

  const save = async (ex: string, n: number, patch: Partial<Log>) => {
    const cur = todayLog(ex, n) || { day, exercise: ex, set_no: n, weight: null, reps: null };
    const next = { ...cur, ...patch };
    setLogs((ls) => [next, ...ls.filter((l) => !(l.day === day && l.exercise === ex && l.set_no === n))]);
    const { error } = await supabase
      .from("workout_logs")
      .upsert({ user_id: app.uid, day, session: s.nome, exercise: ex, set_no: n, weight: next.weight, reps: next.reps }, { onConflict: "user_id,day,exercise,set_no" });
    if (error) app.toast(error.message);
  };

  const doneSets = s.esercizi.reduce((acc, e) => acc + Array.from({ length: e.serie }, (_, k) => todayLog(e.nome, k + 1)).filter((l) => l?.reps).length, 0);
  const totalSets = s.esercizi.reduce((a, e) => a + e.serie, 0);

  return (
    <div className="px-5 lg:px-10 pb-36 lg:pb-16 max-w-[820px]">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[14px] text-muted mb-4">
        <ArrowLeft size={16} /> Fisico
      </button>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
        {s.giorno} · {s.durata_min} minuti
      </div>
      <h1 className="font-display text-[34px] lg:text-[42px] font-semibold leading-[1.05] mt-1">{s.nome}</h1>
      <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-gold transition-all" style={{ width: `${(doneSets / Math.max(1, totalSets)) * 100}%` }} />
      </div>
      <div className="text-[12px] text-muted mt-1">
        {doneSets} serie su {totalSets}
      </div>

      {s.riscaldamento && (
        <div className="mt-5 rounded-[18px] bg-card p-4 text-[14px]">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-1 flex items-center gap-1.5">
            <Flame size={13} className="text-gold" /> Riscaldamento
          </div>
          {s.riscaldamento}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {s.esercizi.map((e, i) => {
          const prev = lastSession(e.nome);
          return (
            <div key={e.nome + i} className="rounded-[20px] bg-surface shadow-soft p-4">
              <div className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-ink text-bg grid place-items-center text-[13px] font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-semibold leading-tight">{e.nome}</div>
                  <div className="text-[12.5px] text-muted mt-0.5">
                    {e.serie} × {e.ripetizioni} · recupero {e.recupero_s}"
                  </div>
                  {e.note && <div className="text-[12.5px] mt-1 italic">{e.note}</div>}
                  {prev && (
                    <div className="text-[11.5px] text-gold mt-1">
                      Ultima volta: {prev.map((p) => `${p.weight ?? "–"}kg×${p.reps ?? "–"}`).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {Array.from({ length: e.serie }, (_, k) => {
                  const n = k + 1;
                  const l = todayLog(e.nome, n);
                  const p = prev?.find((x) => x.set_no === n);
                  const done = !!l?.reps;
                  return (
                    <div key={n} className={`flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 ${done ? "bg-gold-tint" : "bg-card"}`}>
                      <span className="text-[12px] text-muted w-12">Serie {n}</span>
                      <input
                        inputMode="decimal"
                        placeholder={p?.weight != null ? String(p.weight) : "kg"}
                        defaultValue={l?.weight ?? ""}
                        onBlur={(ev) => {
                          const v = ev.target.value.replace(",", ".");
                          save(e.nome, n, { weight: v === "" ? null : Number(v) });
                        }}
                        className="w-16 h-9 rounded-[10px] bg-surface border border-line text-center text-[15px] outline-none focus:border-gold"
                      />
                      <span className="text-[12px] text-muted">kg</span>
                      <input
                        inputMode="numeric"
                        placeholder={p?.reps != null ? String(p.reps) : e.ripetizioni.split("-")[0]}
                        defaultValue={l?.reps ?? ""}
                        onBlur={(ev) => save(e.nome, n, { reps: ev.target.value === "" ? null : parseInt(ev.target.value) })}
                        className="w-14 h-9 rounded-[10px] bg-surface border border-line text-center text-[15px] outline-none focus:border-gold"
                      />
                      <span className="text-[12px] text-muted">rip.</span>
                      <button
                        onClick={() => setRest({ left: e.recupero_s, total: e.recupero_s })}
                        className="ml-auto h-8 w-8 rounded-full grid place-items-center text-muted hover:text-gold"
                        aria-label="Avvia recupero"
                      >
                        {done ? <Check size={16} className="text-gold" /> : <Timer size={16} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {s.defaticamento && (
        <div className="mt-4 rounded-[18px] bg-card p-4 text-[14px]">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-1">Defaticamento</div>
          {s.defaticamento}
        </div>
      )}

      <AnimatePresence>
        {rest && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-6 z-40 rounded-full bg-ink text-bg shadow-dock pl-5 pr-2 py-2 flex items-center gap-3"
          >
            <Timer size={18} className="text-gold" />
            <span className="font-display text-[26px] font-semibold tabular-nums w-[70px]">
              {Math.floor(rest.left / 60)}:{String(rest.left % 60).padStart(2, "0")}
            </span>
            <button onClick={() => setPaused((p) => !p)} className="h-9 w-9 rounded-full bg-white/10 grid place-items-center" aria-label="Pausa">
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button onClick={() => setRest(null)} className="h-9 w-9 rounded-full bg-white/10 grid place-items-center" aria-label="Chiudi">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

