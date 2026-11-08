import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – conoscenza: la scheda interna delle persone e quella dell'utente, che migliorano nel tempo.
 * POST { action: "idea", person_id, testo?, link?, foto? }  analizza un link o una foto, la salva tra le idee e aggiorna la scheda della persona
 * POST { action: "persona", person_id }                      riscrive la scheda della persona da tutto quello che si sa
 * POST { action: "me" }                                      riscrive la scheda dell'utente (chat col Maestro, revisioni, armadio, acquisti…)
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEM = "https://generativelanguage.googleapis.com/v1beta";
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
  // i modelli 1.x e 2.x sono ritirati per i nuovi account: si usano solo i 3.x e gli alias "latest"
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
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
/** Se la ricerca Google ha finito la quota gratuita, si risponde comunque senza ricerca. */
// deno-lint-ignore no-explicit-any
async function gemini(parts: any[], search = false) {
  try {
    return await gemini0(parts, search);
  } catch (e) {
    if (search && /quota|tempo/i.test(String(e))) return await gemini0(parts, false);
    throw e;
  }
}
// deno-lint-ignore no-explicit-any
async function gemini0(parts: any[], search = false) {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        ...(search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.4, maxOutputTokens: 8000, ...(search ? {} : { responseMimeType: "application/json" }) },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status) || /demand|overloaded|unavailable/i.test(last)) continue;
      throw new Error(last);
    }
    // deno-lint-ignore no-explicit-any
    const out = parseJson((j.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join(""));
    if (out) return out;
    last = "Risposta non valida, riprova";
  }
  throw new Error(/quota|exceeded|demand|overloaded|no longer available/i.test(last) ? "L'AI ha esaurito per ora la quota gratuita di Google: riprova tra qualche minuto (con la fatturazione attiva su Google AI Studio non ci sono limiti)" : last);
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const meta = (html: string, name: string) =>
  decode(
    html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]+content=["']([^"']+)`, "i"))?.[1] ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${name}["']`, "i"))?.[1] ||
      "",
  );
/** Legge la pagina: titolo, descrizione, immagine, prezzo e un estratto del testo. */
async function readPage(url: string) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept-Language": "it-IT,it;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 600000);
    const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(" ").slice(0, 4000);
    const text = html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 3500);
    return {
      titolo: meta(html, "og:title") || decode(html.match(/<title[^>]*>([^<]*)/i)?.[1] || "").trim(),
      descrizione: meta(html, "og:description") || meta(html, "description"),
      immagine: meta(html, "og:image") || meta(html, "twitter:image"),
      prezzo: [meta(html, "product:price:amount") || meta(html, "og:price:amount") || meta(html, "price"), meta(html, "product:price:currency") || meta(html, "og:price:currency")].filter(Boolean).join(" "),
      sito: meta(html, "og:site_name") || new URL(r.url).hostname.replace(/^www\./, ""),
      ld,
      text: decode(text),
    };
  } catch {
    return null;
  }
}

type Fatto = { id: string; testo: string; cat: string; fonte: "ai" | "tu"; data: string };
type Scheda = { ritratto?: string; fatti?: Fatto[]; scartati?: string[]; aggiornata?: string };
const today = () => new Date().toISOString().slice(0, 10);
/** Unisce i fatti nuovi dell'AI a quelli scritti a mano (che non si toccano) e ai fatti scartati (che non tornano). */
function merge(old: Scheda, out: { ritratto?: string; fatti?: { testo: string; cat?: string }[] }): Scheda {
  const manual = (old.fatti || []).filter((f) => f.fonte === "tu");
  const scartati = (old.scartati || []).map((s) => s.toLowerCase());
  const prev = new Map((old.fatti || []).filter((f) => f.fonte === "ai").map((f) => [f.testo.toLowerCase(), f]));
  const ai: Fatto[] = [];
  for (const f of out.fatti || []) {
    const t = String(f.testo || "").trim();
    if (!t || scartati.includes(t.toLowerCase()) || manual.some((m) => m.testo.toLowerCase() === t.toLowerCase())) continue;
    const p = prev.get(t.toLowerCase());
    ai.push(p ? { ...p, cat: f.cat || p.cat } : { id: crypto.randomUUID().slice(0, 8), testo: t, cat: String(f.cat || "altro"), fonte: "ai", data: today() });
  }
  return { ritratto: String(out.ritratto || old.ritratto || ""), fatti: [...manual, ...ai.slice(0, 45)], scartati: old.scartati || [], aggiornata: new Date().toISOString() };
}

const CAT_PERSONA = "moda (vestiti, borse, scarpe, stile), gioielli, profumi, fiori, cibo, luoghi, passioni, esperienze, casa, carattere (come ama essere trattata, sorprese sì/no, cosa la emoziona), evitare, altro";
const CAT_ME = "stile, gusti, abitudini, obiettivi, lavoro, vita, relazioni, consigli (come preferisce ricevere i consigli), altro";

// deno-lint-ignore no-explicit-any
function personaContext(p: any, gifts: any[]) {
  return `Persona: ${p.nome} (${p.relazione}).
Date: ${JSON.stringify(p.date || [])}.
Gusti scritti da lui per categoria: ${JSON.stringify(p.dettagli || {})}. Altri gusti: ${p.gusti || "—"}. Non le piace: ${p.non_piace || "—"}. Note: ${p.note || "—"}.
Idee annotate nel tempo: ${(p.idee || []).map((i: { testo: string; analisi?: unknown }) => `${i.testo}${i.analisi ? " " + JSON.stringify(i.analisi) : ""}`).join(" | ") || "—"}.
Regali già scelti o fatti: ${(gifts || []).map((g) => `${g.titolo} (${g.occasione || ""}, ${g.stato})`).join("; ") || "—"}.`;
}
const schedaRules = (cats: string, chi: string) => `REGOLE della scheda:
- È una scheda interna, utile a capire ${chi} e a fare scelte azzeccate (regali, uscite, gesti). Scrivi fatti brevi (max 15 parole), concreti e utili, in italiano.
- Deduci con prudenza: se un'informazione è un'ipotesi ricavata da un solo indizio, inizia con "Sembra" o "Probabilmente".
- Tieni i fatti esistenti se non sono smentiti; uniscili se si ripetono; aggiorna se c'è un'informazione più precisa.
- I fatti scritti a mano da lui sono certi: non ripeterli, ma usali.
- Non riproporre i fatti scartati.
- Niente diagnosi, dati sanitari, giudizi sul carattere o sulle persone: solo gusti, preferenze, abitudini e cose dette o fatte.
- Categorie possibili (campo "cat"): ${cats}.
- "ritratto": 3-4 frasi scorrevoli che riassumono chi è e cosa la/lo rende felice, utili a chi deve sceglierle/gli qualcosa.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();

    /* ---------------- persone ---------------- */
    if (b.action === "idea" || b.action === "persona") {
      const { data: p } = await sb.from("people").select("*").eq("id", b.person_id).maybeSingle();
      if (!p) return json({ error: "Persona non trovata" }, 404);
      const { data: gifts } = await sb.from("gifts").select("titolo, occasione, stato").eq("person_id", p.id).in("stato", ["scelto", "regalato"]).limit(30);
      const old = (p.scheda || {}) as Scheda;
      const schedaIn = `Scheda attuale: ritratto "${old.ritratto || "—"}"; fatti: ${(old.fatti || []).map((f) => `[${f.cat}${f.fonte === "tu" ? ", scritto da lui" : ""}] ${f.testo}`).join(" | ") || "—"}. Fatti scartati da lui (non riproporli): ${(old.scartati || []).join(" | ") || "—"}.`;

      if (b.action === "persona") {
        const out = await gemini([{ text: `Aggiorna la scheda interna che un uomo tiene su una persona a cui tiene.\n${personaContext(p, gifts || [])}\n${schedaIn}\n\n${schedaRules(CAT_PERSONA, "questa persona")}\n\nRispondi SOLO con JSON: {"ritratto":"","fatti":[{"testo":"","cat":""}]}` }]);
        const scheda = merge(old, out);
        await sb.from("people").update({ scheda }).eq("id", p.id);
        return json({ scheda });
      }

      // nuova idea da link e/o foto
      const link = String(b.link || "").trim() || null;
      const testo = String(b.testo || "").replace(link || "", "").trim();
      // deno-lint-ignore no-explicit-any
      const parts: any[] = [];
      let page = null;
      if (link) page = await readPage(link);
      if (b.foto) {
        const { data: file } = await sb.storage.from("persone").download(b.foto);
        if (file) {
          const buf = new Uint8Array(await file.arrayBuffer());
          let s = "";
          for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          parts.push({ inline_data: { mime_type: file.type || "image/jpeg", data: btoa(s) } });
        }
      }
      parts.push({
        text: `Un uomo ha annotato un'idea per ${p.nome} (${p.relazione}): qualcosa che le/gli è piaciuto, che ha visto o desiderato.
${testo ? `Nota sua: "${testo}".` : ""}
${link ? `Link: ${link}` : ""}
${page ? `Contenuto della pagina: titolo "${page.titolo}"; sito ${page.sito}; descrizione "${page.descrizione}"; prezzo ${page.prezzo || "?"}; dati strutturati ${page.ld}; testo: ${page.text}` : link ? "La pagina non è leggibile direttamente: cerca il link sul web per capire cos'è." : ""}
${b.foto ? "In allegato la foto che ha scattato o salvato: descrivi con precisione cosa si vede (oggetto, marca se riconoscibile, colore, materiale, stile, luogo)." : ""}

1) Capisci esattamente cos'è (prodotto, posto, esperienza, piatto, fiore…), con marca, modello, colore e prezzo se ci sono.
2) Cosa racconta dei suoi gusti.
3) Aggiorna la scheda interna della persona.

${personaContext(p, gifts || [])}
${schedaIn}

${schedaRules(CAT_PERSONA, "questa persona")}

Rispondi SOLO con JSON: {"idea":{"titolo":"nome breve e preciso (es. Borsa a mano Furla 1927 mini, pelle cuoio)","cosa":"prodotto | luogo | esperienza | cibo | altro","marca":"o null","prezzo":"es. 189 € o null","colore":"o null","dove":"negozio o sito o null","categoria":"una delle categorie","nota":"1 frase: cosa ci dice dei suoi gusti"},"ritratto":"","fatti":[{"testo":"","cat":""}]}`,
      });
      const out = await gemini(parts, !!link && !page);
      const idea = {
        testo: String(out.idea?.titolo || testo || page?.titolo || "Idea"),
        data: today(),
        link,
        foto: b.foto || null,
        immagine: page?.immagine && /^https?:/.test(page.immagine) ? page.immagine : null,
        analisi: out.idea || null,
      };
      const idee = [...(p.idee || []), idea];
      const scheda = merge(old, out);
      const { error } = await sb.from("people").update({ idee, scheda }).eq("id", p.id);
      if (error) throw new Error(error.message);
      return json({ idea, idee, scheda });
    }

    /* ---------------- l'utente ---------------- */
    if (b.action === "me") {
      const [prof, rev, chat, gar, pur, wish, know, tri, outs, gifts, ppl] = await Promise.all([
        sb.from("profiles").select("nome, citta, gentleman, style_guide, budget, path, altezza, peso, scheda").eq("id", user.id).maybeSingle(),
        sb.from("path_reviews").select("week, data").order("week", { ascending: false }).limit(6),
        sb.from("maestro_messages").select("text, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(80),
        sb.from("garments").select("nome, categoria, colore, utilizzi").limit(150),
        sb.from("purchases").select("day, nome, categoria, tipo, prezzo, negozio").order("created_at", { ascending: false }).limit(40),
        sb.from("wishlist").select("nome, categoria, priorita, prezzo_stimato, motivo, comprato").limit(40),
        sb.from("knowledge").select("tema, titolo").eq("stato", "approvata").limit(60),
        sb.from("field_trials").select("key, voto, note").limit(30),
        sb.from("outings").select("titolo, tipo, data, stato").limit(30),
        sb.from("gifts").select("titolo, occasione, stato").in("stato", ["scelto", "regalato"]).limit(30),
        sb.from("people").select("nome, relazione"),
      ]);
      const pr = prof.data;
      const old = (pr?.scheda || {}) as Scheda;
      // deno-lint-ignore no-explicit-any
      const guide = pr?.style_guide as any;
      // deno-lint-ignore no-explicit-any
      const path = pr?.path as any;
      const cut = (x: unknown, n: number) => JSON.stringify(x ?? null).slice(0, n);
      const prompt = `Sei Habitus, l'accademia personale di un uomo che vuole diventare un gentleman (stile inglese anni '60-'70 adattato all'Italia di oggi). Tieni una scheda interna su di lui per conoscerlo sempre meglio e dargli consigli sempre più su misura (stile, regali, uscite, abitudini, linguaggio). Aggiornala con tutto quello che emerge.

Nome: ${pr?.nome || "—"}. Città: ${pr?.citta || "—"}. Altezza ${pr?.altezza ?? "?"} cm.
Questionario d'ingresso (sue risposte): ${cut(pr?.gentleman, 3500)}
Il suo stile: ${guide?.nome_stile ? `${guide.nome_stile} — ${(guide.parole_chiave || []).join(", ")}` : "—"}.
Il percorso: archetipo ${path?.archetipo?.nome || "—"}; ritratto "${path?.ritratto || "—"}".
Budget guardaroba: ${cut(pr?.budget, 300)}.
Controlli settimanali (le sue risposte, dal più recente): ${cut(rev.data, 3500)}
Cosa ha scritto al Maestro in chat (dal più recente): ${(chat.data || []).map((m) => m.text).join(" | ").slice(0, 6000) || "—"}
Armadio: ${(gar.data || []).map((g) => `${g.nome} (${g.categoria}${g.colore ? ", " + g.colore : ""}${g.utilizzi ? ", usato " + g.utilizzi + " volte" : ""})`).join("; ").slice(0, 3000) || "—"}
Acquisti: ${cut(pur.data, 2000)}
Lista dei desideri: ${cut(wish.data, 1500)}
Insegnamenti che ha scelto di tenere: ${(know.data || []).map((k) => `[${k.tema}] ${k.titolo}`).join("; ").slice(0, 2000) || "—"}
Prove sul campo: ${cut(tri.data, 1200)}
Uscite organizzate: ${cut(outs.data, 1200)}
Regali scelti: ${cut(gifts.data, 1200)}
Persone importanti: ${(ppl.data || []).map((x) => `${x.nome} (${x.relazione})`).join(", ") || "—"}

Scheda attuale: ritratto "${old.ritratto || "—"}"; fatti: ${(old.fatti || []).map((f) => `[${f.cat}${f.fonte === "tu" ? ", scritto da lui" : ""}] ${f.testo}`).join(" | ") || "—"}. Fatti scartati da lui (non riproporli): ${(old.scartati || []).join(" | ") || "—"}.

${schedaRules(CAT_ME, "lui")}
- Parla di lui in terza persona ("Preferisce…", "Lavora…"). Registra solo ciò che ha detto o fatto, non quello che gli è stato consigliato.

Rispondi SOLO con JSON: {"ritratto":"","fatti":[{"testo":"","cat":""}]}`;
      const out = await gemini([{ text: prompt }]);
      const scheda = merge(old, out);
      await sb.from("profiles").update({ scheda }).eq("id", user.id);
      return json({ scheda });
    }

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
