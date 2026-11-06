import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Ricevitore per l'app iOS "Health Auto Export" (automazione REST API).
 * Header: Authorization: Bearer <ingest_token del profilo>
 */
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MAP: Record<string, string> = {
  step_count: "steps",
  active_energy: "active_kcal",
  basal_energy_burned: "basal_kcal",
  weight_body_mass: "weight",
  body_mass: "weight",
  body_fat_percentage: "body_fat",
  lean_body_mass: "lean_mass",
  body_mass_index: "bmi",
  resting_heart_rate: "rhr",
  heart_rate_variability: "hrv",
  heart_rate: "hr_avg",
  walking_heart_rate_average: "hr_walk",
  sleep_analysis: "sleep_hours",
  dietary_water: "water_ml",
  walking_running_distance: "distance_km",
  vo2_max: "vo2max",
  apple_exercise_time: "exercise_min",
  apple_stand_hour: "stand_h",
  flights_climbed: "floors",
  blood_oxygen_saturation: "spo2",
  respiratory_rate: "resp_rate",
  mindful_minutes: "mindful_min",
  dietary_energy: "food_kcal",
  protein: "protein_g",
  carbohydrates: "carbs_g",
  total_fat: "fat_g",
};
const SUM = new Set(["steps", "active_kcal", "basal_kcal", "water_ml", "distance_km", "exercise_min", "stand_h", "floors", "mindful_min", "food_kcal", "protein_g", "carbs_g", "fat_g"]);

function convert(metric: string, v: number, units?: string) {
  const u = (units || "").toLowerCase();
  if (metric.endsWith("kcal") && u === "kj") return v / 4.184;
  if (metric === "weight" || metric === "lean_mass") return u === "lb" || u === "lbs" ? v * 0.453592 : v;
  if (metric === "distance_km") return u === "mi" ? v * 1.60934 : u === "m" ? v / 1000 : v;
  if (metric === "water_ml") return u === "l" ? v * 1000 : u.includes("oz") ? v * 29.5735 : v;
  if ((metric === "body_fat" || metric === "spo2") && v <= 1) return v * 100;
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: true, info: "Habitus – ricevitore Apple Salute" });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Token mancante" }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prof } = await db.from("profiles").select("id").eq("ingest_token", token).maybeSingle();
  if (!prof) return json({ error: "Token non valido" }, 401);
  const uid = prof.id as string;

  let body: { data?: { metrics?: unknown[]; workouts?: unknown[] } };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON non valido" }, 400);
  }
  const data = body.data || (body as { metrics?: unknown[]; workouts?: unknown[] });
  const now = new Date().toISOString();

  // aggrega per giorno
  const agg = new Map<string, { sum: number; n: number; extra?: unknown }>();
  // deno-lint-ignore no-explicit-any
  for (const m of (data.metrics || []) as any[]) {
    const metric = MAP[m.name] || String(m.name || "").slice(0, 40);
    if (!metric) continue;
    for (const p of m.data || []) {
      const day = String(p.date || p.sleepEnd || p.endDate || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      let v: number | undefined;
      let extra: unknown;
      if (m.name === "sleep_analysis") {
        v = p.totalSleep ?? p.asleep ?? (p.inBed && p.awake != null ? p.inBed - p.awake : undefined);
        extra = { deep_h: p.deep, rem_h: p.rem, core_h: p.core, awake_h: p.awake, in_bed_h: p.inBed, start: p.sleepStart, end: p.sleepEnd };
      } else if (m.name === "heart_rate") {
        v = p.Avg ?? p.avg ?? p.qty;
        extra = { min: p.Min ?? p.min, max: p.Max ?? p.max };
      } else v = p.qty;
      if (typeof v !== "number" || !isFinite(v)) continue;
      v = convert(metric, v, m.units);
      const k = `${day}|${metric}`;
      const cur = agg.get(k) || { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      if (extra) cur.extra = extra;
      agg.set(k, cur);
    }
  }
  const rows = [...agg.entries()].map(([k, a]) => {
    const [day, metric] = k.split("|");
    return { user_id: uid, day, metric, source: "apple", value: SUM.has(metric) ? a.sum : a.sum / a.n, extra: a.extra ?? null, updated_at: now };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("health_metrics").upsert(rows.slice(i, i + 500), { onConflict: "user_id,day,metric,source" });
    if (error) return json({ error: error.message }, 500);
  }

  // deno-lint-ignore no-explicit-any
  const wrows = ((data.workouts || []) as any[]).map((w) => {
    const q = (x: unknown) => (x && typeof x === "object" ? (x as { qty?: number }).qty : typeof x === "number" ? x : null) ?? null;
    const kcalRaw = q(w.activeEnergyBurned ?? w.activeEnergy);
    const kcalU = (w.activeEnergyBurned?.units || w.activeEnergy?.units || "kcal").toLowerCase();
    const dist = q(w.distance);
    const distU = (w.distance?.units || "km").toLowerCase();
    return {
      user_id: uid,
      source: "apple",
      ext_id: String(w.id || `${w.name}-${w.start}`),
      start_at: w.start ? new Date(String(w.start).replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2")).toISOString() : null,
      end_at: w.end ? new Date(String(w.end).replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2")).toISOString() : null,
      sport: w.name || "Allenamento",
      kcal: kcalRaw == null ? null : kcalU === "kj" ? kcalRaw / 4.184 : kcalRaw,
      avg_hr: q(w.avgHeartRate) ?? w.heartRate?.avg?.qty ?? null,
      max_hr: q(w.maxHeartRate) ?? w.heartRate?.max?.qty ?? null,
      distance_m: dist == null ? null : distU === "mi" ? dist * 1609.34 : distU === "m" ? dist : dist * 1000,
      updated_at: now,
    };
  });
  if (wrows.length) {
    const { error } = await db.from("health_workouts").upsert(wrows, { onConflict: "user_id,source,ext_id" });
    if (error) return json({ error: error.message }, 500);
  }
  return json({ ok: true, metrics: rows.length, workouts: wrows.length });
});
