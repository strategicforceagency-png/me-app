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

async function deliver(sb: ReturnType<typeof admin>, userId: string, msg: { title: string; body: string; url?: string; tag?: string }) {
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

    if (route === "tick") {
      const { data: sec } = await sb.from("app_secrets").select("value").eq("name", "cron").single();
      if (!sec || req.headers.get("x-cron") !== sec.value) return json({ error: "no" }, 401);
      const { data: profs } = await sb.from("profiles").select("id, nome, path, path_started_at, promemoria").not("promemoria", "is", null);
      let sent = 0;
      for (const p of profs || []) {
        const s = p.promemoria || {};
        if (!s.attivi) continue;
        const now = localNow(s.tz || "Europe/Rome");
        const slots: [string, string | undefined, boolean][] = [
          ["mattina", s.mattina, s.mattina_on !== false],
          ["sera", s.sera, s.sera_on !== false],
          ["revisione", s.revisione || "19:00", s.revisione_on !== false && now.wd === 0],
        ];
        for (const [kind, at, on] of slots) {
          if (!on || !at) continue;
          const diff = now.min - toMin(at);
          if (diff < 0 || diff >= 15) continue;
          const { error } = await sb.from("push_log").insert({ user_id: p.id, kind, day: now.day });
          if (error) continue; // già inviato oggi
          const msg = await compose(sb, p, kind, now.day, now.wd);
          if (msg) sent += (await deliver(sb, p.id, msg)).ok;
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
      const r = await deliver(sb, user.id, { title: "Habitus", body: "I promemoria funzionano. A domattina.", url: "./", tag: "test" });
      if (!r.total) return json({ error: "Nessun dispositivo iscritto" }, 400);
      if (!r.ok) return json({ error: "Invio non riuscito, riattiva i promemoria" }, 502);
      return json(r);
    }
    return json({ error: "Percorso non trovato" }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
