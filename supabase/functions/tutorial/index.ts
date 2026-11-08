import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – libreria dei tutorial illustrati in stile WikiHow, ricavati dalle lezioni pratiche dell'Accademia.
 * POST /catena { user_id, coda: [{ corso, id, titolo, testo }] }   (x-cron)  un passo alla volta, in background:
 *   prima completa le illustrazioni mancanti, poi crea il tutorial della lezione successiva; alla fine avvisa.
 */
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const GEM = "https://generativelanguage.googleapis.com/v1beta";
const TEMI = ["Stile e vestiti", "Cravatte e accessori", "Scarpe", "Galateo", "Appuntamenti e relazioni", "Grooming", "Profumi", "Pelletteria e borse", "Linguaggio", "Fisico", "Salute", "Mentalità", "Altro"];
const CORSI = ["vestirsi", "galateo", "coppia", "cravatte", "grooming", "scarpe", "accessori", "profumi", "pelletteria", "inglese", "vocabolario"];
const key = () => Deno.env.get("GEMINI_API_KEY")!.trim();
const gfetch = (u: string, o: RequestInit, ms: number) =>
  fetch(u, { ...o, signal: AbortSignal.timeout(ms) }).catch(() => new Response(JSON.stringify({ error: { message: "Il modello non ha risposto in tempo" } }), { status: 503 }));

function toB64(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function parseJson(t: string) {
  const clean = t.replace(/```json|```/g, "");
  try {
    return JSON.parse(clean);
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    try {
      return m ? JSON.parse(m[0]) : null;
    } catch {
      return null;
    }
  }
}

let lista: string[] | null = null;
async function tutti() {
  if (lista) return lista;
  const j = await (await fetch(`${GEM}/models?key=${key()}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  lista = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  return lista!;
}
const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
async function testo() {
  const g = await tutti();
  const flash = by(g.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && !/^gemini-[12]\./.test(n)));
  return [...flash.filter((m) => /^gemini-3\.[56]-flash$/.test(m)), ...flash.filter((m) => !/^gemini-3\.[56]-flash$/.test(m))].slice(0, 5);
}
async function immagini() {
  const g = await tutti();
  return [...by(g.filter((n) => /^gemini-[\d.]+-flash-image$/.test(n))), ...g.filter((n) => /nano-banana/.test(n) && !/preview/.test(n)), ...by(g.filter((n) => /^gemini-[\d.]+-pro-image$/.test(n))), ...by(g.filter((n) => /^gemini-[\d.]+-flash-image-preview$/.test(n)))].slice(0, 4);
}

async function scrivi(prompt: string) {
  let last = "Nessun modello AI disponibile";
  for (const m of await testo()) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, responseMimeType: "application/json", maxOutputTokens: 12000 } }),
    }, 90000);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      continue;
    }
    // deno-lint-ignore no-explicit-any
    const out = parseJson((j.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join(""));
    if (out && "tutorial" in out) return out;
    last = "Risposta non valida";
  }
  throw new Error(last);
}

async function disegna(parts: unknown[]) {
  let last = "Nessun modello di immagini disponibile";
  let quota = false;
  for (const m of await immagini()) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
    }, 90000);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if (r.status === 429 || /quota|billing|free tier/i.test(last)) quota = true;
      continue;
    }
    // deno-lint-ignore no-explicit-any
    const p = (j.candidates?.[0]?.content?.parts || []).find((x: any) => x.inline_data || x.inlineData);
    const d = p?.inline_data || p?.inlineData;
    if (d?.data) return { mime: (d.mime_type || d.mimeType || "image/png") as string, data: d.data as string };
    last = "Il modello non ha restituito un'immagine";
  }
  throw Object.assign(new Error(quota ? "Le illustrazioni richiedono la fatturazione attiva su Google AI Studio." : last), { code: quota ? "QUOTA" : "ERR" });
}

// deno-lint-ignore no-explicit-any
async function disegnaPasso(db: SupabaseClient, uid: string, t: any, i: number) {
  const steps = t.data.passaggi || [];
  await db.from("tutorials").update({ img_status: "in_corso", img_error: null }).eq("id", t.id);
  const parts: unknown[] = [];
  const prev = steps.slice(0, i).reverse().find((p: { img?: string }) => p.img);
  if (prev?.img) {
    const { data } = await db.storage.from("tutorials").download(prev.img);
    if (data) {
      parts.push({ text: "Immagine di riferimento per lo STILE (stessi colori, stesso tratto, stesso personaggio):" });
      parts.push({ inline_data: { mime_type: data.type || "image/png", data: toB64(await data.arrayBuffer()) } });
    }
  }
  parts.push({
    text: `Illustrazione didattica in stile WikiHow per il passaggio ${i + 1} del tutorial "${t.titolo}".
Stile: illustrazione digitale pulita, colori pieni e morbidi, contorni sottili, ombre leggere, sfondo bianco o grigio chiarissimo, formato orizzontale 4:3. Uomo adulto elegante, stile classico britannico. Inquadratura ravvicinata e chiara sul gesto; se utile una freccia per mostrare il movimento.
NIENTE testo, lettere, numeri, loghi o filigrane.
Cosa mostrare: ${steps[i].illustrazione || steps[i].titolo}
Passaggio: ${steps[i].titolo} — ${steps[i].testo}`,
  });
  try {
    const img = await disegna(parts);
    const path = `${uid}/${t.id}/passo-${i + 1}-${crypto.randomUUID().slice(0, 6)}.${img.mime.includes("jpeg") ? "jpg" : "png"}`;
    const { error } = await db.storage.from("tutorials").upload(path, fromB64(img.data), { contentType: img.mime });
    if (error) throw new Error(error.message);
    const { data: fresh } = await db.from("tutorials").select("data").eq("id", t.id).single();
    const d = fresh?.data || t.data;
    if (d.passaggi[i]?.img) await db.storage.from("tutorials").remove([d.passaggi[i].img]);
    d.passaggi[i].img = path;
    const all = d.passaggi.every((p: { img?: string }) => p.img);
    await db.from("tutorials").update({ data: d, img_status: all ? "fatto" : "in_corso" }).eq("id", t.id);
    return 200;
  } catch (e) {
    const err = e as Error & { code?: string };
    await db.from("tutorials").update({ img_status: err.code === "QUOTA" ? "bloccato" : "da_fare", img_error: err.message.slice(0, 300) }).eq("id", t.id);
    return err.code === "QUOTA" ? 402 : 500;
  }
}

type Lez = { corso: string; id: string; titolo: string; testo: string };
type Catena = { user_id: string; coda: Lez[]; creati?: number; errori?: number };

function prossimo(secret: string, c: Catena) {
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(
    fetch(`${URL_}/functions/v1/tutorial/catena`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": secret }, body: JSON.stringify(c) }).then((r) => r.text()).catch(() => null),
  );
}

async function passo(admin: SupabaseClient, secret: string, c: Catena) {
  c.creati ||= 0;
  c.errori ||= 0;
  if (c.errori > 8) return { stop: "troppi errori" };
  // 1) illustrazioni mancanti
  const { data: aperti } = await admin.from("tutorials").select("*").eq("user_id", c.user_id).not("lezione", "is", null).eq("stato", "approvato").in("img_status", ["da_fare", "in_corso"]).order("created_at").limit(1);
  const t = aperti?.[0];
  if (t) {
    const i = (t.data.passaggi || []).findIndex((p: { img?: string }) => !p.img);
    if (i < 0) await admin.from("tutorials").update({ img_status: "fatto" }).eq("id", t.id);
    else {
      const st = await disegnaPasso(admin, c.user_id, t, i);
      if (st === 402) return { stop: "quota" };
      if (st !== 200) c.errori++;
    }
    prossimo(secret, c);
    return { ok: true, disegnato: `${t.titolo} #${i + 1}` };
  }
  // 2) lezione successiva
  const l = c.coda.shift();
  if (!l) {
    if (c.creati) {
      await fetch(`${URL_}/functions/v1/promemoria/invia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron": secret },
        body: JSON.stringify({ user_id: c.user_id, title: "I tutorial illustrati sono pronti", body: `${c.creati} guide passo passo in stile WikiHow, dentro le lezioni dell'Accademia.`, url: "./?vai=accademia", tag: "tutorial" }),
      }).catch(() => null);
    }
    return { fine: true, creati: c.creati };
  }
  const ref = `${l.corso}/${l.id}`;
  const { count: esiste } = await admin.from("tutorials").select("id", { count: "exact", head: true }).eq("user_id", c.user_id).eq("lezione", ref);
  if (esiste) {
    prossimo(secret, c);
    return { ok: true, saltata: l.titolo };
  }
  try {
    const out = await scrivi(`Sei l'autore delle guide pratiche di un'accademia per gentiluomini. Dalla lezione qui sotto ricava UNA guida in stile WikiHow, SOLO se la lezione insegna un GESTO PRATICO che si può mostrare con illustrazioni passo passo (es. fare un nodo, piegare una pochette, lucidare le scarpe, radersi, rifinire la barba, stringere la mano, mettere i gemelli, applicare il profumo, nutrire la pelle, apparecchiare, controllare la vestibilità allo specchio). Se la lezione è solo teoria, regole sociali o consigli di comportamento senza un gesto concreto da mostrare, rispondi {"tutorial":null}.
Resta fedele alla lezione (è già verificata con fonti): non contraddirla, puoi solo rendere i gesti più chiari.
Rispondi SOLO con JSON: {"tutorial":{"titolo":"Come …","tema":"uno tra ${TEMI.join(", ")}","intro":"2 frasi: a cosa serve e quando","difficolta":"facile | media | impegnativa","minuti":5,"occorrente":["cosa serve"],"passaggi":[{"titolo":"azione breve all'imperativo","testo":"spiegazione chiara di 2-4 frasi","consiglio":"facoltativo","attenzione":"facoltativo","illustrazione":"descrizione visiva PRECISA per un illustratore: posizione delle mani e dell'oggetto, angolazione, cosa evidenziare con una freccia"}],"consigli":["…"],"errori":["errori comuni da evitare"]}}
Da 4 a 10 passaggi.

Lezione "${l.titolo}" (corso ${l.corso}):
${String(l.testo).slice(0, 9000)}`);
    const tu = out.tutorial;
    const corso = CORSI.includes(l.corso) ? l.corso : null;
    if (tu?.passaggi?.length >= 3) {
      const passaggi = tu.passaggi.slice(0, 10).map((p: Record<string, unknown>) => ({ titolo: String(p.titolo || ""), testo: String(p.testo || ""), consiglio: p.consiglio || null, attenzione: p.attenzione || null, momento: null, illustrazione: String(p.illustrazione || p.titolo || ""), img: null }));
      await admin.from("tutorials").insert({
        user_id: c.user_id,
        corso,
        tema: TEMI.includes(tu.tema) ? tu.tema : null,
        titolo: String(tu.titolo || l.titolo).slice(0, 140),
        lezione: ref,
        data: { intro: tu.intro || "", difficolta: tu.difficolta || "facile", minuti: Number(tu.minuti) || 5, occorrente: tu.occorrente || [], passaggi, consigli: tu.consigli || [], errori: tu.errori || [] },
        verifica: { verdetto: "fondato", spiegazione: "Tratto da una lezione dell'Accademia, già verificata con le fonti indicate nella lezione.", correzioni: [], fonti: [] },
        img_status: "da_fare",
        stato: "approvato",
        decided_at: new Date().toISOString(),
      });
      c.creati++;
    } else {
      // lezione teorica: si segna per non riprovarla
      await admin.from("tutorials").insert({ user_id: c.user_id, corso, titolo: l.titolo, lezione: ref, data: { passaggi: [] }, img_status: "fatto", stato: "scartato" });
    }
  } catch {
    c.errori++;
    c.coda.push(l);
  }
  prossimo(secret, c);
  return { ok: true, lezione: l.titolo };
}

Deno.serve(async (req) => {
  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "cron").single();
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!sec || req.headers.get("x-cron") !== sec.value) {
    // dall'app: { action: "libreria", lezioni } → avvia la creazione dei tutorial mancanti
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user || !sec) return new Response(JSON.stringify({ error: "Non autenticato" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    const b = await req.json().catch(() => ({}));
    const { data: gia } = await admin.from("tutorials").select("lezione").eq("user_id", user.id).not("lezione", "is", null);
    const fatte = new Set((gia || []).map((x: { lezione: string }) => x.lezione));
    const coda = ((Array.isArray(b.lezioni) ? b.lezioni : []) as Lez[]).slice(0, 80).filter((l) => !fatte.has(`${l.corso}/${l.id}`));
    if (coda.length) prossimo(sec.value, { user_id: user.id, coda });
    return new Response(JSON.stringify({ ok: true, in_coda: coda.length }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }
  try {
    return json(await passo(admin, sec.value, await req.json()));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
