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
