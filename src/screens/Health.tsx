import { motion } from "framer-motion";
import { Activity, Apple, Bell, Check, ChevronDown, Copy, Dumbbell, Flame, Footprints, HeartPulse, Link2, Loader2, Moon, RefreshCw, ShieldCheck, Sun, Unlink } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { PrimaryButton } from "../components/ui";
import { useApp } from "../lib/store";
import { Reminders, supabase, SUPABASE_KEY, SUPABASE_URL } from "../lib/supabase";
import { enablePush } from "../lib/push";
import { DEFAULT_REMINDERS } from "../components/Reminders";
import { consiglio, debito, ESERCIZIO_OBIETTIVO, LUCE_OBIETTIVO_MIN, luceMin, orari, PASSI_OBIETTIVO, prontezza, SONNO_OBIETTIVO, vsBase } from "../lib/salute";

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
  const today = new Date().toLocaleDateString("sv-SE");
  const todayOf = (k: string) => (last(k)?.day === today ? last(k)!.value : 0);

  const rec = last("recovery");
  const score = rec ? Math.round(rec.value) : prontezza(series.sleep_hours, series.hrv, series.rhr);
  const sl = last("sleep_hours");
  const hb = vsBase(series.hrv);
  const rb = vsBase(series.rhr);
  const rhrDelta = rb && isFinite(rb.base) ? rb.last.value - rb.base : undefined;
  const advice = score != null ? consiglio(score, sl?.value, rhrDelta) : null;
  const orario = orari(series.sleep_hours);
  const deb = debito(series.sleep_hours);
  const media7 = (k: string) => {
    const w = (series[k] || []).filter((r) => r.day !== today).slice(-7);
    return w.length ? w.reduce((a, r) => a + r.value, 0) / w.length : null;
  };
  const sleep7 = media7("sleep_hours");

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Salute</h1>
          <p className="text-muted text-[14px] mt-2">Come hai dormito, quanto sei carico, cosa fare oggi.</p>
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
          {hasData && score != null && advice && (
            <section className="mt-6 rounded-[24px] bg-surface shadow-soft p-5 lg:p-6">
              <div className="flex items-center gap-5">
                <Ring value={score} color={recColor(score)} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">{rec ? `Recovery · ${fmtDay(rec.day)}` : `Prontezza · ${sl ? fmtDay(sl.day) : "oggi"}`}</div>
                  <div className="font-display text-[26px] font-semibold leading-tight mt-1">{advice.titolo}</div>
                  <div className="text-[13.5px] text-muted mt-1 leading-snug">{advice.testo}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Chip label="Sonno" value={sl ? hm(sl.value) : "—"} note={sl ? (sl.value >= SONNO_OBIETTIVO ? "obiettivo raggiunto" : `${hm(SONNO_OBIETTIVO - sl.value)} sotto`) : ""} good={sl ? sl.value >= 7 : undefined} />
                <Chip label="HRV" value={hb ? `${Math.round(hb.last.value)} ms` : "—"} note={hb && isFinite(hb.base) ? `media ${Math.round(hb.base)}` : ""} good={hb && isFinite(hb.base) ? hb.last.value >= hb.base * 0.95 : undefined} />
                <Chip label="FC riposo" value={rb ? `${Math.round(rb.last.value)} bpm` : "—"} note={rb && isFinite(rb.base) ? `media ${Math.round(rb.base)}` : ""} good={rhrDelta != null ? rhrDelta <= 3 : undefined} />
              </div>
              {!rec && <p className="text-[11px] text-muted mt-3">Calcolata da sonno, HRV e battito a riposo rispetto alla tua media del mese.</p>}
            </section>
          )}

          {sl && (
            <section className="mt-6">
              <SectionTitle icon={<Moon size={13} />}>Sonno</SectionTitle>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[20px] bg-surface shadow-soft p-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[12px] text-muted">Notte · {fmtDay(sl.day)}</div>
                      <div className="text-[30px] font-semibold tracking-tight">{hm(sl.value)}</div>
                    </div>
                    {sl.extra?.start && sl.extra?.end && (
                      <div className="text-right text-[12.5px] text-muted">
                        {String(sl.extra.start).slice(11, 16)} → {String(sl.extra.end).slice(11, 16)}
                      </div>
                    )}
                  </div>
                  <Phases extra={sl.extra} />
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                    <div>
                      <div className="text-muted text-[12px]">Media 7 notti</div>
                      <div className="font-semibold">{sleep7 != null ? hm(sleep7) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted text-[12px]">Debito della settimana</div>
                      <div className={`font-semibold ${deb > 5 ? "text-danger" : ""}`}>{deb > 0.1 ? hm(deb) : "Nessuno"}</div>
                    </div>
                  </div>
                </div>
                {orario && (
                  <div className="rounded-[20px] bg-gold-tint border border-gold/30 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">Il sonno con un neonato</div>
                    <div className="font-display text-[26px] font-semibold mt-1">Ideale: a letto alle {orario.letto}</div>
                    <p className="text-[13.5px] text-muted mt-1 leading-snug">
                      Di solito ti addormenti verso le {orario.addormentamento} e ti svegli alle {orario.sveglia}. Con il piccolo le notti non le decidi tu: l'obiettivo è prendere il sonno quando arriva.
                    </p>
                    <ul className="mt-3 text-[13px] space-y-1.5">
                      <li>• Quando lui dorme la sera, vai a letto anche tu: niente telefono "solo cinque minuti"</li>
                      <li>• Se avete il biberon, alternate le notti: un turno intero vale più di due mezzi</li>
                      <li>• Un pisolino di 20 minuti nel primo pomeriggio, mai dopo le 16</li>
                      <li>• Caffè solo entro le 14, niente alcol la sera</li>
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {hasData && <Segnali series={series} />}

          {hasData && (
            <section className="mt-6">
              <SectionTitle icon={<Footprints size={13} />}>Oggi in movimento</SectionTitle>
              <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Goal label="Passi" icon={<Footprints size={15} />} value={todayOf("steps")} goal={PASSI_OBIETTIVO} fmt={(v) => Math.round(v).toLocaleString("it-IT")} avg={media7("steps")} />
                <Goal label="Esercizio" icon={<Flame size={15} />} value={todayOf("exercise_min")} goal={ESERCIZIO_OBIETTIVO} fmt={(v) => `${Math.round(v)} min`} avg={media7("exercise_min")} />
                <Goal label="Luce del giorno" icon={<Sun size={15} />} value={luceMin(todayOf("time_in_daylight"))} goal={LUCE_OBIETTIVO_MIN} fmt={(v) => `${Math.round(v)} min`} avg={media7("time_in_daylight") != null ? luceMin(media7("time_in_daylight")!) : null} />
                <Goal label="Ore in piedi" icon={<Activity size={15} />} value={todayOf("stand_h")} goal={12} fmt={(v) => `${Math.round(v)} h`} avg={media7("stand_h")} />
              </div>
              <p className="text-[11px] text-muted mt-2">I dati di oggi arrivano dall'iPhone ogni ora: in mattinata possono essere ancora parziali.</p>
            </section>
          )}

          {hasData && (
            <section className="mt-6">
              <SectionTitle icon={<HeartPulse size={13} />}>Cuore e forma</SectionTitle>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    ["vo2max", "VO₂ max", (v: number) => v.toFixed(1), "Capacità aerobica: sale con il cardio"],
                    ["resp_rate", "Respiro di notte", (v: number) => `${v.toFixed(1)}/min`, "Se sale molto, spesso è stanchezza"],
                    ["spo2", "Ossigeno", (v: number) => `${Math.round(v)}%`, "Normale sopra il 95%"],
                    ["walking_speed", "Passo", (v: number) => `${v.toFixed(1)} km/h`, "Velocità di camminata"],
                    ["breathing_disturbances", "Disturbi del respiro", (v: number) => v.toFixed(1), "Episodi/ora di notte: normale sotto 5"],
                    ["headphone_audio_exposure", "Volume in cuffia", (v: number) => `${Math.round(v)} dB`, "Media del giorno: meglio sotto 80"],
                    ["weight", "Peso", (v: number) => `${v.toFixed(1)} kg`, ""],
                    ["body_fat", "Massa grassa", (v: number) => `${v.toFixed(1)}%`, ""],
                    ["strain", "Strain", (v: number) => v.toFixed(1), ""],
                  ] as [string, string, (v: number) => string, string][]
                )
                  .filter(([k]) => last(k))
                  .map(([k, label, f, note]) => (
                    <div key={k} className="rounded-[18px] bg-surface shadow-soft p-4">
                      <div className="text-muted text-[12px]">{label}</div>
                      <div className="text-[21px] font-semibold mt-1 tracking-tight">{f(last(k)!.value)}</div>
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">{note || fmtDay(last(k)!.day)}</div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {hasData && (
            <section className="mt-6">
              <SectionTitle>Ultimi 14 giorni</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {series.sleep_hours && <Trend title="Sonno" rows={series.sleep_hours} fmt={hm} color={(v) => (v >= 7 ? "rgb(var(--ok))" : v >= 6 ? "rgb(var(--warn))" : "rgb(var(--bad))")} />}
                {series.recovery && <Trend title="Recovery" rows={series.recovery} max={100} color={(v) => recColor(v)} fmt={(v) => `${Math.round(v)}%`} />}
                {series.rhr && <Trend title="FC a riposo" rows={series.rhr} fmt={(v) => `${Math.round(v)} bpm`} relative />}
                {series.hrv && <Trend title="HRV" rows={series.hrv} fmt={(v) => `${Math.round(v)} ms`} />}
                {series.steps && <Trend title="Passi" rows={series.steps} fmt={(v) => Math.round(v).toLocaleString("it-IT")} />}
                {series.weight && <Trend title="Peso" rows={series.weight} fmt={(v) => `${v.toFixed(1)} kg`} relative />}
              </div>
            </section>
          )}

          <HealthNotifications letto={orario?.letto} />

          {workouts.length > 0 && (
            <section className="mt-8">
              <SectionTitle icon={<Dumbbell size={13} />}>Allenamenti recenti</SectionTitle>
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
            <SectionTitle>Collegamenti</SectionTitle>
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

/** Battito, temperatura, respiro e HRV dell'ultima notte rispetto alla mediana del mese. */
function Segnali({ series }: { series: Record<string, Row[]> }) {
  const at = (k: string) => {
    const a = series[k] || [];
    const last = a[a.length - 1];
    if (!last) return null;
    const prev = a.slice(-31, -1).map((r) => r.value).sort((x, y) => x - y);
    if (prev.length < 7) return null;
    const m = Math.floor(prev.length / 2);
    const b = prev.length % 2 ? prev[m] : (prev[m - 1] + prev[m]) / 2;
    return { v: last.value, b, day: last.day };
  };
  const rhr = at("rhr"), temp = at("skin_temp") || at("apple_sleeping_wrist_temperature"), resp = at("resp_rate"), hrv = at("hrv");
  const items = [
    rhr && { label: "Battito a riposo", val: `${Math.round(rhr.v)} bpm`, d: `${rhr.v - rhr.b >= 0 ? "+" : "−"}${Math.abs(Math.round(rhr.v - rhr.b))} sulla media`, bad: rhr.v - rhr.b >= 5, strong: true },
    temp && { label: "Temperatura notte", val: `${temp.v.toFixed(1)}°`, d: `${temp.v - temp.b >= 0 ? "+" : "−"}${Math.abs(temp.v - temp.b).toFixed(1)}° sulla media`, bad: temp.v - temp.b >= 0.5, strong: true },
    resp && { label: "Respiro di notte", val: `${resp.v.toFixed(1)}/min`, d: `${resp.v - resp.b >= 0 ? "+" : "−"}${Math.abs(resp.v - resp.b).toFixed(1)} sulla media`, bad: resp.v - resp.b >= 1, strong: false },
    hrv && { label: "HRV", val: `${Math.round(hrv.v)} ms`, d: `${hrv.v >= hrv.b ? "+" : "−"}${Math.abs(Math.round((hrv.v / hrv.b - 1) * 100))}% sulla media`, bad: hrv.v <= hrv.b * 0.8, strong: false },
  ].filter(Boolean) as { label: string; val: string; d: string; bad: boolean; strong: boolean }[];
  if (!items.length) return null;
  const n = items.filter((x) => x.bad).length;
  const forti = items.filter((x) => x.bad && x.strong).length;
  const allerta = n >= 3 || (forti >= 1 && n >= 2) || forti >= 2;
  return (
    <section className="mt-6">
      <SectionTitle icon={<ShieldCheck size={13} />}>Segnali del corpo</SectionTitle>
      <div className={`mt-3 rounded-[20px] p-5 ${allerta ? "bg-danger-tint" : "bg-surface shadow-soft"}`}>
        <div className="font-semibold text-[15.5px]">{allerta ? "Il corpo sta combattendo qualcosa" : n ? "Un segnale fuori dalla norma, niente di preoccupante" : "Tutto nella tua norma"}</div>
        <p className="text-[13px] text-muted mt-1 leading-snug">
          {allerta
            ? "Spesso succede 1-2 giorni prima di un malanno, o dopo stress e notti difficili. Oggi acqua, niente alcol, allenamento leggero e appena puoi, dormi."
            : "Confronto l'ultima notte con la tua media del mese. Se più segnali salgono insieme ti avviso al mattino."}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {items.map((x) => (
            <div key={x.label} className="rounded-[14px] bg-card px-3 py-2.5">
              <div className="text-[11px] text-muted flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${x.bad ? "bg-[rgb(var(--bad))]" : "bg-[rgb(var(--ok))]"}`} /> {x.label}
              </div>
              <div className="text-[16px] font-semibold mt-0.5">{x.val}</div>
              <div className="text-[10.5px] text-muted">{x.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
      {icon ? <span className="text-gold">{icon}</span> : <span className="h-1.5 w-1.5 rounded-full bg-gold" />} {children}
    </h2>
  );
}

function Chip({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) {
  return (
    <div className="rounded-[14px] bg-card px-3 py-2.5">
      <div className="text-[11px] text-muted flex items-center gap-1">
        {good != null && <span className={`h-1.5 w-1.5 rounded-full ${good ? "bg-[rgb(var(--ok))]" : "bg-[rgb(var(--warn))]"}`} />}
        {label}
      </div>
      <div className="text-[16px] font-semibold mt-0.5">{value}</div>
      <div className="text-[10.5px] text-muted truncate">{note}</div>
    </div>
  );
}

function Phases({ extra }: { extra: Row["extra"] }) {
  if (!extra) return null;
  const parts = [
    ["Profondo", Number(extra.deep_h) || 0, "#3B4BA8"],
    ["REM", Number(extra.rem_h) || 0, "#7C6CD8"],
    ["Leggero", Number(extra.core_h) || 0, "#9FB6E8"],
    ["Sveglio", Number(extra.awake_h) || 0, "rgb(var(--warn))"],
  ] as [string, number, string][];
  const tot = parts.reduce((a, p) => a + p[1], 0);
  if (!tot) return null;
  return (
    <div className="mt-3">
      <div className="flex h-2.5 rounded-full overflow-hidden">
        {parts.map(([l, v, c]) => v > 0 && <div key={l} style={{ width: `${(v / tot) * 100}%`, background: c }} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
        {parts.map(([l, v, c]) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} /> {l} {hm(v)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Goal({ label, icon, value, goal, fmt, avg }: { label: string; icon: ReactNode; value: number; goal: number; fmt: (v: number) => string; avg: number | null }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div className="rounded-[18px] bg-surface shadow-soft p-4">
      <div className="flex items-center gap-1.5 text-muted text-[12px]">
        <span className="text-gold">{icon}</span> {label}
      </div>
      <div className="text-[21px] font-semibold mt-1 tracking-tight">{fmt(value)}</div>
      <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: pct >= 100 ? "rgb(var(--ok))" : "rgb(var(--gold))" }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
      <div className="text-[11px] text-muted mt-1.5">
        Obiettivo {fmt(goal)}
        {avg != null ? ` · media ${fmt(avg)}` : ""}
      </div>
    </div>
  );
}

const NOTIFICHE: { k: string; label: string; hint: (letto?: string) => string }[] = [
  { k: "salute_allerta_on", label: "Allarme malanno", hint: () => "Al mattino, se battito, temperatura, respiro e HRV dicono che il corpo sta combattendo qualcosa" },
  { k: "salute_cuffie_on", label: "Volume in cuffia", hint: () => "Alle 21 se in giornata hai ascoltato sopra gli 80 dB" },
  { k: "salute_mattina_on", label: "Com'è andata la notte", hint: () => "Al risveglio: sonno, prontezza e come impostare la giornata" },
  { k: "salute_luce_on", label: "Luce del giorno", hint: () => "Alle 13 se hai preso poco sole: 15 minuti fuori" },
  { k: "salute_passi_on", label: "Muoviti", hint: () => "Alle 17:30 se sei sotto i 5.000 passi" },
  { k: "salute_letto_on", label: "Ora di staccare", hint: (l) => `La sera${l ? ` verso le ${l.replace(/^(\d+):(\d+)$/, (_, h, m) => { const t = (+h * 60 + +m - 45 + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })}` : ""}: luci basse, e se il piccolo dorme, a letto anche tu` },
  { k: "salute_settimana_on", label: "La settimana in salute", hint: () => "Domenica alle 18: sonno, passi e battito a confronto" },
];

function HealthNotifications({ letto }: { letto?: string }) {
  const app = useApp();
  const r = { ...DEFAULT_REMINDERS, ...(app.profile?.promemoria || {}) };
  const [busy, setBusy] = useState(false);
  const save = (patch: Record<string, unknown>) => app.setProfile({ promemoria: { ...r, ...patch } as Reminders });
  const attiva = async () => {
    setBusy(true);
    try {
      await enablePush();
      await save({ attivi: true });
      app.toast("Notifiche attive");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <section className="mt-8">
      <SectionTitle icon={<Bell size={13} />}>Notifiche per stare meglio</SectionTitle>
      <div className="mt-3 rounded-[20px] bg-surface shadow-soft px-5 py-2">
        {!r.attivi && (
          <div className="py-3 flex items-center gap-3">
            <div className="flex-1 text-[13px] text-muted">Le notifiche su questo telefono sono spente.</div>
            <button onClick={attiva} disabled={busy} className="h-9 px-4 rounded-full bg-brand text-brand-fg text-[13px] font-semibold flex items-center gap-1.5">
              {busy && <Loader2 size={14} className="animate-spin" />} Attiva
            </button>
          </div>
        )}
        <div className="divide-y divide-line">
          {NOTIFICHE.map((n) => {
            const en = r[n.k] !== false;
            return (
              <div key={n.k} className="flex items-center gap-3 py-3">
                <button onClick={() => save({ [n.k]: !en })} className={`h-6 w-10 rounded-full relative transition shrink-0 ${en ? "bg-brand" : "bg-line"}`} aria-label={n.label}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${en ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium">{n.label}</div>
                  <div className="text-[12px] text-muted">{n.hint(letto)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
