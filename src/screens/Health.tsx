import { motion } from "framer-motion";
import { Activity, Apple, Check, ChevronDown, Copy, Dumbbell, Flame, Footprints, HeartPulse, Link2, Loader2, Moon, RefreshCw, Scale, Unlink, Waves, Zap } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { PrimaryButton } from "../components/ui";
import { useApp } from "../lib/store";
import { supabase, SUPABASE_KEY, SUPABASE_URL } from "../lib/supabase";

type Row = { day: string; metric: string; value: number; source: string; extra: Record<string, number | string> | null };
type Workout = { ext_id: string; source: string; start_at: string; end_at: string; sport: string; strain: number | null; kcal: number | null; avg_hr: number | null; distance_m: number | null };
type WhoopStatus = { connected: boolean; connected_at: string | null; last_sync_at: string | null };

/** Per ogni metrica, quale fonte preferire quando ci sono entrambe. */
const PREFER: Record<string, string[]> = {
  recovery: ["whoop"], hrv: ["whoop", "apple"], rhr: ["whoop", "apple"], sleep_hours: ["whoop", "apple"], sleep_perf: ["whoop"],
  strain: ["whoop"], steps: ["apple"], active_kcal: ["apple"], weight: ["apple", "whoop"], body_fat: ["apple"], spo2: ["whoop", "apple"],
};
const INGEST_URL = `${SUPABASE_URL}/functions/v1/health-ingest`;

async function whoopCall(path: string, body: unknown = {}) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/whoop/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Errore ${r.status}`);
  return j;
}

const fmtDay = (d: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  if (d === today) return "Oggi";
  if (d === y) return "Ieri";
  return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
};
const hm = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;
const recColor = (v: number) => (v >= 67 ? "rgb(var(--ok))" : v >= 34 ? "rgb(var(--warn))" : "rgb(var(--bad))");

export function Health() {
  const app = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [whoop, setWhoop] = useState<WhoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 45 * 86400_000).toISOString().slice(0, 10);
    const [m, w, s] = await Promise.all([
      supabase.from("health_metrics").select("day, metric, value, source, extra").gte("day", since).order("day", { ascending: true }),
      supabase.from("health_workouts").select("*").order("start_at", { ascending: false }).limit(12),
      supabase.rpc("whoop_status"),
    ]);
    setRows((m.data as Row[]) || []);
    setWorkouts((w.data as Workout[]) || []);
    setWhoop((s.data as WhoopStatus) || null);
    setLoading(false);
    return (s.data as WhoopStatus) || null;
  }, []);

  const sync = useCallback(
    async (days = 7, quiet = false) => {
      setSyncing(true);
      try {
        const r = await whoopCall("sync", { days });
        if (!quiet) app.toast(`Whoop aggiornato · ${r.metrics} dati`);
      } catch (e) {
        if (!quiet) app.toast((e as Error).message);
      }
      await load();
      setSyncing(false);
    },
    [app, load],
  );

  useEffect(() => {
    load().then((s) => {
      // sincronizza da solo se l'ultimo aggiornamento è vecchio di oltre 2 ore
      if (s?.connected && (!s.last_sync_at || Date.now() - Date.parse(s.last_sync_at) > 2 * 3600_000)) sync(3, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* serie per metrica, con la fonte preferita */
  const series = useMemo(() => {
    const by = new Map<string, Map<string, Row>>();
    for (const r of rows) {
      const pref = PREFER[r.metric] || ["whoop", "apple"];
      const m = by.get(r.metric) || new Map<string, Row>();
      const cur = m.get(r.day);
      if (!cur || pref.indexOf(r.source) < pref.indexOf(cur.source) || (pref.indexOf(cur.source) === -1 && pref.indexOf(r.source) !== -1)) m.set(r.day, r);
      by.set(r.metric, m);
    }
    const out: Record<string, Row[]> = {};
    by.forEach((m, k) => (out[k] = [...m.values()].sort((a, b) => a.day.localeCompare(b.day))));
    return out;
  }, [rows]);
  const last = (k: string) => series[k]?.[series[k].length - 1];
  const hasData = rows.length > 0;
  const appleLast = rows.filter((r) => r.source === "apple").map((r) => r.day).sort().pop();

  const rec = last("recovery");
  const tiles: { k: string; label: string; icon: ReactNode; fmt: (v: number) => string; sub?: (r: Row) => string | null }[] = [
    { k: "sleep_hours", label: "Sonno", icon: <Moon size={16} />, fmt: hm, sub: () => (last("sleep_perf") ? `Performance ${Math.round(last("sleep_perf")!.value)}%` : null) },
    { k: "hrv", label: "HRV", icon: <Waves size={16} />, fmt: (v) => `${Math.round(v)} ms` },
    { k: "rhr", label: "FC a riposo", icon: <HeartPulse size={16} />, fmt: (v) => `${Math.round(v)} bpm` },
    { k: "strain", label: "Strain", icon: <Zap size={16} />, fmt: (v) => v.toFixed(1) },
    { k: "steps", label: "Passi", icon: <Footprints size={16} />, fmt: (v) => Math.round(v).toLocaleString("it-IT") },
    { k: "active_kcal", label: "Calorie attive", icon: <Flame size={16} />, fmt: (v) => `${Math.round(v)} kcal` },
    { k: "weight", label: "Peso", icon: <Scale size={16} />, fmt: (v) => `${v.toFixed(1)} kg` },
    { k: "body_fat", label: "Massa grassa", icon: <Activity size={16} />, fmt: (v) => `${v.toFixed(1)}%` },
  ];
  const visibleTiles = tiles.filter((t) => last(t.k));

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Salute</h1>
          <p className="text-muted text-[14px] mt-2">Recovery, sonno e attività da Whoop e Apple Salute.</p>
        </div>
        {whoop?.connected && (
          <button onClick={() => sync(7)} disabled={syncing} className="h-10 px-4 rounded-full border border-line bg-surface text-[13px] font-semibold flex items-center gap-2 shrink-0">
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> Aggiorna
          </button>
        )}
      </header>

      {loading ? (
        <div className="py-24 grid place-items-center text-muted">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <>
          {hasData && (
            <section className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,340px)_1fr]">
              {/* Recovery */}
              <div className="rounded-[22px] bg-surface shadow-soft p-5 flex items-center gap-5">
                {rec ? (
                  <>
                    <Ring value={rec.value} color={recColor(rec.value)} />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">Recovery · {fmtDay(rec.day)}</div>
                      <div className="font-display text-[26px] font-semibold leading-tight mt-1">
                        {rec.value >= 67 ? "Pronto a spingere" : rec.value >= 34 ? "Giornata moderata" : "Giornata di recupero"}
                      </div>
                      <div className="text-[13px] text-muted mt-1">
                        {rec.value >= 67 ? "Il corpo ha recuperato: via libera ad allenamenti intensi." : rec.value >= 34 ? "Allenati, ma senza esagerare." : "Meglio un allenamento leggero o riposo attivo."}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted text-[14px]">La recovery arriva da Whoop: collegalo qui sotto.</div>
                )}
              </div>
              {/* Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {visibleTiles.map((t) => {
                  const r = last(t.k)!;
                  return (
                    <div key={t.k} className="rounded-[18px] bg-surface shadow-soft p-4">
                      <div className="flex items-center gap-1.5 text-muted text-[12px]">
                        <span className="text-gold">{t.icon}</span>
                        {t.label}
                      </div>
                      <div className="text-[22px] font-semibold mt-1.5 tracking-tight">{t.fmt(r.value)}</div>
                      <div className="text-[11.5px] text-muted mt-0.5">{t.sub?.(r) || fmtDay(r.day)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {hasData && (
            <section className="mt-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Ultimi 14 giorni
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {series.recovery && <Trend title="Recovery" rows={series.recovery} max={100} color={(v) => recColor(v)} fmt={(v) => `${Math.round(v)}%`} />}
                {series.sleep_hours && <Trend title="Sonno" rows={series.sleep_hours} fmt={hm} />}
                {series.hrv && <Trend title="HRV" rows={series.hrv} fmt={(v) => `${Math.round(v)} ms`} />}
                {series.steps && <Trend title="Passi" rows={series.steps} fmt={(v) => Math.round(v).toLocaleString("it-IT")} />}
                {series.strain && <Trend title="Strain" rows={series.strain} max={21} fmt={(v) => v.toFixed(1)} />}
                {series.weight && <Trend title="Peso" rows={series.weight} fmt={(v) => `${v.toFixed(1)} kg`} relative />}
              </div>
            </section>
          )}

          {workouts.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Allenamenti recenti
              </h2>
              <div className="mt-3 rounded-[20px] bg-surface shadow-soft divide-y divide-line">
                {workouts.map((w) => {
                  const min = w.start_at && w.end_at ? Math.round((Date.parse(w.end_at) - Date.parse(w.start_at)) / 60000) : null;
                  return (
                    <div key={w.source + w.ext_id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 rounded-full bg-gold-tint text-gold grid place-items-center shrink-0">
                        <Dumbbell size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-semibold capitalize truncate">{w.sport.replace(/[-_]/g, " ")}</div>
                        <div className="text-[12px] text-muted">
                          {w.start_at ? fmtDay(w.start_at.slice(0, 10)) : ""}
                          {min ? ` · ${min} min` : ""}
                          {w.kcal ? ` · ${Math.round(w.kcal)} kcal` : ""}
                          {w.avg_hr ? ` · ${Math.round(w.avg_hr)} bpm` : ""}
                        </div>
                      </div>
                      {w.strain != null && <div className="text-[15px] font-semibold">{w.strain.toFixed(1)}</div>}
                      <span className="text-[10px] uppercase tracking-[0.1em] text-muted w-10 text-right">{w.source === "whoop" ? "Whoop" : "Apple"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Collegamenti
            </h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <WhoopCard status={whoop} syncing={syncing} onSync={() => sync(30)} onChange={load} />
              <AppleCard token={app.profile?.ingest_token ?? ""} last={appleLast} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const size = 104,
    r = 44,
    c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} stroke="rgb(var(--line))" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-[30px] font-semibold">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function Trend({ title, rows, fmt, max, color, relative }: { title: string; rows: Row[]; fmt: (v: number) => string; max?: number; color?: (v: number) => string; relative?: boolean }) {
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10));
  const map = new Map(rows.map((r) => [r.day, r.value]));
  const vals = days.map((d) => map.get(d));
  const present = vals.filter((v): v is number => v != null);
  if (!present.length) return null;
  const hi = max ?? Math.max(...present);
  const lo = relative ? Math.min(...present) * 0.98 : 0;
  const avg = present.reduce((a, b) => a + b, 0) / present.length;
  const lastV = present[present.length - 1];
  return (
    <div className="rounded-[18px] bg-surface shadow-soft p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[12px] text-muted">
          Media <span className="text-ink font-semibold">{fmt(avg)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-[5px] h-[72px]">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 h-full flex items-end" title={v != null ? `${fmtDay(days[i])}: ${fmt(v)}` : fmtDay(days[i])}>
            <motion.div
              className="w-full rounded-[4px]"
              style={{ background: v == null ? "rgb(var(--line))" : color ? color(v) : "rgb(var(--gold))", opacity: v == null ? 0.5 : i === 13 ? 1 : 0.75 }}
              initial={{ height: 0 }}
              animate={{ height: v == null ? 3 : `${Math.max(4, ((v - lo) / (hi - lo || 1)) * 100)}%` }}
              transition={{ duration: 0.5, delay: i * 0.02 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-muted">
        <span>{fmtDay(days[0])}</span>
        <span>Ultimo: {fmt(lastV)}</span>
      </div>
    </div>
  );
}

function WhoopCard({ status, syncing, onSync, onChange }: { status: WhoopStatus | null; syncing: boolean; onSync: () => void; onChange: () => void }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true);
    try {
      const r = await whoopCall("start");
      window.location.href = r.url;
    } catch (e) {
      app.toast((e as Error).message);
      setBusy(false);
    }
  };
  const disconnect = async () => {
    setBusy(true);
    try {
      await whoopCall("disconnect");
      app.toast("Whoop scollegato");
      onChange();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="rounded-[20px] bg-surface shadow-soft p-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-[12px] bg-ink text-bg grid place-items-center font-black text-[13px] tracking-tight">W</div>
        <div className="flex-1">
          <div className="text-[16px] font-semibold">Whoop</div>
          <div className="text-[12.5px] text-muted">
            {status?.connected ? (
              <span className="inline-flex items-center gap-1">
                <Check size={13} className="text-[rgb(var(--ok))]" /> Collegato
                {status.last_sync_at ? ` · agg. ${new Date(status.last_sync_at).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
            ) : (
              "Recovery, HRV, sonno, strain e allenamenti"
            )}
          </div>
        </div>
      </div>
      {status?.connected ? (
        <div className="mt-4 flex gap-2">
          <button onClick={onSync} disabled={syncing} className="flex-1 h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2">
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> Importa 30 giorni
          </button>
          <button onClick={disconnect} disabled={busy} className="h-11 px-4 rounded-full bg-danger-tint text-danger text-[14px] font-medium flex items-center gap-2">
            <Unlink size={15} /> Scollega
          </button>
        </div>
      ) : (
        <PrimaryButton className="w-full mt-4" onClick={connect} disabled={busy}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Link2 size={17} />} Collega Whoop
        </PrimaryButton>
      )}
      <p className="text-[11.5px] text-muted mt-3">I nuovi dati arrivano da soli quando Whoop li elabora (dopo il risveglio e dopo ogni allenamento).</p>
    </div>
  );
}

function AppleCard({ token, last }: { token: string; last?: string }) {
  const app = useApp();
  const [open, setOpen] = useState(!last);
  const copy = async (t: string, what: string) => {
    try {
      await navigator.clipboard.writeText(t);
      app.toast(`${what} copiato`);
    } catch {
      app.toast("Copia non riuscita: tieni premuto sul testo");
    }
  };
  return (
    <div className="rounded-[20px] bg-surface shadow-soft p-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-[12px] bg-gradient-to-br from-[#FF5A6E] to-[#FF2D55] text-white grid place-items-center">
          <Apple size={19} />
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-semibold">Apple Salute</div>
          <div className="text-[12.5px] text-muted">
            {last ? (
              <span className="inline-flex items-center gap-1">
                <Check size={13} className="text-[rgb(var(--ok))]" /> Dati ricevuti · ultimo giorno {fmtDay(last).toLowerCase()}
              </span>
            ) : (
              "Tramite l'app Health Auto Export sull'iPhone"
            )}
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 text-muted" aria-label="Istruzioni">
          <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <CopyRow label="URL" value={INGEST_URL} onCopy={() => copy(INGEST_URL, "URL")} />
          <CopyRow label="Header · Key" value="Authorization" onCopy={() => copy("Authorization", "Nome header")} />
          <CopyRow label="Header · Value" value={`Bearer ${token}`} onCopy={() => copy(`Bearer ${token}`, "Codice")} secret />
          <ol className="text-[12.5px] text-muted space-y-1 list-decimal pl-4">
            <li>Health Auto Export → Automations → + → REST API</li>
            <li>Incolla URL e header qui sopra · Format: JSON</li>
            <li>Data Type: Health Metrics (poi una seconda per Workouts)</li>
            <li>Aggregation: giornaliera · Sync cadence: ogni ora</li>
            <li>Attiva e premi Manual Export per lo storico</li>
          </ol>
          <p className="text-[11.5px] text-muted">Il codice è personale: non condividerlo.</p>
        </div>
      )}
    </div>
  );
}

function CopyRow({ label, value, onCopy, secret }: { label: string; value: string; onCopy: () => void; secret?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.1em] text-muted mb-1">{label}</div>
      <button onClick={onCopy} className="w-full flex items-center gap-2 rounded-[12px] bg-card px-3 py-2.5 text-left">
        <span className={`flex-1 min-w-0 truncate text-[12.5px] font-mono ${secret ? "blur-[3px] hover:blur-0 transition" : ""}`}>{value}</span>
        <Copy size={15} className="text-gold shrink-0" />
      </button>
    </div>
  );
}
