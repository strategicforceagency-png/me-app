import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Armadio intelligente.
 * POST { action: "etichetta", id, path }       legge l'etichetta del capo (lavaggio, composizione, stagioni, come indossarlo)
 * POST { action: "trova", id }                 cerca online il prodotto esatto (pagina, foto ufficiale, prezzo)
 * POST { action: "usa_foto", id }              sostituisce la foto del capo con quella ufficiale trovata online
 * POST { action: "meteo", lat, lon, luogo }    meteo di oggi e, se c'è un outfit pianificato, lo adatta con giudizio
 * POST { action: "revisione" }                 rianalisi dell'armadio: cosa tenere, vendere su Vinted, regalare, e i sostituti
 * POST /cron { user_id, tipo }                 (x-cron) revisione ogni 15 giorni e controllo meteo del mattino
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEM = "https://generativelanguage.googleapis.com/v1beta";
const QUOTA = "L'AI ha esaurito per ora la quota gratuita di Google: riprova tra qualche minuto (con la fatturazione attiva su Google AI Studio non ci sono limiti)";
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
const key = () => {
  const k = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!k) throw new Error("Chiave AI non configurata");
  return k;
};
let textModels: string[] | null = null;
async function models() {
  if (textModels) return textModels;
  const j = await (await fetch(`${GEM}/models?key=${key()}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  const vivo = (n: string) => !/^gemini-[12]\./.test(n);
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-lite-latest")].slice(0, 9);
  return textModels;
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
type Fonte = { titolo: string; url: string };
// deno-lint-ignore no-explicit-any
async function ask0(parts: any[], search: boolean, ms = 50000): Promise<{ out: any; fonti: Fonte[] }> {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        ...(search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.3, maxOutputTokens: 12000, ...(search ? {} : { responseMimeType: "application/json" }) },
      }),
    }, ms);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status) || /demand|overloaded|unavailable/i.test(last)) continue;
      throw new Error(last);
    }
    const c = j.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const out = parseJson((c?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join(""));
    if (!out) {
      last = "Risposta non valida, riprova";
      continue;
    }
    // deno-lint-ignore no-explicit-any
    const fonti = ((c?.groundingMetadata?.groundingChunks || []) as any[])
      .map((g) => g.web)
      .filter((w) => w?.uri)
      .reduce((acc: Fonte[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || "fonte", url: w.uri }]), [])
      .slice(0, 10);
    return { out, fonti };
  }
  throw new Error(/quota|exceeded|demand|overloaded|no longer available/i.test(last) ? QUOTA : last);
}
/** Con ricerca Google; se la ricerca ha finito la quota si risponde comunque, senza fonti. */
// deno-lint-ignore no-explicit-any
async function ask(parts: any[], search: boolean, ms?: number) {
  try {
    return await ask0(parts, search, ms);
  } catch (e) {
    if (search && /quota|tempo/i.test(String(e))) return { ...(await ask0(parts, false, ms)), senza_ricerca: true };
    throw e;
  }
}
const cleanUrl = (u: unknown) => {
  const s = String(u || "").trim();
  return /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(s) && !/example\.com|vertexaisearch/i.test(s) ? s : null;
};
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
async function ogImage(url: string) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 400000);
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    const img = m?.[1]?.replace(/&amp;/g, "&");
    return img ? new URL(img, r.url).toString() : null;
  } catch {
    return null;
  }
}
async function imgPart(sb: SupabaseClient, bucket: string, path: string | null) {
  if (!path) return null;
  const { data } = await sb.storage.from(bucket).download(path);
  if (!data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { inline_data: { mime_type: data.type || "image/jpeg", data: btoa(s) } };
}

/* ------------------------------ meteo ------------------------------ */
const WMO: Record<number, string> = { 0: "sereno", 1: "quasi sereno", 2: "parz. nuvoloso", 3: "coperto", 45: "nebbia", 48: "nebbia", 51: "pioviggine", 53: "pioviggine", 55: "pioviggine fitta", 61: "pioggia debole", 63: "pioggia", 65: "pioggia forte", 71: "neve debole", 73: "neve", 75: "neve forte", 80: "rovesci", 81: "rovesci", 82: "rovesci forti", 95: "temporale", 96: "temporale con grandine", 99: "temporale con grandine" };
async function meteo(lat: number, lon: number) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset&timezone=auto&forecast_days=1`;
  const j = await (await fetch(u, { signal: AbortSignal.timeout(10000) })).json();
  const h = j.hourly || {};
  const ore = (h.time || []).map((t: string, i: number) => ({
    ora: t.slice(11, 16),
    temp: Math.round(h.temperature_2m[i]),
    percepita: Math.round(h.apparent_temperature[i]),
    pioggia_prob: h.precipitation_probability?.[i] ?? 0,
    pioggia_mm: h.precipitation?.[i] ?? 0,
    cielo: WMO[h.weather_code?.[i]] || "—",
    vento: Math.round(h.wind_speed_10m?.[i] ?? 0),
    umidita: h.relative_humidity_2m?.[i] ?? null,
    uv: h.uv_index?.[i] ?? null,
  }));
  const d = j.daily || {};
  const giorno = ore.filter((o: { ora: string }) => o.ora >= "07:00" && o.ora <= "23:00");
  const pioggia = giorno.filter((o: { pioggia_prob: number; pioggia_mm: number }) => o.pioggia_prob >= 40 && o.pioggia_mm >= 0.2);
  return {
    min: Math.round(d.temperature_2m_min?.[0]),
    max: Math.round(d.temperature_2m_max?.[0]),
    pioggia_max: d.precipitation_probability_max?.[0] ?? 0,
    pioggia_tot: d.precipitation_sum?.[0] ?? 0,
    ore_pioggia: pioggia.map((o: { ora: string }) => o.ora),
    cielo: (() => {
      const c: Record<string, number> = {};
      giorno.forEach((o: { cielo: string }) => (c[o.cielo] = (c[o.cielo] || 0) + 1));
      return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    })(),
    ore: giorno,
  };
}
async function luogoDa(lat: number, lon: number) {
  try {
    const j = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it&zoom=12`, { headers: { "User-Agent": "Habitus personal app" }, signal: AbortSignal.timeout(6000) })).json();
    const n = j.address?.city || j.address?.town || j.address?.village || j.address?.municipality;
    if (n) return n;
  } catch {
    /* si prova l'altro servizio */
  }
  try {
    const j = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=it`, { signal: AbortSignal.timeout(6000) })).json();
    return j.city || j.locality || null;
  } catch {
    return null;
  }
}
async function coordDa(citta: string) {
  try {
    const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citta)}&count=1&language=it`, { signal: AbortSignal.timeout(6000) })).json();
    const r = j.results?.[0];
    return r ? { lat: r.latitude, lon: r.longitude, luogo: r.name } : null;
  } catch {
    return null;
  }
}

// deno-lint-ignore no-explicit-any
const capoTxt = (g: any) => `${g.id} | ${g.nome} | ${g.categoria}${g.colore ? " | " + g.colore : ""}${g.stagione ? " | stagione " + g.stagione : ""}${g.formalita ? " | " + g.formalita : ""}${g.brand ? " | " + g.brand : ""}${g.etichetta?.composizione ? " | " + g.etichetta.composizione : ""}${g.etichetta?.peso ? " | " + g.etichetta.peso : ""}`;

async function doMeteo(sb: SupabaseClient, uid: string, b: { lat?: number; lon?: number; luogo?: string }) {
  const { data: prof } = await sb.from("profiles").select("nome, citta, posizione, palette, style_guide").eq("id", uid).maybeSingle();
  let lat = Number(b.lat), lon = Number(b.lon), luogo = b.luogo || null;
  if (!isFinite(lat) || !isFinite(lon) || (!lat && !lon)) {
    const pos = prof?.posizione as { lat?: number; lon?: number; luogo?: string } | null;
    if (pos?.lat) ({ lat, lon } = pos as { lat: number; lon: number }), (luogo = pos.luogo || null);
    else {
      const c = await coordDa(prof?.citta || "Napoli");
      if (!c) throw new Error("Non riesco a capire dove si trova");
      ({ lat, lon, luogo } = c);
    }
  } else {
    luogo = luogo || (await luogoDa(lat, lon));
    await sb.from("profiles").update({ posizione: { lat, lon, luogo, data: new Date().toISOString() } }).eq("id", uid);
  }
  const m = await meteo(lat, lon);
  const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const { data: outs } = await sb.from("outfits").select("id, nome, stile, giorno, meteo, outfit_items(garment_id, slot, layer)").eq("giorno", oggi).limit(1);
  const outfit = outs?.[0] || null;
  const { data: gar } = await sb.from("garments").select("id, nome, categoria, colore, stagione, formalita, brand, etichetta").neq("stato", "venduto").limit(250);
  const byId = new Map((gar || []).map((g) => [g.id, g]));
  const pezzi = (outfit?.outfit_items || []).map((i: { garment_id: string }) => byId.get(i.garment_id)).filter(Boolean);
  const pal = prof?.palette as { stagione?: string } | null;
  const prompt = `Sei Alfred, il maggiordomo inglese del Signor ${(prof?.nome || "").split(" ")[0]}: gli dai del Lei, con garbo e un filo di ironia asciutta.
Oggi a ${luogo || prof?.citta || "—"}: minima ${m.min}°, massima ${m.max}°, probabilità massima di pioggia ${m.pioggia_max}%, pioggia totale ${m.pioggia_tot} mm, ore con pioggia probabile: ${m.ore_pioggia.join(", ") || "nessuna"}.
Ora per ora (7-23): ${m.ore.map((o: { ora: string; temp: number; percepita: number; pioggia_prob: number; pioggia_mm: number; cielo: string; vento: number }) => `${o.ora} ${o.temp}° (percepiti ${o.percepita}°), ${o.cielo}, pioggia ${o.pioggia_prob}% ${o.pioggia_mm}mm, vento ${o.vento} km/h`).join("; ")}
${outfit ? `Outfit pianificato per oggi "${outfit.nome}" (${outfit.stile || ""}): ${pezzi.map(capoTxt).join(" || ")}` : "Non c'è un outfit pianificato per oggi."}
Il suo armadio: ${(gar || []).map(capoTxt).join(" || ").slice(0, 9000)}
Armocromia: ${pal?.stagione || "—"}. Stile: ${(prof?.style_guide as { nome_stile?: string } | null)?.nome_stile || "gentleman classico"}.

REGOLE DI GIUDIZIO (importanti):
- Pesa il meteo in modo proporzionato. Una pioggia con probabilità bassa (sotto il 30%) o breve e debole (pochi minuti, < 1 mm) in un orario marginale NON cambia l'outfit: al massimo suggerisci un ombrello pieghevole o un capo da tenere a portata.
- Cambia un capo solo se il meteo reale lo rende davvero inadatto: temperatura percepita lontana di 3° o più da quella per cui il capo è pensato per gran parte della giornata, pioggia probabile e prolungata nelle ore in cui sarà fuori, vento forte, caldo umido.
- Cambia il minimo indispensabile e sempre con capi del SUO armadio (usa gli id esatti), coerenti con il resto dell'outfit, la formalità e l'armocromia. Le scarpe scamosciate o in suede con pioggia vera vanno sostituite.
- Se non c'è un outfit pianificato, proponine uno adatto al meteo con i suoi capi.
Rispondi SOLO con JSON in italiano:
{"sintesi":"il meteo di oggi in una frase","verdetto":"va_bene | piccoli_ritocchi | da_cambiare | proposta","messaggio":"2-3 frasi nel tuo stile, rivolte a lui","modifiche":[{"togli":"id del capo da togliere o null","metti":"id del capo da mettere o null","perche":"breve"}],"proposta":["id dei capi se non c'era un outfit pianificato, altrimenti []"],"accessori":["es. ombrello pieghevole dalle 19, occhiali da sole, sciarpa leggera"],"strati":"consiglio su come vestirsi a strati se l'escursione termica è ampia, o null"}`;
  const { out } = await ask([{ text: prompt }], false);
  const valid = (id: unknown) => (typeof id === "string" && byId.has(id) ? id : null);
  const res = {
    luogo,
    meteo: { min: m.min, max: m.max, pioggia_max: m.pioggia_max, pioggia_tot: m.pioggia_tot, ore_pioggia: m.ore_pioggia, ore: m.ore.filter((_: unknown, i: number) => i % 2 === 0) },
    outfit_id: outfit?.id || null,
    outfit_nome: outfit?.nome || null,
    sintesi: out.sintesi || "",
    verdetto: out.verdetto || (outfit ? "va_bene" : "proposta"),
    messaggio: out.messaggio || "",
    modifiche: (out.modifiche || []).map((x: { togli: unknown; metti: unknown; perche: string }) => ({ togli: valid(x.togli), metti: valid(x.metti), perche: x.perche })).filter((x: { togli: string | null; metti: string | null }) => x.togli || x.metti),
    proposta: (out.proposta || []).map(valid).filter(Boolean),
    accessori: out.accessori || [],
    strati: out.strati || null,
    data: new Date().toISOString(),
    giorno: oggi,
  };
  if (outfit) await sb.from("outfits").update({ meteo: res }).eq("id", outfit.id);
  return res;
}

/* ---------------------------- revisione ---------------------------- */
async function doRevisione(sb: SupabaseClient, uid: string) {
  const [{ data: prof }, { data: gar }, { data: fis }] = await Promise.all([
    sb.from("profiles").select("nome, citta, altezza, peso, taglia_top, taglia_pantaloni, taglia_scarpe, style_guide, palette, budget, gentleman, scheda, armadio_revisione").eq("id", uid).maybeSingle(),
    sb.from("garments").select("id, nome, categoria, colore, stagione, formalita, brand, taglia, prezzo, utilizzi, created_at, etichetta, stato, note, image_cutout_path, image_original_path").eq("stato", "attivo").limit(250),
    sb.from("fisionomia").select("analisi").order("created_at", { ascending: false }).limit(1),
  ]);
  if (!gar?.length) throw new Error("L'armadio è vuoto: aggiunga prima qualche capo");
  // deno-lint-ignore no-explicit-any
  const p = prof as any;
  const oggi = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  // 1) giudizio su tutto l'armadio, con le foto dei capi (fino a 24) per vedere usura e linea
  // deno-lint-ignore no-explicit-any
  const parts: any[] = [];
  const conFoto = gar.slice(0, 24);
  for (const g of conFoto) {
    const im = await imgPart(sb, "garments", g.image_cutout_path || g.image_original_path).catch(() => null);
    if (im) parts.push({ text: `Foto del capo ${g.id}:` }, im);
  }
  parts.push({
    text: `Sei un consulente d'immagine per un gentleman (stile inglese anni '60-'70 adattato all'Italia di oggi) e un esperto di moda attuale e di mercato dell'usato. Oggi è ${oggi}.
Lui: ${p?.nome || "—"}, ${p?.altezza || "?"} cm, ${p?.peso || "?"} kg, taglie ${p?.taglia_top || "?"}/${p?.taglia_pantaloni || "?"}/${p?.taglia_scarpe || "?"}. Città ${p?.citta || "Napoli"}.
Stile scelto: ${p?.style_guide?.nome_stile || "classico"} — ${(p?.style_guide?.parole_chiave || []).join(", ")}. Armocromia: ${p?.palette?.stagione || "—"} (colori: ${(p?.palette?.colori || []).map((c: { nome: string }) => c.nome).join(", ")}; da evitare: ${(p?.palette?.evitare || []).map((c: { nome: string }) => c.nome).join(", ")}). Fisionomia: ${JSON.stringify(fis?.[0]?.analisi?.forma_viso || fis?.[0]?.analisi?.riassunto || "—").slice(0, 300)}.
Obiettivi e vita: ${JSON.stringify(p?.gentleman || {}).slice(0, 1200)}. Budget guardaroba: ${JSON.stringify(p?.budget || {})}.
Cosa sappiamo di lui: ${(p?.scheda?.fatti || []).map((f: { testo: string }) => f.testo).join("; ").slice(0, 1500)}
L'armadio (id | nome | categoria | colore | stagione | formalità | marca | taglia | prezzo | utilizzi | aggiunto il): ${gar.map((g) => `${g.id} | ${g.nome} | ${g.categoria} | ${g.colore || ""} | ${g.stagione || ""} | ${g.formalita || ""} | ${g.brand || ""} | ${g.taglia || ""} | ${g.prezzo || ""} | ${g.utilizzi || 0} | ${String(g.created_at).slice(0, 10)}`).join("\n")}
Revisione precedente: ${JSON.stringify((p?.armadio_revisione?.capi || []).map((c: { id: string; verdetto: string }) => ({ id: c.id, verdetto: c.verdetto }))).slice(0, 1500)}

Valuta OGNI capo con onestà: è ancora in linea con il suo stile e la sua armocromia? è fuori moda o datato (non "classico intramontabile", proprio datato)? sembra rovinato, sformato, scolorito? la taglia gli va ancora (se lo deduci dalla foto o dalle taglie)? è doppione di qualcosa di migliore? lo usa?
Verdetti: "tieni" (va bene), "rivedi" (va sistemato: sarto, lavaggio, abbinamenti), "vendi" (ha valore sull'usato, es. Vinted), "regala" (poco valore o brutto, meglio donarlo o regalarlo).
Scrivi come Alfred, il suo maggiordomo: gli dai del Lei (mai del tu), con garbo. Rispondi SOLO con JSON in italiano: {"sintesi":"3 frasi sullo stato dell'armadio","stagioni":{"primavera":"cosa ha e cosa manca","estate":"","autunno":"","inverno":""},"capi":[{"id":"","verdetto":"tieni | rivedi | vendi | regala","motivo":"1-2 frasi concrete","urgenza":"alta | media | bassa"}],"mancano":["capi che mancano davvero, in ordine di priorità"]}`,
  });
  const { out } = await ask(parts, false, 70000);
  const ids = new Set(gar.map((g) => g.id));
  const capi = ((out.capi || []) as { id: string; verdetto: string; motivo: string; urgenza: string }[]).filter((c) => ids.has(c.id));
  const byId = new Map(gar.map((g) => [g.id, g]));
  // 2) per i capi da vendere/regalare/rivedere: annuncio Vinted e sostituto, cercati sul web (in parallelo)
  const daLavorare = capi.filter((c) => c.verdetto !== "tieni").sort((a, b) => ["alta", "media", "bassa"].indexOf(a.urgenza) - ["alta", "media", "bassa"].indexOf(b.urgenza)).slice(0, 6);
  const dettagli = await Promise.all(
    daLavorare.map(async (c) => {
      const g = byId.get(c.id)!;
      const prompt = `Capo: ${g.nome} (${g.categoria}${g.colore ? ", " + g.colore : ""}${g.brand ? ", marca " + g.brand : ""}${g.taglia ? ", taglia " + g.taglia : ""}${g.prezzo ? ", pagato " + g.prezzo : ""}). Verdetto: ${c.verdetto} — ${c.motivo}.
Lui: stile ${p?.style_guide?.nome_stile || "gentleman classico"}, armocromia ${p?.palette?.stagione || "—"}, vive a ${p?.citta || "Napoli"}, budget ${JSON.stringify(p?.budget || {})}, taglie ${p?.taglia_top || "?"}/${p?.taglia_pantaloni || "?"}/${p?.taglia_scarpe || "?"}.
${c.verdetto === "vendi" ? `1) Cerca su Vinted (e su altri siti dell'usato come Vestiaire Collective, Subito, eBay) capi simili per marca, tipo e condizione e deduci un prezzo realistico a cui si vende davvero. Scrivi l'annuncio pronto da copiare.` : c.verdetto === "regala" ? "1) Spiega dove donarlo o a chi regalarlo (associazioni, cassonetti Humana/Caritas, amici), e se vale comunque la pena metterlo su Vinted a pochi euro." : "1) Spiega cosa fare per sistemarlo (sarto, lavaggio, tintura, abbinamenti) e quanto costa indicativamente."}
2) Cerca il SOSTITUTO migliore ovunque: Vinted e usato di qualità, Zalando, Zara, Massimo Dutti, COS, Uniqlo, Yoox, Mr Porter, marchi italiani e inglesi, artigiani e sartorie (anche negozi fisici a ${p?.citta || "Napoli"}). Dai più opzioni in fasce di prezzo diverse, solo prodotti reali e disponibili ora.
Rispondi SOLO con JSON in italiano: {"vinted":${c.verdetto === "rivedi" ? "null" : `{"titolo":"max 60 caratteri","descrizione":"testo pronto, onesto, con misure da completare tra [ ]","prezzo":"es. 25 €","prezzo_minimo":"sotto cui non scendere","categoria":"categoria Vinted","condizione":"Nuovo con cartellino | Nuovo senza cartellino | Ottime | Buone | Discrete","simili":"cosa hai trovato: es. 3 annunci simili tra 20 e 30 €","consigli":"foto da fare, orario per pubblicare"}`},"cosa_fare":"per rivedi o regala, altrimenti null","sostituto":{"cosa":"il capo ideale che lo sostituisce, descritto con precisione (tessuto, colore, taglio)","perche":"perché è meglio per lui","opzioni":[{"nome":"","marca":"","dove":"sito o negozio","tipo":"online | negozio | usato | sartoria","prezzo":"","link":"pagina trovata o null","ricerca":"query Google"}]}}`;
      try {
        const { out: o, fonti } = await ask([{ text: prompt }], true, 45000);
        if (o.sostituto) o.sostituto.opzioni = (o.sostituto.opzioni || []).slice(0, 6).map((x: Record<string, unknown>) => ({ ...x, link: cleanUrl(x.link) }));
        return { id: c.id, ...o, fonti };
      } catch (e) {
        return { id: c.id, errore: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  const det = new Map(dettagli.map((d) => [d.id, d]));
  const tutti = capi.map((c) => ({ ...c, nome: byId.get(c.id)?.nome, ...(det.get(c.id) || {}) }));
  const res = { data: new Date().toISOString(), sintesi: out.sintesi || "", stagioni: out.stagioni || {}, mancano: out.mancano || [], capi: tutti };
  await sb.from("profiles").update({ armadio_revisione: res }).eq("id", uid);
  for (const c of tutti) await sb.from("garments").update({ valutazione: { verdetto: c.verdetto, motivo: c.motivo, data: res.data } }).eq("id", c.id);
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  try {
    /* -------- chiamate pianificate (dal promemoria) -------- */
    if (route === "cron") {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "cron").single();
      if (!sec || req.headers.get("x-cron") !== sec.value) return json({ error: "no" }, 401);
      const { user_id, tipo } = await req.json();
      const notifica = async (title: string, body: string, vai: string, tag: string) =>
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/promemoria/invia`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": sec.value }, body: JSON.stringify({ user_id, title, body, url: `./?vai=${vai}`, tag }) }).then((r) => r.json()).catch(() => null);
      if (tipo === "revisione") {
        const r = await doRevisione(admin, user_id);
        const n = r.capi.filter((c) => c.verdetto !== "tieni").length;
        await notifica("Alfred ha rivisto il suo armadio", n ? `${n} capi da rivedere, vendere o regalare, con i sostituti già cercati.` : "Tutto in ordine, Signore. Nessun capo da togliere.", "armadio", "armadio");
        return json({ ok: true, capi: n });
      }
      if (tipo === "meteo") {
        const r = await doMeteo(admin, user_id, {});
        if (r.outfit_id && r.verdetto !== "va_bene") await notifica(r.verdetto === "da_cambiare" ? "Il meteo cambia l'outfit di oggi" : "Un ritocco all'outfit di oggi", `${r.sintesi} ${r.messaggio}`.slice(0, 220), "outfit", "meteo");
        return json({ ok: true, verdetto: r.verdetto });
      }
      return json({ error: "tipo sconosciuto" }, 400);
    }

    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();

    if (b.action === "etichetta") {
      const { data: g } = await sb.from("garments").select("*").eq("id", b.id).maybeSingle();
      if (!g) return json({ error: "Capo non trovato" }, 404);
      const path = b.path || g.etichetta_path;
      const lab = await imgPart(sb, "garments", path);
      if (!lab) return json({ error: "Foto dell'etichetta non trovata" }, 400);
      const capo = await imgPart(sb, "garments", g.image_cutout_path || g.image_original_path);
      const { data: prof } = await sb.from("profiles").select("citta, style_guide").eq("id", user.id).maybeSingle();
      // deno-lint-ignore no-explicit-any
      const parts: any[] = [{ text: "Foto dell'etichetta interna (composizione e simboli di lavaggio ISO 3758):" }, lab];
      if (capo) parts.push({ text: "Foto del capo:" }, capo);
      parts.push({
        text: `Capo: ${g.nome} (${g.categoria}${g.colore ? ", " + g.colore : ""}${g.brand ? ", " + g.brand : ""}). Lui vive a ${prof?.citta || "Napoli"} (clima mediterraneo) e veste in stile ${(prof?.style_guide as { nome_stile?: string } | null)?.nome_stile || "gentleman classico"}.
Leggi l'etichetta con attenzione: composizione esatta in %, simboli di lavaggio (vasca con temperatura o mano, candeggio, asciugatrice, ferro con punti, lavaggio a secco P/F/W), paese di produzione, taglia, marca. Se un simbolo non si legge, dillo invece di inventarlo.
Poi, unendo tessuto, peso apparente e taglio, deduci in quali stagioni metterlo, quando e come indossarlo e come curarlo.
Rispondi SOLO con JSON in italiano: {"composizione":"es. 100% lana vergine","marca":"o null","taglia":"o null","made_in":"o null","peso":"leggero | medio | pesante","simboli":[{"simbolo":"es. vasca 30°","significato":"lavaggio in lavatrice max 30°, ciclo delicato"}],"lavaggio":"come lavarlo in pratica (programma, detersivo, rovescio, sacchetto)","asciugatura":"","stiro":"temperatura e come (es. a vapore, con panno)","da_evitare":["errori che lo rovinano"],"stagioni":["primavera","estate","autunno","inverno"],"temperature":"es. ideale tra 12° e 20°","quando":["occasioni: ufficio, cena, weekend…"],"come":"come indossarlo e abbinarlo (2-3 frasi)","conservazione":"come riporlo (gruccia, piegato, antitarme…)","frequenza":"ogni quanto lavarlo","stagione_breve":"Primavera/Estate | Autunno/Inverno | Tutte | Mezza stagione"}`,
      });
      const { out } = await ask(parts, false);
      const upd: Record<string, unknown> = { etichetta: { ...out, data: new Date().toISOString() }, etichetta_path: path };
      if (out.stagione_breve) upd.stagione = out.stagione_breve;
      if (!g.brand && out.marca) upd.brand = out.marca;
      if (!g.taglia && out.taglia) upd.taglia = out.taglia;
      await sb.from("garments").update(upd).eq("id", g.id);
      return json({ etichetta: upd.etichetta, stagione: upd.stagione });
    }

    if (b.action === "trova") {
      const { data: g } = await sb.from("garments").select("*").eq("id", b.id).maybeSingle();
      if (!g) return json({ error: "Capo non trovato" }, 404);
      const capo = await imgPart(sb, "garments", g.image_original_path || g.image_cutout_path);
      // deno-lint-ignore no-explicit-any
      const parts: any[] = capo ? [capo] : [];
      parts.push({
        text: `Questo è un capo del suo armadio: ${g.nome} (${g.categoria}${g.colore ? ", " + g.colore : ""}${g.brand ? ", marca " + g.brand : ""}${g.etichetta?.composizione ? ", " + g.etichetta.composizione : ""}). ${g.source_url ? `Pagina da cui l'ha importato: ${g.source_url}.` : ""}
Cerca sul web il prodotto ESATTO (stesso modello, stesso colore) sui siti ufficiali e sui grandi negozi online; se non esiste più, il più simile. Non inventare: se non lo trovi con certezza, dillo.
Rispondi SOLO con JSON in italiano: {"trovato":true,"certezza":"alta | media | bassa","nome":"nome esatto del prodotto","marca":"","codice":"codice articolo o null","link":"URL della pagina prodotto trovata, o null","prezzo":"prezzo di listino o null","descrizione":"2 frasi: tessuto, vestibilità","nota":"se è un modello simile e non lo stesso, spiegalo"}`,
      });
      const r0 = await ask(parts, true);
      const { out, fonti } = r0;
      // senza la ricerca Google il modello va a memoria: link e prezzo vanno presi con le pinze
      if ((r0 as { senza_ricerca?: boolean }).senza_ricerca) {
        out.certezza = "bassa";
        out.nota = [out.nota, "Ricerca web non disponibile in questo momento: link e prezzo sono da verificare."].filter(Boolean).join(" ");
      }
      const link = cleanUrl(out.link) || fonti[0]?.url || null;
      const immagine = link && !/vertexaisearch/.test(link) ? await ogImage(link) : null;
      const online = { ...out, link, immagine, fonti, data: new Date().toISOString() };
      await sb.from("garments").update({ online, ...(g.brand || !out.marca ? {} : { brand: out.marca }) }).eq("id", g.id);
      return json({ online });
    }

    if (b.action === "usa_foto") {
      const { data: g } = await sb.from("garments").select("id, online").eq("id", b.id).maybeSingle();
      const url = g?.online?.immagine;
      if (!url) return json({ error: "Nessuna foto ufficiale trovata per questo capo" }, 400);
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
      if (!r.ok) return json({ error: "Il sito non permette di scaricare la foto" }, 400);
      const type = r.headers.get("content-type") || "image/jpeg";
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `${user.id}/ufficiale-${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("garments").upload(path, new Uint8Array(await r.arrayBuffer()), { contentType: type });
      if (error) throw new Error(error.message);
      await sb.from("garments").update({ image_original_path: path }).eq("id", g!.id);
      return json({ path });
    }

    if (b.action === "meteo") return json(await doMeteo(sb, user.id, b));
    if (b.action === "revisione") return json(await doRevisione(sb, user.id));

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
