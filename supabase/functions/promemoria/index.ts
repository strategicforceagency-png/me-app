import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { generateVapid, sendPush, b64u, vapidPublicRaw, type VapidJwk, type Sub } from "./webpush.ts";

/**
 * Habitus – promemoria push.
 *  GET  /vapid        chiave pubblica per iscriversi
 *  POST /subscribe    salva l'iscrizione del dispositivo (utente autenticato)
 *  POST /unsubscribe  rimuove l'iscrizione
 *  POST /test         invia una notifica di prova
 *  POST /tick         chiamato ogni 5 minuti da pg_cron (header x-cron)
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SUBJECT = "https://strategicforceagency-png.github.io/me-app/";
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

let vapidCache: VapidJwk | null = null;
async function vapid(sb: ReturnType<typeof admin>) {
  if (vapidCache) return vapidCache;
  const { data } = await sb.from("app_secrets").select("value").eq("name", "vapid").maybeSingle();
  if (data) return (vapidCache = JSON.parse(data.value));
  const v = await generateVapid();
  await sb.from("app_secrets").upsert({ name: "vapid", value: JSON.stringify(v) });
  return (vapidCache = v);
}

async function userFrom(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data } = await sb.auth.getUser(auth.replace("Bearer ", ""));
  return data.user;
}

/** Salva la notifica nell'area notifiche dell'app (resta anche se il telefono la perde). */
async function store(sb: ReturnType<typeof admin>, userId: string, msg: { title: string; body: string; url?: string; tag?: string }) {
  const vai = new URL(msg.url || "./", SUBJECT).searchParams.get("vai");
  await sb.from("notifications").insert({ user_id: userId, kind: msg.tag || "info", titolo: msg.title, testo: msg.body, vai });
}
async function unread(sb: ReturnType<typeof admin>, userId: string) {
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("letta", false);
  return count || 0;
}

async function deliver(sb: ReturnType<typeof admin>, userId: string, msg: { title: string; body: string; url?: string; tag?: string; count?: number }) {
  const v = await vapid(sb);
  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  let ok = 0;
  for (const s of (subs || []) as Sub[]) {
    try {
      const st = await sendPush(s, msg, v, SUBJECT);
      if (st === 404 || st === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      else if (st < 300) ok++;
      else console.log("push status", st);
    } catch (e) {
      console.log("push error", String(e));
    }
  }
  return { ok, total: subs?.length || 0 };
}

function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { day: `${parts.year}-${parts.month}-${parts.day}`, min: (+parts.hour % 24) * 60 + +parts.minute, wd };
}
const toMin = (s: string) => {
  const [h, m] = (s || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const weekOf = (start: string | null, today: string) => {
  if (!start) return 1;
  const d = Math.floor((Date.parse(today) - Date.parse(start)) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(d / 7) + 1));
};


/* ---------- Salute: notifiche a regole (nessun costo AI) ---------- */
const SONNO_OB = 7.5;
const med = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const cl = (v: number) => Math.max(0, Math.min(100, v));
const hmS = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;
const hhmmS = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
const minOfS = (iso: string) => {
  const m = /(\d{2}):(\d{2})/.exec(String(iso).slice(11));
  return m ? +m[1] * 60 + +m[2] : NaN;
};
type HRow = { day: string; metric: string; value: number; source: string; extra: Record<string, unknown> | null; updated_at: string };

async function healthData(sb: ReturnType<typeof admin>, uid: string, today: string) {
  const since = new Date(Date.parse(today) - 40 * 86400000).toISOString().slice(0, 10);
  const { data } = await sb.from("health_metrics").select("day, metric, value, source, extra, updated_at").eq("user_id", uid).gte("day", since).in("metric", ["sleep_hours", "hrv", "rhr", "steps", "exercise_min", "time_in_daylight", "recovery", "resp_rate", "apple_sleeping_wrist_temperature", "skin_temp", "headphone_audio_exposure"]).order("day");
  const by: Record<string, HRow[]> = {};
  for (const r of (data || []) as HRow[]) {
    const a = (by[r.metric] ||= []);
    const i = a.findIndex((x) => x.day === r.day);
    if (i < 0) a.push(r);
    else if (r.source === "whoop" && !["steps", "time_in_daylight", "exercise_min"].includes(r.metric)) a[i] = r;
  }
  return by;
}
const base = (a: HRow[] | undefined) => (a && a.length ? { last: a[a.length - 1], base: a.length > 5 ? med(a.slice(-31, -1).map((r) => r.value)) : NaN } : null);
/** Segnali che il corpo sta combattendo qualcosa: confronto dell'ultima notte con la mediana del mese. */
function segnali(d: Record<string, HRow[]>, day: string) {
  const at = (k: string) => {
    const a = d[k] || [];
    const last = a[a.length - 1];
    if (!last || last.day !== day) return null;
    const prev = a.slice(-31, -1).map((r) => r.value);
    return prev.length >= 7 ? { v: last.value, b: med(prev) } : null;
  };
  const out: string[] = [];
  let forti = 0;
  const rhr = at("rhr"), hrv = at("hrv"), resp = at("resp_rate"), temp = at("skin_temp") || at("apple_sleeping_wrist_temperature");
  if (rhr && rhr.v - rhr.b >= 5) { out.push(`battito a riposo +${Math.round(rhr.v - rhr.b)}`); forti++; }
  if (temp && temp.v - temp.b >= 0.5) { out.push(`temperatura +${(temp.v - temp.b).toFixed(1)}°`); forti++; }
  if (hrv && hrv.v <= hrv.b * 0.8) out.push(`HRV −${Math.round((1 - hrv.v / hrv.b) * 100)}%`);
  if (resp && resp.v - resp.b >= 1) out.push(`respiro +${(resp.v - resp.b).toFixed(1)}/min`);
  return { lista: out, allerta: out.length >= 3 || (forti >= 1 && out.length >= 2) || forti >= 2 };
}
function lettoMin(sleep: HRow[] | undefined) {
  const w = (sleep || []).slice(-14).filter((r) => r.extra?.start && r.extra?.end);
  if (w.length < 3) return null;
  const wake = med(w.map((r) => minOfS(String(r.extra!.end))));
  let t = Math.round((wake - SONNO_OB * 60 - 15) / 15) * 15;
  if (t < 720) t += 1440;
  return Math.max(22.5 * 60, Math.min(25 * 60, t)) % 1440;
}

// deno-lint-ignore no-explicit-any
async function saluteTick(sb: ReturnType<typeof admin>, p: any, s: any, now: { day: string; min: number; wd: number }) {
  const out: { kind: string; msg: { title: string; body: string; url?: string; tag?: string }; inApp?: boolean }[] = [];
  const on = (k: string) => s[k] !== false;
  const win = (at: number, w = 15) => ((now.min - at + 1440) % 1440) < w;
  const kinds: string[] = [];
  if (on("salute_mattina_on") && now.min >= 7 * 60 && now.min < 12 * 60) kinds.push("salute_mattina");
  if (on("salute_luce_on") && win(13 * 60)) kinds.push("salute_luce");
  if (on("salute_passi_on") && win(17 * 60 + 30)) kinds.push("salute_passi");
  if (on("salute_settimana_on") && now.wd === 0 && win(18 * 60)) kinds.push("salute_settimana");
  if (on("salute_letto_on")) kinds.push("salute_letto");
  if (on("salute_allerta_on") && now.min >= 6 * 60 && now.min < 13 * 60) kinds.push("salute_allerta");
  if (on("salute_cuffie_on") && win(21 * 60)) kinds.push("salute_cuffie");
  if (!kinds.length) return out;
  // già inviate oggi?
  const { data: sent } = await sb.from("push_log").select("kind").eq("user_id", p.id).eq("day", now.day).in("kind", kinds);
  const done = new Set((sent || []).map((x) => x.kind));
  const todo = kinds.filter((k) => !done.has(k));
  if (!todo.length) return out;
  const d = await healthData(sb, p.id, now.day);
  if (!Object.keys(d).length) return out;
  const todayV = (k: string) => {
    const a = d[k];
    const r = a?.[a.length - 1];
    return r && r.day === now.day ? r : null;
  };
  const fresh = (r: HRow | null, h = 2) => !!r && Date.now() - Date.parse(r.updated_at) < h * 3600000;

  for (const kind of todo) {
    if (kind === "salute_mattina") {
      const sl = todayV("sleep_hours");
      if (!sl) continue;
      // aspetta che il risveglio sia passato da almeno 20 minuti (dati completi)
      const end = sl.extra?.end ? Date.parse(String(sl.extra.end).replace(" ", "T").replace(" ", "")) : NaN;
      if (isFinite(end) && Date.now() - end < 20 * 60000) continue;
      const h = base(d.hrv), r = base(d.rhr), rec = todayV("recovery");
      const parts: { w: number; v: number }[] = [{ w: 0.4, v: cl((sl.value / SONNO_OB) * 100) }];
      if (h && isFinite(h.base)) parts.push({ w: 0.35, v: cl(60 + ((h.last.value - h.base) / h.base) * 200) });
      if (r && isFinite(r.base)) parts.push({ w: 0.25, v: cl(60 + (r.base - r.last.value) * 6) });
      const score = rec ? Math.round(rec.value) : Math.round(parts.reduce((a, x) => a + x.v * x.w, 0) / parts.reduce((a, x) => a + x.w, 0));
      const rd = r && isFinite(r.base) ? r.last.value - r.base : 0;
      const debt = (d.sleep_hours || []).slice(-7).reduce((a, x) => a + Math.max(0, SONNO_OB - x.value), 0);
      let consiglio: string;
      if (score >= 70) consiglio = "Hai recuperato bene: buona giornata per spingere in allenamento.";
      else if (score >= 45) consiglio = sl.value < 6 ? "Giornata moderata. Caffè solo entro le 14 e 10 minuti di sole stamattina." : "Giornata moderata: allenati, ma senza cercare il massimo.";
      else consiglio = `${rd >= 5 ? "Battito a riposo alto: " : ""}oggi recupero. Camminata, acqua, niente alcol stasera.`;
      const sera = sl.value < 6 ? " Se riesci, un pisolino di 20 minuti nel primo pomeriggio." : "";
      out.push({ kind, inApp: true, msg: { title: `Notte: ${hmS(sl.value)} · prontezza ${score}`, body: `${consiglio}${sera}${debt > 5 ? ` Debito della settimana: ${hmS(debt)}.` : ""}`, url: "./?vai=salute", tag: "salute" } });
    }
    if (kind === "salute_allerta") {
      if (!todayV("sleep_hours") && !todayV("rhr")) continue;
      const sg = segnali(d, now.day);
      if (!sg.allerta) continue;
      out.push({ kind, inApp: true, msg: { title: "Il corpo sta lavorando sodo", body: `Stanotte: ${sg.lista.join(", ")} rispetto alla tua media. Spesso succede 1-2 giorni prima di un malanno, o dopo stress e notti difficili. Oggi: acqua, niente alcol, allenamento leggero o riposo, e appena il piccolo dorme, dormi anche tu.`, url: "./?vai=salute", tag: "salute" } });
    }
    if (kind === "salute_cuffie") {
      const h = todayV("headphone_audio_exposure");
      if (!h || h.value < 80) continue;
      out.push({ kind, msg: { title: "Volume alto in cuffia", body: `Oggi una media di ${Math.round(h.value)} dB. Sopra gli 80 l'udito si affatica: domani abbassa di un paio di tacche, le orecchie ringraziano.`, url: "./?vai=salute", tag: "salute" } });
    }
    if (kind === "salute_luce") {
      const l = todayV("time_in_daylight");
      if (!fresh(todayV("steps"))) continue; // senza dati recenti non diciamo nulla
      const min = l ? (l.value <= 24 ? l.value * 60 : l.value) : 0;
      if (min >= 15) continue;
      out.push({ kind, msg: { title: "Un po' di sole", body: `Oggi hai preso ${Math.round(min)} minuti di luce naturale. Quindici minuti fuori ora aiutano umore, energia e il sonno di stanotte.`, url: "./?vai=salute", tag: "salute" } });
    }
    if (kind === "salute_passi") {
      const st = todayV("steps");
      if (!fresh(st)) continue;
      if (st!.value >= 5000) continue;
      out.push({ kind, msg: { title: `${Math.round(st!.value).toLocaleString("it-IT")} passi finora`, body: "Una passeggiata di 30 minuti prima di cena: sono circa 3.500 passi, e la sera dormirai meglio.", url: "./?vai=salute", tag: "salute" } });
    }
    if (kind === "salute_letto") {
      const lm = lettoMin(d.sleep_hours);
      if (lm == null || !win((lm - 45 + 1440) % 1440)) continue;
      const sl = d.sleep_hours?.[d.sleep_hours.length - 1];
      const poco = sl && sl.value < 6.5 ? ` Ieri notte ${hmS(sl.value)}: ogni ora prima di mezzanotte vale doppio.` : "";
      out.push({ kind, msg: { title: "Ora di staccare", body: `Luci basse e telefono lontano. Se il piccolo dorme, approfittane e vai a letto anche tu.${poco}`, url: "./?vai=salute", tag: "salute" } });
    }
    if (kind === "salute_settimana") {
      const avg = (k: string, from: number, to: number) => {
        const a = (d[k] || []).filter((r) => { const n = (Date.parse(now.day) - Date.parse(r.day)) / 86400000; return n >= from && n < to; }).map((r) => r.value);
        return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      };
      const s1 = avg("sleep_hours", 0, 7), s0 = avg("sleep_hours", 7, 14), p1 = avg("steps", 0, 7), r1 = avg("rhr", 0, 7), r0 = avg("rhr", 7, 14);
      if (s1 == null) continue;
      const bits = [`sonno medio ${hmS(s1)}${s0 != null ? ` (${s1 >= s0 ? "+" : "−"}${Math.round(Math.abs(s1 - s0) * 60)} min)` : ""}`];
      if (p1 != null) bits.push(`${Math.round(p1).toLocaleString("it-IT")} passi al giorno`);
      if (r1 != null && r0 != null) bits.push(`battito a riposo ${Math.round(r1)} bpm (${r1 <= r0 ? "in calo" : "in salita"})`);
      const focus = s1 < 6.5 ? "Priorità della prossima settimana: a letto appena il piccolo si addormenta, e un pisolino quando puoi." : p1 != null && p1 < 7000 ? "Prossima settimana: una camminata al giorno." : "Ottima settimana: continua così.";
      out.push({ kind, inApp: true, msg: { title: "La tua settimana in salute", body: `${bits.join(" · ")}. ${focus}`, url: "./?vai=salute", tag: "salute" } });
    }
  }
  return out;
}

// deno-lint-ignore no-explicit-any
async function compose(sb: ReturnType<typeof admin>, p: any, kind: string, day: string, wd: number) {
  const nome = (p.nome || "").split(" ")[0];
  if (kind === "ricorrenze") {
    const { data: people } = await sb.from("people").select("id, nome, relazione, date, pensierino_ogni, ultimo_pensierino, serata_ogni, ultima_serata, created_at").eq("user_id", p.id);
    const today = Date.parse(day + "T00:00:00Z");
    const lines: string[] = [];
    for (const x of people || []) {
      for (const d of (x.date || []) as { tipo: string; data: string }[]) {
        const mmdd = String(d.data || "").slice(-5);
        if (!/^\d{2}-\d{2}$/.test(mmdd)) continue;
        let next = Date.parse(`${day.slice(0, 4)}-${mmdd}T00:00:00Z`);
        if (next < today) next = Date.parse(`${+day.slice(0, 4) + 1}-${mmdd}T00:00:00Z`);
        const n = Math.round((next - today) / 86400000);
        if ([14, 7, 3, 1, 0].includes(n)) lines.push(n === 0 ? `Oggi: ${d.tipo} di ${x.nome}` : n === 1 ? `Domani: ${d.tipo} di ${x.nome}` : `Tra ${n} giorni: ${d.tipo} di ${x.nome}`);
      }
      if (x.pensierino_ogni) {
        const last = Date.parse((x.ultimo_pensierino || String(x.created_at).slice(0, 10)) + "T00:00:00Z");
        const since = Math.round((today - last) / 86400000);
        if (since >= x.pensierino_ogni && since % 3 === 0) lines.push(`Un pensierino per ${x.nome}? Sono ${since} giorni dall'ultimo`);
      }
      if (x.serata_ogni) {
        const last = Date.parse((x.ultima_serata || String(x.created_at).slice(0, 10)) + "T00:00:00Z");
        const since = Math.round((today - last) / 86400000);
        if (since >= x.serata_ogni && since % 2 === 0) lines.push(`Stasera una serata a casa per te e ${x.nome}? Ho tre idee pronte`);
      }
    }
    const tomorrow = new Date(today + 86400000).toISOString().slice(0, 10);
    const { data: outs } = await sb.from("outings").select("titolo, ora, data").eq("user_id", p.id).in("data", [day, tomorrow]).neq("stato", "fatto");
    for (const o of outs || []) lines.push(`${o.data === day ? "Stasera" : "Domani"}: ${o.titolo}${o.ora ? " alle " + o.ora : ""}`);
    if (!lines.length) return null;
    return { title: lines.length === 1 ? "Da gentleman" : `Da gentleman · ${lines.length} promemoria`, body: lines.join(" · "), url: "./?vai=persone", tag: "ricorrenze" };
  }
  const path = p.path;
  if (!path) return kind === "mattina" ? { title: `Buongiorno${nome ? ", " + nome : ""}`, body: "Il tuo percorso ti aspetta: completa il questionario d'ingresso.", url: "./" } : null;
  const week = weekOf(p.path_started_at, day);
  // deno-lint-ignore no-explicit-any
  const habits = (path.abitudini || []).filter((h: any) => (h.dalla_settimana || 1) <= week);
  const { data: checks } = await sb.from("path_checks").select("key, day").eq("user_id", p.id).in("day", [day, "1970-01-01"]);
  const done = new Set((checks || []).map((c) => `${c.key}|${c.day}`));
  // deno-lint-ignore no-explicit-any
  const hDone = habits.filter((h: any) => done.has(`h:${h.id}|${day}`)).length;
  // deno-lint-ignore no-explicit-any
  const w = (path.settimane || []).find((s: any) => s.n === week);
  // deno-lint-ignore no-explicit-any
  const mission = w?.missioni?.find((m: any) => !done.has(`m:${m.id}|1970-01-01`));
  // deno-lint-ignore no-explicit-any
  const session = (path.allenamento?.sessioni || []).find((s: any) => String(s.giorno).slice(0, 3).toLowerCase() === GIORNI[wd].toLowerCase());

  if (kind === "mattina") {
    const bits = [`${habits.length} abitudini`, session ? `allenamento: ${session.nome}` : "riposo attivo"];
    if (mission) bits.push(`missione: ${mission.titolo}`);
    return { title: `Buongiorno${nome ? ", " + nome : ""}`, body: `Oggi · ${bits.join(" · ")}`, url: "./", tag: "mattina" };
  }
  if (kind === "sera") {
    const left = habits.length - hDone;
    return {
      title: left ? `Ti mancano ${left} abitudini` : "Giornata completa",
      body: left ? `Hai fatto ${hDone} di ${habits.length}. C'è ancora tempo: spunta le ultime e prepara i vestiti per domani.` : "Tutte le abitudini fatte. Prepara i vestiti per domani e buon riposo.",
      url: "./",
      tag: "sera",
    };
  }
  if (kind === "revisione") {
    const { data: r } = await sb.from("path_reviews").select("week").eq("user_id", p.id).eq("week", week).maybeSingle();
    if (r) return null;
    return { title: "Il controllo della settimana", body: `Settimana ${week}: cinque minuti per fare il punto. Il percorso si adatta alle tue risposte.`, url: "./?vai=revisione", tag: "revisione" };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const sb = admin();
  try {
    if (route === "vapid") {
      const v = await vapid(sb);
      return json({ key: b64u(vapidPublicRaw(v)) });
    }

    if (route === "invia") {
      // usato dalle altre funzioni (armadio) per mandare una notifica: area notifiche + push
      const { data: sec } = await sb.from("app_secrets").select("value").eq("name", "cron").single();
      if (!sec || req.headers.get("x-cron") !== sec.value) return json({ error: "no" }, 401);
      const b = await req.json();
      const msg = { title: String(b.title || "Habitus"), body: String(b.body || ""), url: b.url, tag: b.tag };
      await store(sb, b.user_id, msg);
      const { data: pr } = await sb.from("profiles").select("promemoria").eq("id", b.user_id).maybeSingle();
      const r = pr?.promemoria?.attivi ? await deliver(sb, b.user_id, { ...msg, count: await unread(sb, b.user_id) }) : { ok: 0, total: 0 };
      return json(r);
    }

    if (route === "tick") {
      const { data: sec } = await sb.from("app_secrets").select("value").eq("name", "cron").single();
      if (!sec || req.headers.get("x-cron") !== sec.value) return json({ error: "no" }, 401);
      const { data: profs } = await sb.from("profiles").select("id, nome, path, path_started_at, promemoria, armadio_revisione");
      let sent = 0;
      const avvia = (user_id: string, tipo: string) =>
        // deno-lint-ignore no-explicit-any
        (globalThis as any).EdgeRuntime?.waitUntil(
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/armadio/cron`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": sec.value }, body: JSON.stringify({ user_id, tipo }) }).then((r) => r.text()).catch(() => null),
        );
      // incarichi di Alfred arrivati all'ora stabilita (o rimasti bloccati)
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil(
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/incarichi/cron`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": sec.value }, body: "{}" }).then((r) => r.text()).catch(() => null),
      );
      for (const p of profs || []) {
        const s = p.promemoria || {};
        {
          // armadio: meteo del mattino (adatta l'outfit pianificato) e revisione ogni 15 giorni
          const now = localNow(s.tz || "Europe/Rome");
          const at = toMin(s.meteo || "07:00");
          if (s.meteo_on !== false && now.min - at >= 0 && now.min - at < 15) {
            const { count: pian } = await sb.from("outfits").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("giorno", now.day);
            const { error } = pian ? await sb.from("push_log").insert({ user_id: p.id, kind: "meteo", day: now.day }) : { error: true };
            if (!error) avvia(p.id, "meteo");
          }
          const rev = p.armadio_revisione?.data ? new Date(p.armadio_revisione.data).getTime() : 0;
          if (s.armadio_on !== false && Date.now() - rev > 15 * 86400000 && now.min >= toMin("10:00") && now.min < toMin("10:15")) {
            const { count } = await sb.from("garments").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("stato", "attivo");
            const { error } = count ? await sb.from("push_log").insert({ user_id: p.id, kind: "armadio", day: now.day }) : { error: true };
            if (!error) avvia(p.id, "revisione");
          }
        }
        const pushOn = !!s.attivi;
        const now = localNow(s.tz || "Europe/Rome");
        const slots: [string, string | undefined, boolean][] = [
          ["mattina", s.mattina, s.mattina_on !== false],
          ["sera", s.sera, s.sera_on !== false],
          ["revisione", s.revisione || "19:00", s.revisione_on !== false && now.wd === 0],
          ["ricorrenze", s.ricorrenze || s.mattina || "08:30", s.ricorrenze_on !== false],
        ];
        try {
          for (const h of await saluteTick(sb, p, s, now)) {
            const { error } = await sb.from("push_log").insert({ user_id: p.id, kind: h.kind, day: now.day });
            if (error) continue;
            if (h.inApp) await store(sb, p.id, h.msg);
            if (pushOn) sent += (await deliver(sb, p.id, { ...h.msg, count: await unread(sb, p.id) })).ok;
          }
        } catch (e) {
          console.log("salute", String(e));
        }
        for (const [kind, at, on] of slots) {
          if (!on || !at) continue;
          // ricorrenze e controllo settimanale finiscono sempre nell'area notifiche; buongiorno e sera solo come push
          const inApp = kind === "ricorrenze" || kind === "revisione";
          if (!pushOn && !inApp) continue;
          const diff = now.min - toMin(at);
          if (diff < 0 || diff >= 15) continue;
          const { error } = await sb.from("push_log").insert({ user_id: p.id, kind, day: now.day });
          if (error) continue; // già inviato oggi
          const msg = await compose(sb, p, kind, now.day, now.wd);
          if (!msg) continue;
          if (inApp) await store(sb, p.id, msg);
          if (pushOn) sent += (await deliver(sb, p.id, { ...msg, count: await unread(sb, p.id) })).ok;
        }
      }
      return json({ sent });
    }

    const user = await userFrom(req);
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (route === "subscribe") {
      if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) return json({ error: "Iscrizione non valida" }, 400);
      await sb.from("push_subscriptions").upsert({ endpoint: b.endpoint, user_id: user.id, p256dh: b.keys.p256dh, auth: b.keys.auth });
      return json({ ok: true });
    }
    if (route === "unsubscribe") {
      await sb.from("push_subscriptions").delete().eq("endpoint", b.endpoint || "").eq("user_id", user.id);
      return json({ ok: true });
    }
    if (route === "test") {
      const m = { title: "Habitus", body: "I promemoria funzionano. A domattina.", url: "./?vai=percorso", tag: "test" };
      await store(sb, user.id, m);
      const r = await deliver(sb, user.id, { ...m, count: await unread(sb, user.id) });
      if (!r.total) return json({ error: "Nessun dispositivo iscritto" }, 400);
      if (!r.ok) return json({ error: "Invio non riuscito, riattiva i promemoria" }, 502);
      return json(r);
    }
    return json({ error: "Percorso non trovato" }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
