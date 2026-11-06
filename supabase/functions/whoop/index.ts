import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const APP_URL = "https://strategicforceagency-png.github.io/me-app/";
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whoop`;
const REDIRECT = `${FN_URL}/callback`;
const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API = "https://api.prod.whoop.com/developer";
const SCOPES = "offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cid = () => {
  const v = Deno.env.get("WHOOP_CLIENT_ID")?.trim();
  if (!v) throw new Error("WHOOP_CLIENT_ID mancante nei secrets di Supabase");
  return v;
};
const csec = () => {
  const v = Deno.env.get("WHOOP_CLIENT_SECRET")?.trim();
  if (!v) throw new Error("WHOOP_CLIENT_SECRET mancante nei secrets di Supabase");
  return v;
};

async function userFrom(req: Request) {
  const tok = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!tok) return null;
  const { data } = await admin().auth.getUser(tok);
  return data.user ?? null;
}

/* ---------------- token ---------------- */
async function tokenRequest(params: Record<string, string>) {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Whoop token: ${j.error_description || j.error || r.status}`);
  return j as { access_token: string; refresh_token?: string; expires_in: number };
}

type Conn = { user_id: string; whoop_user_id: number | null; access_token: string; refresh_token: string | null; expires_at: string };

async function accessToken(db: SupabaseClient, c: Conn) {
  if (new Date(c.expires_at).getTime() - Date.now() > 60_000) return c.access_token;
  if (!c.refresh_token) throw new Error("Whoop scollegato: ricollega l'account");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: c.refresh_token, client_id: cid(), client_secret: csec(), scope: "offline" });
  const upd = {
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? c.refresh_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  };
  await db.from("whoop_connections").update(upd).eq("user_id", c.user_id);
  Object.assign(c, upd);
  return t.access_token;
}

async function api(token: string, path: string, params: Record<string, string> = {}) {
  const u = new URL(API + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Whoop API ${path}: ${r.status} ${j.message || ""}`);
  return j;
}
// deno-lint-ignore no-explicit-any
async function collection(token: string, path: string, start: string): Promise<any[]> {
  // deno-lint-ignore no-explicit-any
  const out: any[] = [];
  let next: string | undefined;
  for (let page = 0; page < 20; page++) {
    const p: Record<string, string> = { start, limit: "25" };
    if (next) p.nextToken = next;
    const j = await api(token, path, p);
    if (!j) break;
    out.push(...(j.records || []));
    next = j.next_token || j.nextToken;
    if (!next) break;
  }
  return out;
}

/* ---------------- sync ---------------- */
function localDay(ts: string, offset?: string) {
  let mins = 60; // default Europe/Rome inverno
  const m = offset?.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (m) mins = (m[1] === "-" ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3]));
  return new Date(Date.parse(ts) + mins * 60_000).toISOString().slice(0, 10);
}

async function syncUser(db: SupabaseClient, c: Conn, days = 30) {
  const token = await accessToken(db, c);
  const start = new Date(Date.now() - days * 86400_000).toISOString();
  const uid = c.user_id;
  const rows: { user_id: string; day: string; metric: string; value: number; source: string; extra?: unknown; updated_at: string }[] = [];
  const now = new Date().toISOString();
  const put = (day: string, metric: string, value: unknown, extra?: unknown) => {
    if (typeof value === "number" && isFinite(value)) rows.push({ user_id: uid, day, metric, value, source: "whoop", extra, updated_at: now });
  };

  const [sleeps, recoveries, cycles, workouts] = await Promise.all([
    collection(token, "/v2/activity/sleep", start),
    collection(token, "/v2/recovery", start),
    collection(token, "/v2/cycle", start),
    collection(token, "/v2/activity/workout", start),
  ]);

  const sleepDay = new Map<string, string>();
  for (const s of sleeps) {
    const day = localDay(s.end || s.start, s.timezone_offset);
    sleepDay.set(String(s.id), day);
    if (s.nap || s.score_state !== "SCORED" || !s.score) continue;
    const st = s.score.stage_summary || {};
    const asleep = (st.total_in_bed_time_milli ?? 0) - (st.total_awake_time_milli ?? 0);
    put(day, "sleep_hours", asleep / 3_600_000, {
      light_h: (st.total_light_sleep_time_milli ?? 0) / 3_600_000,
      deep_h: (st.total_slow_wave_sleep_time_milli ?? 0) / 3_600_000,
      rem_h: (st.total_rem_sleep_time_milli ?? 0) / 3_600_000,
      awake_h: (st.total_awake_time_milli ?? 0) / 3_600_000,
      start: s.start,
      end: s.end,
    });
    put(day, "sleep_perf", s.score.sleep_performance_percentage);
    put(day, "sleep_eff", s.score.sleep_efficiency_percentage);
    put(day, "resp_rate", s.score.respiratory_rate);
  }
  for (const r of recoveries) {
    if (r.score_state !== "SCORED" || !r.score) continue;
    const day = sleepDay.get(String(r.sleep_id)) || localDay(r.created_at);
    put(day, "recovery", r.score.recovery_score);
    put(day, "hrv", r.score.hrv_rmssd_milli);
    put(day, "rhr", r.score.resting_heart_rate);
    put(day, "spo2", r.score.spo2_percentage);
    put(day, "skin_temp", r.score.skin_temp_celsius);
  }
  for (const cy of cycles) {
    if (!cy.score) continue;
    const day = localDay(cy.start, cy.timezone_offset);
    put(day, "strain", cy.score.strain);
    if (cy.score.kilojoule) put(day, "kcal_total", cy.score.kilojoule / 4.184);
  }
  const wrows = workouts
    .filter((w) => w.score)
    .map((w) => ({
      user_id: uid,
      source: "whoop",
      ext_id: String(w.id),
      start_at: w.start,
      end_at: w.end,
      sport: w.sport_name || "Allenamento",
      strain: w.score.strain ?? null,
      kcal: w.score.kilojoule ? w.score.kilojoule / 4.184 : null,
      avg_hr: w.score.average_heart_rate ?? null,
      max_hr: w.score.max_heart_rate ?? null,
      distance_m: w.score.distance_meter ?? null,
      updated_at: now,
    }));

  const body = await api(token, "/v2/user/measurement/body").catch(() => null);
  if (body?.weight_kilogram) put(localDay(now), "weight", body.weight_kilogram);

  if (rows.length) {
    const { error } = await db.from("health_metrics").upsert(rows, { onConflict: "user_id,day,metric,source" });
    if (error) throw new Error(error.message);
  }
  if (wrows.length) {
    const { error } = await db.from("health_workouts").upsert(wrows, { onConflict: "user_id,source,ext_id" });
    if (error) throw new Error(error.message);
  }
  await db.from("whoop_connections").update({ last_sync_at: now }).eq("user_id", uid);
  return { metrics: rows.length, workouts: wrows.length };
}

/* ---------------- webhook signature ---------------- */
async function validSignature(req: Request, raw: string) {
  const sig = req.headers.get("X-WHOOP-Signature");
  const ts = req.headers.get("X-WHOOP-Signature-Timestamp");
  if (!sig || !ts) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(csec()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts + raw)));
  let s = "";
  mac.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s) === sig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const db = admin();
  try {
    switch (route) {
      case "start": {
        const user = await userFrom(req);
        if (!user) return json({ error: "Non autenticato" }, 401);
        const state = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
        await db.from("whoop_oauth_states").insert({ state, user_id: user.id });
        const u = new URL(AUTH_URL);
        u.searchParams.set("response_type", "code");
        u.searchParams.set("client_id", cid());
        u.searchParams.set("redirect_uri", REDIRECT);
        u.searchParams.set("scope", SCOPES);
        u.searchParams.set("state", state);
        return json({ url: u.toString() });
      }
      case "callback": {
        const q = new URL(req.url).searchParams;
        const back = (r: string) => Response.redirect(`${APP_URL}?whoop=${encodeURIComponent(r)}`, 302);
        if (q.get("error")) return back("annullato");
        const { data: st } = await db.from("whoop_oauth_states").select("*").eq("state", q.get("state") || "").maybeSingle();
        if (!st) return back("errore-stato");
        await db.from("whoop_oauth_states").delete().eq("state", st.state);
        const t = await tokenRequest({
          grant_type: "authorization_code",
          code: q.get("code") || "",
          client_id: cid(),
          client_secret: csec(),
          redirect_uri: REDIRECT,
        });
        const prof = await api(t.access_token, "/v2/user/profile/basic").catch(() => null);
        const conn: Conn = {
          user_id: st.user_id,
          whoop_user_id: prof?.user_id ?? null,
          access_token: t.access_token,
          refresh_token: t.refresh_token ?? null,
          expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
        };
        const { error } = await db.from("whoop_connections").upsert({ ...conn, connected_at: new Date().toISOString() });
        if (error) return back("errore-salvataggio");
        try {
          await syncUser(db, conn, 30);
        } catch (_) {
          /* la sync riparte dall'app */
        }
        return back("ok");
      }
      case "webhook": {
        const raw = await req.text();
        if (!(await validSignature(req, raw))) return json({ error: "firma non valida" }, 401);
        const ev = JSON.parse(raw);
        const { data: c } = await db.from("whoop_connections").select("*").eq("whoop_user_id", ev.user_id).maybeSingle();
        if (c) {
          // deno-lint-ignore no-explicit-any
          const run = syncUser(db, c as Conn, 3).catch((e) => console.error("webhook sync", e));
          // deno-lint-ignore no-explicit-any
          (globalThis as any).EdgeRuntime?.waitUntil?.(run);
        }
        return json({ ok: true });
      }
      case "sync": {
        const user = await userFrom(req);
        if (!user) return json({ error: "Non autenticato" }, 401);
        const { data: c } = await db.from("whoop_connections").select("*").eq("user_id", user.id).maybeSingle();
        if (!c) return json({ error: "Whoop non collegato" }, 400);
        const b = await req.json().catch(() => ({}));
        return json(await syncUser(db, c as Conn, Math.min(Number(b.days) || 7, 90)));
      }
      case "disconnect": {
        const user = await userFrom(req);
        if (!user) return json({ error: "Non autenticato" }, 401);
        const { data: c } = await db.from("whoop_connections").select("*").eq("user_id", user.id).maybeSingle();
        if (c?.access_token) {
          await fetch(`${API}/v2/user/access`, { method: "DELETE", headers: { Authorization: `Bearer ${c.access_token}` } }).catch(() => {});
        }
        await db.from("whoop_connections").delete().eq("user_id", user.id);
        return json({ ok: true });
      }
      default:
        return json({ error: "Percorso sconosciuto" }, 404);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (route === "callback") return Response.redirect(`${APP_URL}?whoop=${encodeURIComponent("errore: " + msg.slice(0, 120))}`, 302);
    return json({ error: msg }, 500);
  }
});
