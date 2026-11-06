import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { analyzeInspiration, buildGuide, igPost } from "./style.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
// Models are discovered at runtime (Google retires names often) with automatic fallback.
let modelCache: { text: string[]; image: string[]; all: string[] } | null = null;
function ver(n: string) {
  const m = n.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
async function models() {
  if (modelCache) return modelCache;
  const r = await fetch(`${GEMINI}?key=${geminiKey()}&pageSize=1000`);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Impossibile leggere i modelli AI");
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const byVer = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x) || x.length - y.length);
  const text = [
    ...byVer(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n))),
    ...gen.filter((n) => n === "gemini-flash-latest"),
    ...byVer(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n))),
  ];
  const image = [
    ...byVer(gen.filter((n) => /^gemini-[\d.]+-flash-image$/.test(n))),
    ...gen.filter((n) => /nano-banana/.test(n) && !/preview/.test(n)),
    ...byVer(gen.filter((n) => /^gemini-[\d.]+-pro-image$/.test(n))),
    ...byVer(gen.filter((n) => /^gemini-[\d.]+-flash-image-preview$/.test(n))),
    ...gen.filter((n) => /nano-banana/.test(n) && /preview/.test(n)),
  ];
  const envT = Deno.env.get("GEMINI_TEXT_MODEL"), envI = Deno.env.get("GEMINI_IMAGE_MODEL");
  modelCache = {
    text: [...(envT ? [envT] : []), ...text].slice(0, 6),
    image: [...(envI ? [envI] : []), ...image].slice(0, 6),
    all: gen,
  };
  return modelCache;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
type Img = { mime: string; data: string };

async function fetchImage(url: string): Promise<Img> {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*,*/*" } });
  if (!r.ok) throw new Error(`Immagine non scaricabile (${r.status})`);
  const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!mime.startsWith("image/")) throw new Error("Il link non è un'immagine");
  return { mime, data: toB64(await r.arrayBuffer()) };
}

function geminiKey() {
  const k = Deno.env.get("GEMINI_API_KEY");
  if (!k) throw new Error("CHIAVE_AI_MANCANTE");
  return k.trim();
}

async function geminiOnce(model: string, parts: unknown[], config: Record<string, unknown>) {
  const r = await fetch(`${GEMINI}/${model}:generateContent?key=${geminiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: config }),
  });
  const body = await r.json();
  if (!r.ok) {
    const e = new Error(body?.error?.message || `Errore AI ${r.status}`) as Error & { retry?: boolean };
    e.retry = [429, 404, 500, 503].includes(r.status) || /demand|overloaded|no longer available|not found|unavailable/i.test(e.message);
    throw e;
  }
  return body?.candidates?.[0]?.content?.parts ?? [];
}
async function gemini(kind: "text" | "image", parts: unknown[], config: Record<string, unknown> = {}) {
  const list = (await models())[kind];
  let last: unknown = new Error("Nessun modello AI disponibile");
  for (const m of list) {
    try {
      return await geminiOnce(m, parts, config);
    } catch (e) {
      last = e;
      if (!(e as { retry?: boolean }).retry) throw e;
    }
  }
  throw last;
}

const imgPart = (i: Img) => ({ inline_data: { mime_type: i.mime, data: i.data } });

async function geminiImage(parts: unknown[]): Promise<Img> {
  const out = await gemini("image", parts, { responseModalities: ["IMAGE", "TEXT"] });
  // deno-lint-ignore no-explicit-any
  const p = out.find((x: any) => x.inline_data || x.inlineData) as any;
  const d = p?.inline_data || p?.inlineData;
  if (!d) throw new Error("L'AI non ha restituito un'immagine, riprova");
  return { mime: d.mime_type || d.mimeType || "image/png", data: d.data };
}

const CATEGORIE = [
  "Felpe e Maglioni", "Maglie", "Camicie", "Canotte", "Pantaloni", "Giacche e Cappotti", "Scarpe", "Accessori",
];

async function analyze(img: Img) {
  const out = await gemini(
    "text",
    [
      imgPart(img),
      {
        text: `Analizza il capo di abbigliamento principale in questa immagine. Rispondi SOLO con JSON:
{"nome": breve nome italiano tipo "Felpa verde oliva" o "Jeans chiari a gamba larga",
 "categoria": una tra ${JSON.stringify(CATEGORIE)},
 "colore": colore principale in italiano,
 "stagione": "Primavera/Estate" | "Autunno/Inverno" | "Tutte",
 "formalita": "Casual" | "Smart casual" | "Elegante" | "Sport",
 "brand": brand se visibile altrimenti null}`,
      },
    ],
    { responseMimeType: "application/json", temperature: 0.2 },
  );
  // deno-lint-ignore no-explicit-any
  const txt = out.map((p: any) => p.text || "").join("");
  try {
    const j = JSON.parse(txt);
    if (!CATEGORIE.includes(j.categoria)) j.categoria = "Maglie";
    return j;
  } catch {
    return { nome: "Nuovo capo", categoria: "Maglie" };
  }
}

async function cutout(img: Img): Promise<Img> {
  return await geminiImage([
    imgPart(img),
    {
      text:
        "Estrai SOLO il capo di abbigliamento principale da questa foto e restituiscilo come foto prodotto da catalogo e-commerce: capo isolato, disteso/ghost mannequin, vista frontale, centrato, interamente visibile, su sfondo BIANCO PURO uniforme (#FFFFFF), nessuna persona, nessun manichino visibile, nessuna ombra marcata, nessun testo. Mantieni fedelmente colore, tessuto, stampe e dettagli originali.",
    },
  ]);
}

async function ddgImages(q: string) {
  const h = { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" };
  const page = await (await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, { headers: h })).text();
  const vqd = page.match(/vqd=["']?([\d-]+)["']?/)?.[1];
  if (!vqd) throw new Error("no vqd");
  const r = await fetch(
    `https://duckduckgo.com/i.js?l=it-it&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`,
    { headers: { ...h, Referer: "https://duckduckgo.com/" } },
  );
  const j = await r.json();
  // deno-lint-ignore no-explicit-any
  return (j.results || []).slice(0, 30).map((x: any) => ({
    image: x.image, thumbnail: x.thumbnail, title: x.title, source: x.source || x.url,
  }));
}
async function bingImages(q: string) {
  const html = await (await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1`, {
    headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" },
  })).text();
  const res: { image: string; thumbnail: string; title: string; source: string }[] = [];
  const re = /m="(\{[^"]*?\})"/g;
  let m;
  while ((m = re.exec(html)) && res.length < 30) {
    try {
      const o = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
      if (o.murl) res.push({ image: o.murl, thumbnail: o.turl || o.murl, title: o.t || "", source: o.purl || "" });
    } catch { /* skip */ }
  }
  return res;
}

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
async function readLink(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9", Accept: "text/html" } });
  const html = await r.text();
  const meta = (p: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`, "i"))?.[1];
  let nome = meta("og:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1] || "";
  let image = meta("og:image") || meta("twitter:image") || "";
  let prezzo = meta("product:price:amount") || meta("og:price:amount") || "";
  let brand = meta("product:brand") || meta("og:site_name") || "";
  for (const blk of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(blk[1]);
      const items = Array.isArray(data) ? data : data["@graph"] || [data];
      // deno-lint-ignore no-explicit-any
      const p = items.find((x: any) => String(x["@type"]).includes("Product"));
      if (p) {
        nome = p.name || nome;
        image = (Array.isArray(p.image) ? p.image[0] : p.image?.url || p.image) || image;
        const off = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        prezzo = off?.price ? `${off.price} ${off.priceCurrency || ""}`.trim() : prezzo;
        brand = p.brand?.name || p.brand || brand;
        break;
      }
    } catch { /* skip */ }
  }
  if (image && image.startsWith("//")) image = "https:" + image;
  if (image && image.startsWith("/")) image = new URL(image, url).toString();
  return { nome: decode(nome).trim(), image: decode(image), prezzo, brand: typeof brand === "string" ? brand : "" };
}

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const uid = user.id;
    const body = await req.json();

    const download = async (bucket: string, path: string): Promise<Img> => {
      const { data, error } = await sb.storage.from(bucket).download(path);
      if (error || !data) throw new Error("File non trovato: " + path);
      return { mime: data.type || "image/png", data: toB64(await data.arrayBuffer()) };
    };
    const upload = async (bucket: string, img: Img, prefix: string) => {
      const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
      const path = `${uid}/${prefix}-${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(bucket).upload(path, fromB64(img.data), { contentType: img.mime });
      if (error) throw new Error(error.message);
      return path;
    };

    switch (body.action) {
      case "search": {
        const q = String(body.query || "").trim();
        if (!q) return json({ results: [] });
        let results: unknown[] = [];
        try { results = await ddgImages(q); } catch { /* fallback */ }
        if (!results.length) { try { results = await bingImages(q); } catch { /* none */ } }
        return json({ results });
      }
      case "models": {
        const m = await models();
        return json({ text: m.text, image: m.image, all: m.all });
      }
      case "link": {
        return json(await readLink(String(body.url)));
      }
      case "import": {
        // body: { path?: storage path in garments, url?: image url, extra?: {...} }
        let original: Img;
        let originalPath: string;
        if (body.path) {
          originalPath = body.path;
          original = await download("garments", body.path);
        } else {
          original = await fetchImage(String(body.url));
          originalPath = await upload("garments", original, "orig");
        }
        const [info, cut] = await Promise.allSettled([analyze(original), cutout(original)]);
        if (info.status === "rejected" && String(info.reason).includes("CHIAVE_AI_MANCANTE")) {
          throw new Error("CHIAVE_AI_MANCANTE");
        }
        const meta = info.status === "fulfilled" ? info.value : { nome: "Nuovo capo", categoria: "Maglie" };
        const cutoutPath = cut.status === "fulfilled" ? await upload("garments", cut.value, "cut") : null;
        const extra = body.extra || {};
        const row = {
          user_id: uid,
          nome: extra.nome || meta.nome || "Nuovo capo",
          categoria: extra.categoria || meta.categoria || "Maglie",
          colore: meta.colore ?? null,
          stagione: meta.stagione ?? null,
          formalita: meta.formalita ?? null,
          brand: extra.brand || meta.brand || null,
          prezzo: extra.prezzo || null,
          image_original_path: originalPath,
          image_cutout_path: cutoutPath,
          source: body.source || (body.url ? "web" : "foto"),
          source_url: extra.source_url || body.url || null,
        };
        const { data, error } = await sb.from("garments").insert(row).select().single();
        if (error) throw new Error(error.message);
        const aiErr = info.status === "rejected" ? String(info.reason) : cut.status === "rejected" ? String(cut.reason) : null;
        return json({ garment: data, cutout_ok: !!cutoutPath, ai_error: aiErr });
      }
      case "recut": {
        const { data: g } = await sb.from("garments").select("*").eq("id", body.id).single();
        if (!g) throw new Error("Capo non trovato");
        const cut = await cutout(await download("garments", g.image_original_path));
        const p = await upload("garments", cut, "cut");
        await sb.from("garments").update({ image_cutout_path: p }).eq("id", g.id);
        return json({ image_cutout_path: p });
      }
      case "ig_post": {
        // body: { url } → scarica l'immagine del post e la salva nelle ispirazioni
        const p = await igPost(String(body.url || ""));
        const img = await fetchImage(p.image);
        const path = await upload("inspirations", img, "ig");
        return json({ path, username: p.username, caption: p.caption });
      }
      case "inspire": {
        // body: { id } → analisi dello stile delle immagini di un'ispirazione
        const { data: insp } = await sb.from("inspirations").select("*").eq("id", body.id).single();
        if (!insp) throw new Error("Ispirazione non trovata");
        await sb.from("inspirations").update({ status: "analisi", error: null }).eq("id", insp.id);
        try {
          const paths: string[] = (insp.image_paths || []).slice(0, 14);
          if (!paths.length) throw new Error("Nessuna immagine da analizzare");
          const imgs = await Promise.all(paths.map((p) => download("inspirations", p)));
          const analysis = await analyzeInspiration(gemini, imgs, insp.handle);
          await sb.from("inspirations").update({ analysis, status: "pronto" }).eq("id", insp.id);
          return json({ analysis });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await sb.from("inspirations").update({ status: "errore", error: msg.slice(0, 300) }).eq("id", insp.id);
          throw e;
        }
      }
      case "style_guide": {
        const [{ data: picks }, { data: wardrobe }, { data: prof }, { data: insps }] = await Promise.all([
          sb.from("style_picks").select("kind, value, inspiration_id"),
          sb.from("garments").select("id, nome, categoria, colore, formalita"),
          sb.from("profiles").select("*").eq("id", uid).single(),
          sb.from("inspirations").select("id, handle, title"),
        ]);
        if (!picks?.length) throw new Error("Seleziona prima qualche elemento dalle tue ispirazioni");
        const name = new Map((insps || []).map((i) => [i.id, i.handle ? "@" + i.handle : i.title]));
        const guide = await buildGuide(
          gemini,
          picks.map((p) => ({ kind: p.kind, value: p.value, fonte: (p.inspiration_id && name.get(p.inspiration_id)) || null })),
          wardrobe || [],
          prof,
        );
        await sb.from("profiles").update({ style_guide: guide }).eq("id", uid);
        return json({ guide });
      }
      case "tryon": {
        // body: { garment_ids: string[] } ordered bottom->top layers
        const { data: prof } = await sb.from("profiles").select("*").eq("id", uid).single();
        if (!prof?.avatar_photo_path) throw new Error("Carica prima una tua foto a figura intera nel Profilo");
        const ids: string[] = body.garment_ids || [];
        if (!ids.length) throw new Error("Seleziona almeno un capo");
        const hash = await sha(prof.avatar_photo_path + "|" + ids.join(","));
        const { data: cached } = await sb.from("tryon_cache").select("image_path").eq("hash", hash).maybeSingle();
        if (cached) return json({ image_path: cached.image_path, cached: true });
        const { data: gs } = await sb.from("garments").select("*").in("id", ids);
        // deno-lint-ignore no-explicit-any
        const ordered = ids.map((id) => gs?.find((g: any) => g.id === id)).filter(Boolean) as any[];
        const person = await download("avatars", prof.avatar_photo_path);
        const parts: unknown[] = [{ text: "IMMAGINE 1 – la persona:" }, imgPart(person)];
        const desc: string[] = [];
        for (let i = 0; i < ordered.length; i++) {
          const g = ordered[i];
          parts.push({ text: `IMMAGINE ${i + 2} – capo: ${g.nome} (${g.categoria})` });
          parts.push(imgPart(await download("garments", g.image_cutout_path || g.image_original_path)));
          desc.push(`${g.nome} (${g.categoria})`);
        }
        parts.push({
          text:
            `Virtual try-on fotorealistico. Genera una foto a figura intera della STESSA persona dell'immagine 1 (stesso volto, corporatura, carnagione, capelli, stessa posa frontale in piedi) che indossa questi capi: ${desc.join(", ")}. ` +
            `Gli strati sono in ordine dal più interno al più esterno. Riproduci fedelmente colori, tessuti, stampe e vestibilità dei capi. Per le parti non coperte dai capi forniti mantieni ciò che la persona indossa o usa capi neutri coerenti. ` +
            `Sfondo da studio fotografico grigio chiarissimo uniforme, luce morbida, persona centrata dalla testa ai piedi, formato verticale. Nessun testo.`,
        });
        const out = await geminiImage(parts);
        const path = await upload("tryons", out, "tryon");
        await sb.from("tryon_cache").insert({ user_id: uid, hash, image_path: path });
        return json({ image_path: path, cached: false });
      }
      default:
        return json({ error: "Azione sconosciuta" }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("CHIAVE_AI_MANCANTE")) {
      return json({ error: "Chiave AI non configurata: aggiungi GEMINI_API_KEY su Supabase", code: "NO_KEY" }, 503);
    }
    return json({ error: msg }, 500);
  }
});
