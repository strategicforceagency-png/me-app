import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Contenuti: raccoglie profili Instagram, link (post, reel, YouTube, articoli, TikTok) e file,
 * fa la cernita di TUTTO ciò che insegnano, verifica ogni insegnamento sul web e lo propone per l'approvazione.
 * Azioni (POST { action, id }): raccogli → analizza → verifica
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const GEM = "https://generativelanguage.googleapis.com";
// un modello lento non deve bloccare tutto: dopo 45 s si passa al successivo, e quel modello va in fondo alla fila
const lenti = new Set<string>();
const gfetch = (u: string, o: RequestInit, ms = 45000) =>
  fetch(u, { ...o, signal: AbortSignal.timeout(ms) }).catch(() => {
    const m = u.match(/models\/([^:/?]+):generateContent/)?.[1];
    if (m) lenti.add(m);
    return new Response(JSON.stringify({ error: { message: "Il modello non ha risposto in tempo" } }), { status: 503 });
  });
/** Prima i modelli che rispondono in fretta (oggi 3.6 e 3.5 flash: i più nuovi sono spesso sovraccarichi), in fondo quelli che sono andati in timeout. */
const ordina = (l: string[]) => {
  const rapidi = l.filter((m) => /^gemini-3\.[56]-flash$/.test(m));
  const resto = [...rapidi, ...l.filter((m) => !rapidi.includes(m))];
  return [...resto.filter((m) => !lenti.has(m)), ...resto.filter((m) => lenti.has(m))];
};
const GRAPH = "https://graph.facebook.com/v23.0";
const MAX_IMG = 20, MAX_VID = 3, MAX_VID_BYTES = 45 * 1024 * 1024;

export const TEMI = ["Stile e vestiti", "Cravatte e accessori", "Scarpe", "Galateo", "Appuntamenti e relazioni", "Grooming", "Profumi", "Pelletteria e borse", "Linguaggio", "Fisico", "Salute", "Mentalità", "Altro"];
const CORSI = ["vestirsi", "galateo", "coppia", "cravatte", "grooming", "scarpe", "accessori", "profumi", "pelletteria", "inglese", "vocabolario"];
const VERDETTI = ["fondato", "in_parte", "opinione", "infondato", "non_verificabile"];

const key = () => {
  const k = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!k) throw new Error("Chiave AI non configurata");
  return k;
};
function toB64(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
function parseJson(t: string) {
  const clean = t.replace(/```json|```/g, "");
  try {
    return JSON.parse(clean);
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

/* ---------------- Gemini ---------------- */
let textModels: string[] | null = null;
async function models() {
  if (textModels) return textModels;
  const j = await (await fetch(`${GEM}/v1beta/models?key=${key()}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  // i modelli 1.x e 2.x sono ritirati per i nuovi account: si usano solo i 3.x e gli alias "latest"
  const vivo = (n: string) => !/^gemini-[12]\./.test(n);
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-lite-latest")].slice(0, 9);
  return textModels;
}
let imageModels: string[] | null = null;
async function imgModels() {
  if (imageModels) return imageModels;
  const j = await (await fetch(`${GEM}/v1beta/models?key=${key()}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  imageModels = [
    ...by(gen.filter((n) => /^gemini-[\d.]+-flash-image$/.test(n))),
    ...gen.filter((n) => /nano-banana/.test(n) && !/preview/.test(n)),
    ...by(gen.filter((n) => /^gemini-[\d.]+-pro-image$/.test(n))),
    ...by(gen.filter((n) => /^gemini-[\d.]+-flash-image-preview$/.test(n))),
  ].slice(0, 4);
  return imageModels;
}
/** Disegna un'immagine; errore con code QUOTA se il piano gratuito non lo consente. */
async function drawImage(parts: unknown[]): Promise<{ mime: string; data: string }> {
  let last = "Nessun modello di immagini disponibile";
  let quota = false;
  for (const m of await imgModels()) {
    const r = await gfetch(`${GEM}/v1beta/models/${m}:generateContent?key=${key()}`, {
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
    if (d?.data) return { mime: d.mime_type || d.mimeType || "image/png", data: d.data };
    last = "Il modello non ha restituito un'immagine";
  }
  throw Object.assign(new Error(quota ? "Le illustrazioni richiedono la fatturazione attiva su Google AI Studio (sul piano gratuito i modelli che disegnano hanno quota zero)." : last), { code: quota ? "QUOTA" : "ERR" });
}
function fromB64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// deno-lint-ignore no-explicit-any
async function gemini(parts: unknown[], opts: { json?: boolean; search?: boolean; temperature?: number; ms?: number } = {}): Promise<{ text: string; grounding: any }> {
  try {
    return await gemini0(parts, opts);
  } catch (e) {
    // ricerca Google esaurita: si verifica con le conoscenze del modello, senza fonti web
    if (opts.search && /quota|tempo/i.test(String(e))) return await gemini0(parts, { ...opts, search: false });
    throw e;
  }
}
// deno-lint-ignore no-explicit-any
async function gemini0(parts: unknown[], opts: { json?: boolean; search?: boolean; temperature?: number; ms?: number } = {}): Promise<{ text: string; grounding: any }> {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: opts.temperature ?? 0.3, ...(opts.json ? { responseMimeType: "application/json" } : {}), maxOutputTokens: 16000 },
    };
    if (opts.search) body.tools = [{ google_search: {} }];
    const r = await gfetch(`${GEM}/v1beta/models/${m}:generateContent?key=${key()}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, opts.ms || 60000);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore AI ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status) || /demand|overloaded|not found|unavailable/i.test(last)) continue;
      throw new Error(last);
    }
    const c = j.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const text = (c?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
    if (text) return { text, grounding: c?.groundingMetadata };
    last = "Risposta AI vuota";
  }
  throw new Error(/quota|exceeded|demand|overloaded|no longer available/i.test(last) ? "L'AI ha esaurito per ora la quota gratuita di Google: riprova tra qualche minuto (con la fatturazione attiva su Google AI Studio non ci sono limiti)" : last);
}
async function geminiUpload(bytes: ArrayBuffer, mime: string, name: string) {
  const start = await fetch(`${GEM}/upload/v1beta/files?key=${key()}`, {
    method: "POST",
    headers: { "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength), "X-Goog-Upload-Header-Content-Type": mime, "Content-Type": "application/json" },
    body: JSON.stringify({ file: { display_name: name } }),
  });
  const up = start.headers.get("x-goog-upload-url");
  await start.body?.cancel();
  if (!up) throw new Error("Caricamento video non avviato");
  const j = await (await fetch(up, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: bytes })).json();
  let f = j.file;
  if (!f?.uri) throw new Error(j?.error?.message || "Caricamento video non riuscito");
  for (let i = 0; i < 40 && f.state === "PROCESSING"; i++) {
    await new Promise((res) => setTimeout(res, 2000));
    f = await (await fetch(`${GEM}/v1beta/${f.name}?key=${key()}`)).json();
  }
  if (f.state !== "ACTIVE") throw new Error("Video non leggibile");
  return { uri: f.uri as string, name: f.name as string, mime: (f.mimeType as string) || mime };
}
const geminiDelete = (name: string) => fetch(`${GEM}/v1beta/${name}?key=${key()}`, { method: "DELETE" }).then((r) => r.body?.cancel()).catch(() => {});

/* ---------------- raccolta ---------------- */
type Media = { images: string[]; videos: { path: string; mime: string; caption?: string }[]; youtube?: string; text?: string; captions: string[] };

async function graph(path: string, params: Record<string, string>) {
  const u = new URL(GRAPH + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u)).json().catch(() => ({}));
  if (j.error) throw Object.assign(new Error(j.error.error_user_msg || j.error.message), { code: j.error.code });
  return j;
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function igEmbed(url: string) {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const kind = m[1] === "reels" ? "reel" : m[1];
  const html = await (await fetch(`https://www.instagram.com/${kind}/${m[2]}/embed/captioned/`, { headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" } })).text();
  const img = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/)?.[1] || html.match(/"display_url\\?":\\?"([^"\\]+)/)?.[1] || html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const username = html.match(/class="UsernameText"[^>]*>([^<]+)</)?.[1] || html.match(/"username\\?":\\?"([^"\\]+)/)?.[1] || null;
  const caption = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments/)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
  return { shortcode: m[2], image: img ? decode(img) : null, username, caption };
}

function articleText(html: string) {
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h\d|li|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decode(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 18000);
}

// deno-lint-ignore no-explicit-any
async function collect(sb: any, admin: any, uid: string, c: any): Promise<{ media: Media; title: string | null; tipo: string }> {
  const media: Media = { images: [], videos: [], captions: [], ...(c.media || {}) };
  if (c.kind === "file") return { media, title: c.title, tipo: "file" };
  const save = async (url: string, name: string, max = MAX_VID_BYTES) => {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) return null;
      if (Number(r.headers.get("content-length") || 0) > max) {
        await r.body?.cancel();
        return null;
      }
      const type = (r.headers.get("content-type") || "application/octet-stream").split(";")[0];
      const buf = await r.arrayBuffer();
      if (buf.byteLength > max) return null;
      const ext = type.includes("mp4") ? "mp4" : type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `${uid}/c-${c.id.slice(0, 8)}-${name}-${crypto.randomUUID().slice(0, 6)}.${ext}`;
      const { error } = await sb.storage.from("inspirations").upload(path, buf, { contentType: type });
      return error ? null : { path, type };
    } catch {
      return null;
    }
  };
  const { data: conn } = await admin.from("instagram_connections").select("access_token, ig_user_id").eq("user_id", uid).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const addIgMedia = async (items: any[]) => {
    const imgs: string[] = [];
    const vids: { url: string; caption: string }[] = [];
    for (const m of items) {
      const caption = (m.caption || "").slice(0, 600);
      if (caption) media.captions.push(caption);
      // deno-lint-ignore no-explicit-any
      const parts: any[] = m.media_type === "CAROUSEL_ALBUM" ? (m.children?.data || []).slice(0, 5) : [m];
      for (const it of parts) {
        if (it.media_type === "VIDEO") {
          if (it.thumbnail_url && imgs.length < MAX_IMG) imgs.push(it.thumbnail_url);
          if (it.media_url && vids.length < MAX_VID) vids.push({ url: it.media_url, caption });
        } else if (it.media_url && imgs.length < MAX_IMG) imgs.push(it.media_url);
      }
    }
    const saved = await Promise.all(imgs.map((u, i) => save(u, `f${i}`, 15 * 1024 * 1024)));
    media.images.push(...saved.filter(Boolean).map((s) => s!.path));
    for (const [i, v] of vids.entries()) {
      const s = await save(v.url, `v${i}`);
      if (s) media.videos.push({ path: s.path, mime: s.type || "video/mp4", caption: v.caption });
    }
  };
  const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}";
  const discover = async (handle: string, n: number) => {
    if (!conn) throw new Error("Collega Instagram (Stile → Ispirazioni) per leggere i profili");
    try {
      return (await graph(`/${conn.ig_user_id}`, { fields: `business_discovery.username(${handle}){username,name,biography,media.limit(${n}){${FIELDS}}}`, access_token: conn.access_token })).business_discovery;
    } catch (e) {
      const err = e as Error & { code?: number };
      if (err.code === 190) throw new Error("Collegamento Instagram scaduto: ricollegalo da Stile → Ispirazioni");
      throw new Error(`@${handle} non è leggibile: deve essere un profilo Creator o Business`);
    }
  };

  const src = String(c.source || "").trim();
  // profilo Instagram
  if (c.kind === "profilo") {
    const handle = src.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/[/?].*$/, "").toLowerCase();
    const prof = await discover(handle, 15);
    if (prof.biography) media.text = `Bio di @${prof.username}: ${prof.biography}`;
    await addIgMedia(prof.media?.data || []);
    return { media, title: `@${prof.username}${prof.name ? " · " + prof.name : ""}`, tipo: "instagram_profilo" };
  }
  // link
  const url = src;
  if (/instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\//.test(url)) {
    const e = await igEmbed(url);
    let done = false;
    if (e?.username && conn) {
      try {
        const prof = await discover(e.username, 50);
        // deno-lint-ignore no-explicit-any
        const hit = (prof.media?.data || []).find((m: any) => String(m.permalink || "").includes(e.shortcode));
        if (hit) {
          await addIgMedia([hit]);
          done = true;
        }
      } catch { /* profilo personale: si usa l'anteprima */ }
    }
    if (!done && e) {
      if (e.image) {
        const s = await save(e.image, "f0", 15 * 1024 * 1024);
        if (s) media.images.push(s.path);
      }
      if (e.caption) media.captions.push(e.caption);
    }
    if (!media.images.length && !media.videos.length && !media.captions.length) throw new Error("Post non leggibile: è privato, oppure carica il video o uno screenshot");
    return { media, title: e?.username ? `Post di @${e.username}` : "Post Instagram", tipo: "instagram_post" };
  }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    media.youtube = `https://www.youtube.com/watch?v=${yt[1]}`;
    const o = await (await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(media.youtube)}&format=json`)).json().catch(() => null);
    return { media, title: o?.title ? `${o.title}${o.author_name ? " · " + o.author_name : ""}` : "Video YouTube", tipo: "youtube" };
  }
  if (/tiktok\.com\//.test(url)) {
    const o = await (await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)).json().catch(() => null);
    if (o?.thumbnail_url) {
      const s = await save(o.thumbnail_url, "f0", 15 * 1024 * 1024);
      if (s) media.images.push(s.path);
    }
    if (o?.title) media.captions.push(o.title);
    if (!media.images.length && !media.captions.length) throw new Error("TikTok non leggibile: carica il video salvato");
    return { media, title: o?.author_name ? `TikTok di @${o.author_name}` : "TikTok", tipo: "tiktok" };
  }
  // pagina web o immagine
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9", Accept: "text/html,image/*,*/*" } });
  if (!r.ok) throw new Error(`Pagina non raggiungibile (${r.status})`);
  const type = r.headers.get("content-type") || "";
  if (type.startsWith("image/")) {
    await r.body?.cancel();
    const s = await save(url, "f0", 15 * 1024 * 1024);
    if (s) media.images.push(s.path);
    return { media, title: "Immagine", tipo: "immagine" };
  }
  const html = await r.text();
  const title = decode(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] || html.match(/<title>([^<]+)<\/title>/i)?.[1] || url).trim();
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1];
  media.text = articleText(html);
  if (og) {
    const s = await save(new URL(decode(og), url).toString(), "f0", 15 * 1024 * 1024);
    if (s) media.images.push(s.path);
  }
  if ((media.text || "").length < 200 && !media.images.length) throw new Error("Pagina senza contenuto leggibile");
  return { media, title, tipo: "articolo" };
}

/* ---------------- analisi ---------------- */
const STILE_SCHEMA = `{"riassunto":"","stili":[{"nome":"","descrizione":"","peso":0}],"palette":[{"nome":"","hex":"#"}],"capi_chiave":[{"nome":"","categoria":"una tra Felpe e Maglioni, Maglie, Camicie, Canotte, Pantaloni, Giacche e Cappotti, Scarpe, Accessori","colore":"","perche":""}],"formule":[{"nome":"","pezzi":[""],"occasione":""}],"look":[{"immagine":0,"titolo":"","pezzi":[""],"stile":"","occasione":""}],"brand":[""],"vestibilita":"","dettagli":[""]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let id = "";
  try {
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();

    if (b.action === "illustra") {
      // body: { tutorial_id, step } → disegna l'illustrazione di un passaggio
      const { data: t } = await sb.from("tutorials").select("*").eq("id", b.tutorial_id).single();
      if (!t) return json({ error: "Tutorial non trovato" }, 404);
      const i = Number(b.step) || 0;
      const steps = t.data.passaggi || [];
      if (!steps[i]) return json({ error: "Passaggio non trovato" }, 400);
      await sb.from("tutorials").update({ img_status: "in_corso", img_error: null }).eq("id", t.id);
      const parts: unknown[] = [];
      // stile coerente: si passa l'illustrazione precedente come riferimento
      const prev = steps.slice(0, i).reverse().find((p: { img?: string }) => p.img);
      if (prev?.img) {
        const { data } = await sb.storage.from("tutorials").download(prev.img);
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
        const img = await drawImage(parts);
        const path = `${user.id}/${t.id}/passo-${i + 1}-${crypto.randomUUID().slice(0, 6)}.${img.mime.includes("jpeg") ? "jpg" : "png"}`;
        const { error } = await sb.storage.from("tutorials").upload(path, fromB64(img.data), { contentType: img.mime });
        if (error) throw new Error(error.message);
        const { data: fresh } = await sb.from("tutorials").select("data").eq("id", t.id).single();
        const d = fresh?.data || t.data;
        if (d.passaggi[i]?.img) await sb.storage.from("tutorials").remove([d.passaggi[i].img]);
        d.passaggi[i].img = path;
        const all = d.passaggi.every((p: { img?: string }) => p.img);
        await sb.from("tutorials").update({ data: d, img_status: all ? "fatto" : "in_corso" }).eq("id", t.id);
        return json({ ok: true, path, done: all });
      } catch (e) {
        const err = e as Error & { code?: string };
        await sb.from("tutorials").update({ img_status: err.code === "QUOTA" ? "bloccato" : "da_fare", img_error: err.message.slice(0, 300) }).eq("id", t.id);
        return json({ error: err.message, code: err.code }, err.code === "QUOTA" ? 402 : 500);
      }
    }

    id = String(b.id || "");
    const { data: c } = await sb.from("contents").select("*").eq("id", id).single();
    if (!c) return json({ error: "Contenuto non trovato" }, 404);

    if (b.action === "raccogli") {
      await sb.from("contents").update({ status: "raccolta", error: null }).eq("id", id);
      const r = await collect(sb, admin, user.id, c);
      await sb.from("contents").update({ media: r.media, title: c.title || r.title, tipo: r.tipo, status: "analisi" }).eq("id", id);
      return json({ ok: true, images: r.media.images.length, videos: r.media.videos.length, youtube: !!r.media.youtube, text: !!r.media.text });
    }

    if (b.action === "analizza") {
      await sb.from("contents").update({ status: "analisi", error: null }).eq("id", id);
      const m: Media = { images: [], videos: [], captions: [], ...(c.media || {}) };
      const parts: unknown[] = [];
      const imgs = await Promise.all(
        m.images.slice(0, MAX_IMG).map(async (p) => {
          const { data } = await sb.storage.from("inspirations").download(p);
          return data ? { mime: data.type || "image/jpeg", data: toB64(await data.arrayBuffer()) } : null;
        }),
      );
      imgs.forEach((im, i) => {
        if (!im) return;
        parts.push({ text: `IMMAGINE ${i}` });
        parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
      });
      const files: { uri: string; name: string; mime: string; caption?: string }[] = [];
      await Promise.all(
        m.videos.slice(0, MAX_VID).map(async (v, i) => {
          try {
            const { data } = await sb.storage.from("inspirations").download(v.path);
            if (data) files[i] = { ...(await geminiUpload(await data.arrayBuffer(), v.mime || "video/mp4", `habitus-${id}-${i}`)), caption: v.caption };
          } catch (e) {
            console.log("video", String(e));
          }
        }),
      );
      const vids = files.filter(Boolean);
      vids.forEach((v, i) => {
        parts.push({ text: `VIDEO ${i}${v.caption ? ` — didascalia: ${v.caption.slice(0, 300)}` : ""}` });
        parts.push({ file_data: { mime_type: v.mime, file_uri: v.uri } });
      });
      if (m.youtube) {
        parts.push({ text: "VIDEO YOUTUBE" });
        parts.push({ file_data: { file_uri: m.youtube } });
      }
      if (m.text) parts.push({ text: `TESTO:\n${m.text}` });
      if (m.captions.length) parts.push({ text: `DIDASCALIE:\n${m.captions.slice(0, 20).join("\n---\n").slice(0, 8000)}` });
      if (c.nota) parts.push({ text: `NOTA DI MANUEL: ${c.nota}` });
      if (parts.length === 0) throw new Error("Niente da analizzare");

      parts.push({
        text: `Sei il direttore dell'Accademia di Habitus, scuola personale per diventare un gentleman (gentiluomo inglese anni '60-'70 adattato all'Italia di oggi). Manuel ti ha portato questo contenuto (${c.title || c.source || "file"}). Fai una CERNITA COMPLETA di tutto ciò che il contenuto insegna, consiglia o afferma, non solo i vestiti: come vestirsi e abbinare, cravatte, pochette e accessori, scarpe, profumi, borse e pelletteria, galateo e comportamento, appuntamenti e relazioni, grooming, linguaggio, fisico, salute, mentalità. Guarda i video per intero e ascolta l'audio: spesso i consigli sono detti a voce. Ignora sponsorizzazioni, codici sconto e inviti a seguire.

Rispondi SOLO con JSON valido in italiano:
{"titolo":"titolo breve e chiaro del contenuto","riassunto":"2-3 frasi su cosa insegna","temi":["temi presenti"],"insegnamenti":[{"tema":"uno tra ${TEMI.join(", ")}","corso":"uno tra ${CORSI.join(", ")} oppure null","titolo":"titolo breve","affermazione":"cosa sostiene il contenuto, riportato fedelmente anche se discutibile","dettaglio":"come lo spiega, esempi, passaggi pratici","dove":"es. video 1 al minuto 0:40, immagine 3, didascalia, testo"}],"stile":null,"tutorial":[]}

Regole:
- Fino a 15 insegnamenti, concreti e utili; unisci i doppioni; non aggiungere tue opinioni qui: la verifica viene dopo.
- "tutorial": se il contenuto (o uno dei suoi video) è un TUTORIAL pratico che mostra COME FARE qualcosa passo per passo (es. un nodo di cravatta, piegare una pochette, lucidare le scarpe, radersi, stirare una camicia, apparecchiare, allacciare i gemelli, fare un esercizio), crea per ciascuno (massimo 3) una guida in stile WikiHow: {"titolo":"Come …","corso":"uno tra ${CORSI.join(", ")} oppure null","tema":"uno dei temi","intro":"2 frasi: a cosa serve e quando","difficolta":"facile | media | impegnativa","minuti":5,"occorrente":["cosa serve"],"passaggi":[{"titolo":"azione breve all'imperativo","testo":"spiegazione chiara di 2-4 frasi, con i dettagli che si vedono nel video","consiglio":"facoltativo","attenzione":"facoltativo","momento":"es. 0:42","illustrazione":"descrizione visiva PRECISA per un illustratore di cosa disegnare in questo passaggio: posizione delle mani, dell'oggetto, angolazione, cosa evidenziare con una freccia"}],"consigli":["…"],"errori":["errori comuni da evitare"]}. Da 4 a 12 passaggi, nell'ordine esatto del video, senza saltare gesti importanti. Se non è un tutorial, lascia [].
- "stile": compilalo SOLO se ci sono outfit o capi visibili, con questa struttura: ${STILE_SCHEMA} ("immagine" = indice di una IMMAGINE, non dei video). Altrimenti null.`,
      });
      let out;
      try {
        out = parseJson((await gemini(parts, { json: true, temperature: 0.3, ms: 110000 })).text);
      } finally {
        vids.forEach((v) => geminiDelete(v.name));
      }
      if (!out) throw new Error("L'AI non ha restituito un'analisi valida, riprova");
      // deno-lint-ignore no-explicit-any
      out.insegnamenti = (out.insegnamenti || []).slice(0, 15).map((x: any) => ({
        tema: TEMI.includes(x.tema) ? x.tema : "Altro",
        corso: CORSI.includes(x.corso) ? x.corso : null,
        titolo: String(x.titolo || "").slice(0, 120),
        affermazione: String(x.affermazione || ""),
        dettaglio: x.dettaglio ? String(x.dettaglio) : null,
        dove: x.dove ? String(x.dove) : null,
      })).filter((x: { affermazione: string }) => x.affermazione);
      out.fonti = { immagini: imgs.filter(Boolean).length, video: vids.length + (m.youtube ? 1 : 0), testo: !!m.text, didascalie: m.captions.length };

      // lo stile finisce anche nelle Ispirazioni
      let inspiration_id = c.inspiration_id;
      if (out.stile && (out.stile.capi_chiave || []).length && m.images.length && !inspiration_id) {
        const handle = c.tipo === "instagram_profilo" ? String(c.source || "").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/[/?].*$/, "") : null;
        const { data: insp } = await sb
          .from("inspirations")
          .insert({ user_id: user.id, kind: handle ? "instagram" : "foto", handle, title: handle ? null : out.titolo || c.title, image_paths: m.images.slice(0, MAX_IMG), videos: m.videos, analysis: { ...out.stile, fonti: { immagini: m.images.length, video: vids.length, didascalie: m.captions.length } }, status: "pronto" })
          .select("id")
          .single();
        inspiration_id = insp?.id || null;
      }
      // tutorial in stile WikiHow (da approvare)
      const tuts = (Array.isArray(out.tutorial) ? out.tutorial : []).filter((t: { passaggi?: unknown[] }) => (t?.passaggi || []).length >= 3).slice(0, 3);
      await sb.from("tutorials").delete().eq("content_id", id).eq("stato", "proposta");
      for (const t of tuts) {
        // deno-lint-ignore no-explicit-any
        t.passaggi = t.passaggi.slice(0, 12).map((p: any) => ({ titolo: String(p.titolo || ""), testo: String(p.testo || ""), consiglio: p.consiglio || null, attenzione: p.attenzione || null, momento: p.momento || null, illustrazione: String(p.illustrazione || p.titolo || ""), img: null }));
        await sb.from("tutorials").insert({ user_id: user.id, content_id: id, corso: CORSI.includes(t.corso) ? t.corso : null, tema: TEMI.includes(t.tema) ? t.tema : "Altro", titolo: String(t.titolo || "Tutorial"), data: t });
      }
      delete out.tutorial;
      out.tutorial_creati = tuts.length;
      await sb.from("contents").update({ analysis: out, title: c.title || out.titolo, status: "verifica", inspiration_id }).eq("id", id);
      return json({ ok: true, insegnamenti: out.insegnamenti.length, stile: !!out.stile, tutorial: tuts.length });
    }

    if (b.action === "verifica") {
      const ins = (c.analysis?.insegnamenti || []) as { tema: string; corso: string | null; titolo: string; affermazione: string; dettaglio: string | null }[];
      await sb.from("contents").update({ status: "verifica", error: null }).eq("id", id);
      await sb.from("knowledge").delete().eq("content_id", id).eq("stato", "proposta");
      const results: Record<string, unknown>[] = [];
      const one = async (x: (typeof ins)[number]) => {
        const prompt = `Verifica questo insegnamento con fonti autorevoli e aggiornate (manuali e istituzioni di galateo, sartorie e camicerie storiche, testate di stile maschile serie, maison e profumieri, pellettieri e concerie, dermatologi ed enti sanitari, linee guida ufficiali, Accademia della Crusca e Treccani per la lingua). Contesto: stile e comportamento del gentleman classico, oggi, in Italia.

Tema: ${x.tema}
Insegnamento: ${x.titolo}
Cosa sostiene il contenuto: ${x.affermazione}
${x.dettaglio ? `Dettagli: ${x.dettaglio}` : ""}

Rispondi SOLO con JSON (niente altro testo):
{"verdetto":"fondato | in_parte | opinione | infondato | non_verificabile","spiegazione":"2-3 frasi in italiano: cosa c'è di vero e cosa no","versione_corretta":"come andrebbe detto correttamente se in_parte o infondato, altrimenti null"}
Usa "opinione" per gusti personali o convenzioni di stile su cui gli esperti non concordano. Non inventare.`;
        try {
          const r = await gemini([{ text: prompt }], { search: true, temperature: 0.1 });
          const v = parseJson(r.text) || {};
          // deno-lint-ignore no-explicit-any
          const fonti = ((r.grounding?.groundingChunks || []) as any[])
            .map((g) => g.web)
            .filter((w) => w?.uri)
            .reduce((acc: { titolo: string; url: string }[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || new URL(w.uri).hostname, url: w.uri }]), [])
            .slice(0, 5);
          results.push({
            user_id: user.id,
            content_id: id,
            tema: x.tema,
            corso: x.corso,
            titolo: x.titolo,
            affermazione: x.affermazione,
            dettaglio: x.dettaglio,
            verdetto: VERDETTI.includes(v.verdetto) ? v.verdetto : "non_verificabile",
            spiegazione: v.spiegazione || "Verifica non riuscita.",
            versione_corretta: v.versione_corretta && v.versione_corretta !== "null" ? String(v.versione_corretta) : null,
            fonti,
          });
        } catch (e) {
          results.push({ user_id: user.id, content_id: id, tema: x.tema, corso: x.corso, titolo: x.titolo, affermazione: x.affermazione, dettaglio: x.dettaglio, verdetto: "non_verificabile", spiegazione: `Verifica non riuscita: ${(e as Error).message}`, fonti: [] });
        }
      };
      // 4 verifiche alla volta
      for (let i = 0; i < ins.length; i += 4) await Promise.all(ins.slice(i, i + 4).map(one));

      // verifica dei tutorial: ogni passaggio confrontato con le fonti
      const { data: tuts } = await sb.from("tutorials").select("id, titolo, data").eq("content_id", id).eq("stato", "proposta");
      await Promise.all(
        (tuts || []).map(async (t: { id: string; titolo: string; data: { passaggi: { titolo: string; testo: string }[] } }) => {
          const steps = t.data.passaggi.map((p, i) => `${i + 1}. ${p.titolo}: ${p.testo}`).join("\n");
          try {
            const r = await gemini([{ text: `Verifica questo tutorial con fonti autorevoli (sartorie, camicerie e calzolai storici, manuali di galateo, testate serie di stile maschile, dermatologi per la rasatura). Controlla che i passaggi siano corretti, completi e nell'ordine giusto.

Tutorial: ${t.titolo}
${steps}

Rispondi SOLO con JSON: {"verdetto":"fondato | in_parte | infondato | non_verificabile","spiegazione":"2-3 frasi","correzioni":[{"passaggio":numero,"nota":"cosa correggere o aggiungere"}]}` }], { search: true, temperature: 0.1 });
            const v = parseJson(r.text) || {};
            // deno-lint-ignore no-explicit-any
            const fonti = ((r.grounding?.groundingChunks || []) as any[]).map((g) => g.web).filter((w) => w?.uri).reduce((acc: { titolo: string; url: string }[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || new URL(w.uri).hostname, url: w.uri }]), []).slice(0, 5);
            await sb.from("tutorials").update({ verifica: { verdetto: VERDETTI.includes(v.verdetto) ? v.verdetto : "non_verificabile", spiegazione: v.spiegazione || "", correzioni: Array.isArray(v.correzioni) ? v.correzioni.slice(0, 12) : [], fonti } }).eq("id", t.id);
          } catch (e) {
            await sb.from("tutorials").update({ verifica: { verdetto: "non_verificabile", spiegazione: `Verifica non riuscita: ${(e as Error).message}`, correzioni: [], fonti: [] } }).eq("id", t.id);
          }
        }),
      );
      if (results.length) {
        const { error } = await sb.from("knowledge").insert(results);
        if (error) throw new Error(error.message);
      }
      await sb.from("contents").update({ status: "pronto" }).eq("id", id);
      return json({ ok: true, verificati: results.length });
    }
    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (id) await sb.from("contents").update({ status: "errore", error: msg.slice(0, 300) }).eq("id", id);
    return json({ error: msg }, 500);
  }
});
