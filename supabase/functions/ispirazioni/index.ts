import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Ispirazioni: capisce di cosa parla un'ispirazione (video, profilo, foto) e smista gli argomenti.
 *  POST { action: "temi", id }   (utente) legge il contenuto, classifica gli argomenti ed estrae i profumi citati
 *  POST /verifica { uid, id }    (x-cron, a catena) verifica UN profumo alla volta sul web e lo pubblica in Profumi
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = () => createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const G = "https://generativelanguage.googleapis.com/v1beta";
const key = () => {
  const k = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!k) throw new Error("Chiave AI non configurata");
  return k;
};

let modelli: string[] | null = null;
async function models() {
  if (modelli) return modelli;
  const j = await (await fetch(`${G}/models?key=${key()}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const flash = gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && !/^gemini-[12]\./.test(n)).sort((a, b) => ver(b) - ver(a));
  const rapidi = flash.filter((m) => /^gemini-3\.[56]-flash$/.test(m));
  modelli = [...rapidi, ...flash.filter((m) => !rapidi.includes(m)), ...gen.filter((n) => n === "gemini-flash-latest")].slice(0, 5);
  return modelli;
}

// deno-lint-ignore no-explicit-any
async function gen(parts: any[], opt: { json?: boolean; search?: boolean } = {}) {
  let last = "Nessun modello disponibile";
  for (const m of await models()) {
    const body: Record<string, unknown> = { contents: [{ role: "user", parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 8192, ...(opt.json ? { responseMimeType: "application/json" } : {}) } };
    if (opt.search) body.tools = [{ google_search: {} }];
    const r = await fetch(`${G}/models/${m}:generateContent?key=${key()}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) }).catch(() => null);
    if (!r) { last = "timeout"; continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status)) continue;
      throw new Error(last);
    }
    const c = j.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const text = (c?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
    // deno-lint-ignore no-explicit-any
    const fonti = ((c?.groundingMetadata?.groundingChunks || []) as any[]).map((g) => g.web).filter((w) => w?.uri).map((w) => ({ titolo: String(w.title || w.uri), url: String(w.uri) }));
    if (!text) { last = "Risposta vuota"; continue; }
    return { text, fonti };
  }
  throw new Error(/quota|exceeded|billing/i.test(last) ? "Credito Google esaurito: ricarica e riprova" : last);
}
const parse = (t: string) => {
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
};

async function upload(bytes: ArrayBuffer, mime: string, name: string) {
  const s = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key()}`, {
    method: "POST",
    headers: { "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength), "X-Goog-Upload-Header-Content-Type": mime, "Content-Type": "application/json" },
    body: JSON.stringify({ file: { display_name: name } }),
  });
  const up = s.headers.get("x-goog-upload-url");
  await s.body?.cancel();
  if (!up) throw new Error("Caricamento video non avviato");
  let f = (await (await fetch(up, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: bytes })).json()).file;
  for (let i = 0; i < 40 && f?.state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    f = await (await fetch(`${G}/${f.name}?key=${key()}`)).json();
  }
  if (f?.state !== "ACTIVE") throw new Error("Video non leggibile");
  return { uri: f.uri as string, name: f.name as string, mime: (f.mimeType as string) || mime };
}
const drop = (name: string) => fetch(`${G}/${name}?key=${key()}`, { method: "DELETE" }).then((r) => r.body?.cancel()).catch(() => {});
const b64 = (buf: ArrayBuffer) => {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};


/* ---------- link di Instagram: video intero, audio e didascalia ---------- */
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const dec = (s: string) => s.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"');
async function igEmbed(url: string) {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const kind = m[1] === "reels" ? "reel" : m[1];
  const html = await (await fetch(`https://www.instagram.com/${kind}/${m[2]}/embed/captioned/`, { headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" } })).text();
  const img = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/)?.[1] || html.match(/"display_url\\?":\\?"([^"\\]+)/)?.[1] || html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const video = html.match(/"video_url\\?":\\?"([^"]+?)\\?"/)?.[1] || null;
  const username = html.match(/class="UsernameText"[^>]*>([^<]+)</)?.[1] || html.match(/"username\\?":\\?"([^"\\]+)/)?.[1] || null;
  const caption = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments/)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
  return { shortcode: m[2], image: img ? dec(img) : null, video: video ? dec(video) : null, username, caption: caption ? dec(caption) : null };
}
const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}";

/** Scarica i post dai link: con Instagram collegato prende il video vero (con audio) e la didascalia completa. */
async function daiLink(sb: ReturnType<typeof admin>, uid: string, urls: string[], id?: string) {
  const { data: conn } = await sb.from("instagram_connections").select("access_token, ig_user_id").eq("user_id", uid).maybeSingle();
  const images: string[] = [];
  const videos: { path: string; mime: string; caption?: string; permalink?: string }[] = [];
  const captions: { caption: string; permalink?: string }[] = [];
  let handle: string | null = null;
  const save = async (url: string, name: string, max = 45 * 1024 * 1024) => {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) return null;
      if (Number(r.headers.get("content-length") || 0) > max) { await r.body?.cancel(); return null; }
      const type = (r.headers.get("content-type") || "application/octet-stream").split(";")[0];
      const buf = await r.arrayBuffer();
      if (buf.byteLength > max) return null;
      const path = `${uid}/link-${name}-${crypto.randomUUID().slice(0, 8)}.${type.includes("mp4") ? "mp4" : type.includes("png") ? "png" : "jpg"}`;
      const { error } = await sb.storage.from("inspirations").upload(path, buf, { contentType: type });
      return error ? null : { path, type };
    } catch {
      return null;
    }
  };
  for (const [k, url] of urls.slice(0, 5).entries()) {
    const e = await igEmbed(url).catch(() => null);
    if (!e) continue;
    handle ||= e.username;
    let fatto = false;
    if (e.username && conn) {
      try {
        const u = new URL(`https://graph.facebook.com/v23.0/${conn.ig_user_id}`);
        u.searchParams.set("fields", `business_discovery.username(${e.username}){username,media.limit(50){${FIELDS}}}`);
        u.searchParams.set("access_token", conn.access_token);
        const j = await (await fetch(u)).json();
        // deno-lint-ignore no-explicit-any
        const hit = (j.business_discovery?.media?.data || []).find((m: any) => String(m.permalink || "").includes(e.shortcode));
        if (hit) {
          const cap = String(hit.caption || "").slice(0, 2000);
          if (cap) captions.push({ caption: cap, permalink: hit.permalink });
          // deno-lint-ignore no-explicit-any
          const items: any[] = hit.media_type === "CAROUSEL_ALBUM" ? (hit.children?.data || []).slice(0, 6) : [hit];
          for (const [n, it] of items.entries()) {
            if (it.media_type === "VIDEO") {
              if (it.thumbnail_url) { const s = await save(it.thumbnail_url, `${k}t${n}`, 15e6); if (s) images.push(s.path); }
              const v = it.media_url && videos.length < 3 ? await save(it.media_url, `${k}v${n}`) : null;
              if (v) videos.push({ path: v.path, mime: v.type || "video/mp4", caption: cap, permalink: hit.permalink });
            } else if (it.media_url) {
              const s = await save(it.media_url, `${k}f${n}`, 15e6);
              if (s) images.push(s.path);
            }
          }
          fatto = true;
        }
      } catch { /* profilo personale: si usa l'anteprima */ }
    }
    if (!fatto) {
      if (e.video && videos.length < 3) {
        const v = await save(e.video, `${k}v`);
        if (v) videos.push({ path: v.path, mime: v.type || "video/mp4", caption: e.caption || undefined, permalink: url });
      }
      if (e.image) { const s = await save(e.image, `${k}f`, 15e6); if (s) images.push(s.path); }
      if (e.caption) captions.push({ caption: e.caption, permalink: url });
    }
  }
  if (!images.length && !videos.length) throw new Error("Post non leggibile (privato o non disponibile): carica il video o uno screenshot");
  const row = { kind: "link", handle, image_paths: images, videos, captions, status: "analisi", analysis: null, temi: null, error: null };
  if (id) {
    const { error } = await sb.from("inspirations").update(row).eq("id", id).eq("user_id", uid);
    if (error) throw new Error(error.message);
    return { id, video: videos.length > 0, handle };
  }
  const { data, error } = await sb.from("inspirations").insert({ user_id: uid, title: handle ? null : "Ispirazione", ...row }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, video: videos.length > 0, handle };
}

const TEMI = ["stile", "profumi", "grooming", "pelletteria", "scarpe", "orologi", "galateo", "linguaggio", "fitness", "alimentazione", "cultura", "altro"];

/** Passo 1: guarda il contenuto e dice di cosa parla. */
async function temi(sb: ReturnType<typeof admin>, uid: string, id: string) {
  const { data: insp } = await sb.from("inspirations").select("*").eq("id", id).eq("user_id", uid).single();
  if (!insp) throw new Error("Ispirazione non trovata");
  // deno-lint-ignore no-explicit-any
  const parts: any[] = [];
  for (const p of (insp.image_paths || []).slice(0, 10)) {
    const { data } = await sb.storage.from("inspirations").download(p);
    if (data) parts.push({ inline_data: { mime_type: data.type || "image/jpeg", data: b64(await data.arrayBuffer()) } });
  }
  const files: string[] = [];
  for (const v of (insp.videos || []).slice(0, 3)) {
    try {
      const { data } = await sb.storage.from("inspirations").download(v.path);
      if (!data) continue;
      const f = await upload(await data.arrayBuffer(), v.mime || "video/mp4", `ispirazione-${id}`);
      files.push(f.name);
      parts.push({ file_data: { mime_type: f.mime, file_uri: f.uri } });
    } catch (e) {
      console.log("video", String(e));
    }
  }
  const capt = ((insp.captions || []) as { caption?: string }[]).map((c) => c.caption).filter(Boolean).slice(0, 15).join("\n---\n");
  parts.push({
    text: `Questo è un contenuto che ${insp.handle ? `viene dal profilo @${insp.handle}` : "l'utente ha salvato come ispirazione"} (foto, fotogrammi, video con audio${capt ? " e didascalie" : ""}).
${capt ? `Didascalie:\n${capt.slice(0, 6000)}\n` : ""}
Ascolta l'audio e leggi le scritte nel video: conta soprattutto ciò che l'autore DICE e scrive. Come è vestito chi parla NON è un argomento, a meno che il contenuto parli proprio di abbigliamento. Dimmi di cosa parla davvero il contenuto e smista gli argomenti tra: ${TEMI.join(", ")}.
- "stile" solo se il contenuto mostra o discute outfit e abbigliamento in modo rilevante.
- Se si parla di profumi, elenca OGNI profumo citato o mostrato, con nome e maison come li hai capiti, e in "cosa_dice" cosa ne dice l'autore (es. "il migliore per l'ufficio", "dura 12 ore"). Non inventare profumi non citati.
- Allo stesso modo elenca gli oggetti di pelletteria citati (borse, cinture, portafogli) in "pelle".
Rispondi SOLO con JSON: {"sintesi":"2 frasi in italiano su cosa tratta","argomenti":[{"tema":"profumi","peso":80,"sintesi":"cosa dice su questo tema"}],"profumi":[{"nome":"","marca":"","cosa_dice":""}],"pelle":[{"nome":"","marca":"","cosa_dice":""}]}`,
  });
  let out;
  try {
    out = parse((await gen(parts, { json: true })).text) || {};
  } finally {
    files.forEach(drop);
  }
  const argomenti = (out.argomenti || []).filter((a: { tema: string }) => TEMI.includes(a.tema));
  // doppioni nel contenuto stesso
  const visti = new Set<string>();
  const profumi = ((out.profumi || []) as { nome: string; marca: string; cosa_dice: string }[])
    .filter((p) => p?.nome && !visti.has((p.nome + p.marca).toLowerCase()) && visti.add((p.nome + p.marca).toLowerCase()))
    .slice(0, 12)
    .map((p) => ({ ...p, stato: "in_verifica" }));
  const t = { sintesi: out.sintesi || "", argomenti, profumi, pelle: (out.pelle || []).slice(0, 10), data: new Date().toISOString() };
  const stile = argomenti.some((a: { tema: string; peso: number }) => a.tema === "stile" && (a.peso ?? 50) >= 30);
  const patch: Record<string, unknown> = { temi: t };
  if (!stile) patch.status = "pronto";
  if (!insp.handle && !insp.title?.trim().replace("Ispirazione", "")) patch.title = argomenti[0] ? argomenti[0].tema[0].toUpperCase() + argomenti[0].tema.slice(1) : "Ispirazione";
  await sb.from("inspirations").update(patch).eq("id", id);
  return { temi: t, stile };
}

const catena = (uid: string, id: string, secret: string) =>
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(
    fetch(`${URL_}/functions/v1/ispirazioni/verifica`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": secret }, body: JSON.stringify({ uid, id }) }).then((r) => r.text()).catch(() => null),
  );

/** Passo 2: un profumo alla volta, cercato sul web, verificato e pubblicato. */
async function verifica(sb: ReturnType<typeof admin>, uid: string, id: string, secret: string) {
  const { data: insp } = await sb.from("inspirations").select("id, handle, title, temi").eq("id", id).eq("user_id", uid).single();
  const t = insp?.temi;
  if (!t?.profumi) return { fatto: true };
  const i = t.profumi.findIndex((p: { stato: string }) => p.stato === "in_verifica");
  if (i < 0) return { fatto: true };
  const p = t.profumi[i];
  const fonte = insp.handle ? `@${insp.handle}` : insp.title || "un'ispirazione";
  try {
    // è già nella collezione?
    const { data: gia } = await sb.from("collezione").select("id, nome, stato").eq("user_id", uid).eq("tipo", "profumo").ilike("nome", p.nome.trim());
    if (gia?.length) {
      t.profumi[i] = { ...p, stato: "doppione", motivo: `Già nella tua collezione (${gia[0].stato === "scoperta" ? "Da scoprire" : gia[0].stato})`, collezione_id: gia[0].id };
    } else {
      // 1) ricerca sul web in prosa (con il JSON la ricerca non parte)
      const r = await gen([{
        text: `Cerca sul web il profumo "${p.nome}"${p.marca ? ` di ${p.marca}` : ""}. Usa più fonti indipendenti: sito della maison, Fragrantica, Parfumo, Basenotes, riviste di settore, recensioni di profumieri.
Riporta: se esiste davvero e il nome esatto, maison, anno, profumiere, concentrazioni, famiglia olfattiva, piramide (testa, cuore, fondo), durata e scia secondo le recensioni, stagioni e occasioni consigliate, fascia di prezzo in Italia, profumi simili, e la reputazione (cosa ne pensano esperti e appassionati, punti deboli compresi).
Nel contenuto da cui arriva, l'autore ne dice: "${p.cosa_dice || "nulla di specifico"}". Verifica se questa affermazione è confermata dalle fonti.`,
      }], { search: true });
      const fonti = r.fonti.filter((f, k, a) => a.findIndex((x) => x.titolo === f.titolo) === k).slice(0, 8);
      // 2) scheda e giudizio in JSON, solo da quanto trovato
      const out = parse((await gen([{
        text: `Ecco una ricerca sul profumo "${p.nome}"${p.marca ? ` di ${p.marca}` : ""}:\n\n${r.text.slice(0, 12000)}\n\nFonti consultate: ${fonti.map((f) => f.titolo).join(", ") || "nessuna"}.
Usando SOLO queste informazioni (non inventare: se un dato manca metti null), rispondi in italiano SOLO con JSON:
{"esiste":true,"nome":"nome esatto","marca":"","anno":null,"profumiere":null,"concentrazione":"EdT | EdP | Parfum | Cologne | Extrait","famiglia":"","note":{"testa":[""],"cuore":[""],"fondo":[""]},"carattere":"2 frasi: com'è da indossare","stagioni":["autunno"],"occasioni":["ufficio","sera","weekend","cerimonia","sport"],"durata":"","scia":"leggera | moderata | intensa","dosi":"","prezzo":"","simili":[""],
"verifica":{"affermazione":"${(p.cosa_dice || "").replace(/"/g, "'").slice(0, 200)}","esito":"confermata | in parte | smentita | non verificabile","valido":true,"giudizio":"2-3 frasi oneste: vale davvero la pena? cosa dicono le fonti, pregi e difetti"}}`,
      }], { json: true })).text);
      if (!out || out.esiste === false) {
        t.profumi[i] = { ...p, stato: "scartato", motivo: "Non trovato sul web: forse il nome è stato capito male" };
      } else if (fonti.length < 2) {
        t.profumi[i] = { ...p, stato: "scartato", motivo: "Meno di due fonti affidabili: non lo pubblico" };
      } else {
        const { verifica: ver, esiste: _e, ...scheda } = out;
        const dettagli = { ...scheda, fonti, verifica: ver, ispirazione: { id, fonte, cosa_dice: p.cosa_dice || null }, verificato_il: new Date().toISOString() };
        const { data: row, error } = await sb.from("collezione").insert({ user_id: uid, tipo: "profumo", nome: out.nome || p.nome, marca: out.marca || p.marca || null, stato: "scoperta", dettagli }).select("id").single();
        if (error) throw new Error(error.message);
        t.profumi[i] = { ...p, nome: out.nome || p.nome, marca: out.marca || p.marca, stato: "pubblicato", esito: ver?.esito, valido: ver?.valido, collezione_id: row.id };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // credito finito: si ferma qui e riprende al prossimo avvio
    if (/credito|quota/i.test(msg)) {
      t.profumi[i] = { ...p, stato: "in_verifica", motivo: msg };
      await sb.from("inspirations").update({ temi: t }).eq("id", id);
      return { fermo: msg };
    }
    t.profumi[i] = { ...p, stato: "scartato", motivo: "Ricerca non riuscita: " + msg.slice(0, 120) };
  }
  await sb.from("inspirations").update({ temi: t }).eq("id", id);
  const restano = t.profumi.some((x: { stato: string }) => x.stato === "in_verifica");
  if (restano) catena(uid, id, secret);
  else {
    const pub = t.profumi.filter((x: { stato: string }) => x.stato === "pubblicato").length;
    const sc = t.profumi.filter((x: { stato: string }) => x.stato === "scartato").length;
    if (pub || sc)
      await fetch(`${URL_}/functions/v1/promemoria/invia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron": secret },
        body: JSON.stringify({ user_id: uid, title: `Profumi da ${fonte}`, body: `Ho verificato ${pub + sc} profumi: ${pub} pubblicati in Profumi › Da scoprire${sc ? `, ${sc} scartati perché non affidabili` : ""}.`, url: "./?vai=profumi", tag: "profumi" }),
      }).then((r) => r.text()).catch(() => null);
  }
  return { ok: true, restano };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = admin();
  try {
    const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
    const { data: sec } = await sb.from("app_secrets").select("value").eq("name", "cron").single();
    const b = await req.json().catch(() => ({}));
    if (route === "verifica") {
      if (!sec || req.headers.get("x-cron") !== sec.value) return json({ error: "no" }, 401);
      return json(await verifica(sb, b.uid, b.id, sec.value));
    }
    const tok = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await sb.auth.getUser(tok);
    if (!u.user) return json({ error: "Non autenticato" }, 401);
    if (b.action === "temi") {
      const r = await temi(sb, u.user.id, String(b.id));
      if (r.temi.profumi.length) catena(u.user.id, String(b.id), sec!.value);
      return json(r);
    }
    if (b.action === "link") {
      const urls: string[] = (Array.isArray(b.urls) ? b.urls : [b.url]).map(String).filter((x: string) => /instagram\.com\//.test(x));
      if (!urls.length) return json({ error: "Serve il link di un post o reel di Instagram" }, 400);
      return json(await daiLink(sb, u.user.id, urls, b.id ? String(b.id) : undefined));
    }
    if (b.action === "riprendi") {
      // riparte la verifica rimasta ferma (es. credito esaurito)
      catena(u.user.id, String(b.id), sec!.value);
      return json({ ok: true });
    }
    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
