import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Profumi e pelletteria.
 * POST { action: "profumo", id }          scheda di un profumo (note, famiglia, stagioni…), con ricerca sul web
 * POST { action: "profumi_consigli" }     profilo olfattivo, guardaroba olfattivo, cosa manca, cosa provare
 * POST { action: "profumo_oggi", occasione }  quale dei suoi profumi indossare oggi e quanto
 * POST { action: "pelle_consigli" }       pelletteria: cosa manca, colori, cura, cosa comprare
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEM = "https://generativelanguage.googleapis.com/v1beta";
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
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n)))].slice(0, 5);
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
// deno-lint-ignore no-explicit-any
async function ask(parts: any[], search: boolean) {
  let last = "Nessun modello AI disponibile";
  for (const m of await models()) {
    const r = await fetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        ...(search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.4, maxOutputTokens: 9000, ...(search ? {} : { responseMimeType: "application/json" }) },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status) || /demand|overloaded|unavailable/i.test(last)) continue;
      throw new Error(last);
    }
    const c = j.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const out = parseJson((c?.content?.parts || []).map((p: any) => p.text || "").join(""));
    if (!out) {
      last = "Risposta non valida, riprova";
      continue;
    }
    // deno-lint-ignore no-explicit-any
    const fonti = ((c?.groundingMetadata?.groundingChunks || []) as any[])
      .map((g) => g.web)
      .filter((w) => w?.uri)
      .reduce((acc: { titolo: string; url: string }[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || "fonte", url: w.uri }]), [])
      .slice(0, 8);
    return { out, fonti };
  }
  throw new Error(/quota|demand|overloaded/i.test(last) ? "L'AI è occupata, riprova tra un minuto" : last);
}
const cleanUrl = (u: unknown) => {
  const s = String(u || "").trim();
  return /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(s) && !/example\.com|vertexaisearch/i.test(s) ? s : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();
    const { data: prof } = await sb.from("profiles").select("nome, citta, style_guide, palette, budget, scheda").eq("id", user.id).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const pal = prof?.palette as any;
    // deno-lint-ignore no-explicit-any
    const sch = prof?.scheda as any;
    const lui = `Lui: ${prof?.nome || "—"}, vive a ${prof?.citta || "Napoli"}. Stile: ${(prof?.style_guide as { nome_stile?: string } | null)?.nome_stile || "classico gentleman inglese adattato all'Italia"}. Budget mensile guardaroba: ${(prof?.budget as { mensile?: number } | null)?.mensile || "?"} €. Armocromia: ${pal?.stagione ? `${pal.stagione}, neutri ${(pal.neutri || []).map((c: { nome: string }) => c.nome).join(", ")}, metalli ${pal.metalli || "—"}` : "non fatta"}. Cosa sappiamo di lui: ${(sch?.fatti || []).map((f: { testo: string }) => f.testo).join("; ").slice(0, 1500) || "—"}.`;
    const oggi = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

    if (b.action === "profumo") {
      const { data: it } = await sb.from("collezione").select("*").eq("id", b.id).maybeSingle();
      if (!it) return json({ error: "Profumo non trovato" }, 404);
      // deno-lint-ignore no-explicit-any
      const parts: any[] = [];
      if (it.foto) {
        const { data: file } = await sb.storage.from("persone").download(it.foto);
        if (file) {
          const buf = new Uint8Array(await file.arrayBuffer());
          let s = "";
          for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          parts.push({ inline_data: { mime_type: file.type || "image/jpeg", data: btoa(s) } });
        }
      }
      parts.push({
        text: `Sei un esperto di profumeria. ${it.foto ? "Nella foto c'è il flacone: riconoscilo." : ""} Profumo: "${it.nome}"${it.marca ? ` di ${it.marca}` : ""}. Cerca sul web (siti delle maison, Fragrantica, Parfumo, riviste) e compila la scheda in italiano. Se il nome è ambiguo scegli la versione maschile più nota e dillo in "note_scheda". Non inventare: se un dato non lo trovi, metti null.
Rispondi SOLO con JSON: {"nome":"nome esatto","marca":"","anno":1966,"profumiere":"o null","concentrazione":"EdT | EdP | Parfum | Cologne | Extrait","famiglia":"es. Legnosa aromatica","note":{"testa":[""],"cuore":[""],"fondo":[""]},"carattere":"2 frasi: com'è da indossare","stagioni":["primavera","estate","autunno","inverno"],"occasioni":["ufficio","sera","weekend","cerimonia","sport"],"durata":"es. 6-8 ore","scia":"leggera | moderata | intensa","dosi":"quanti spruzzi","prezzo":"fascia indicativa in Italia","simili":["2-3 profumi simili"],"note_scheda":"o null"}`,
      });
      const { out, fonti } = await ask(parts, true);
      const det = { ...(it.dettagli || {}), ...out, fonti };
      await sb.from("collezione").update({ dettagli: det, nome: out.nome || it.nome, marca: out.marca || it.marca }).eq("id", it.id);
      return json({ dettagli: det });
    }

    if (b.action === "profumi_consigli") {
      const { data: items } = await sb.from("collezione").select("nome, marca, stato, voto, dettagli").eq("tipo", "profumo");
      const coll = (items || []).map((x) => `${x.nome}${x.marca ? " – " + x.marca : ""} [${x.stato}${x.voto ? `, voto ${x.voto}/5` : ""}${x.dettagli?.famiglia ? `, ${x.dettagli.famiglia}` : ""}]`).join("; ");
      const prompt = `Sei un consulente di profumeria per un gentleman (stile inglese anni '60-'70 adattato all'Italia di oggi). Oggi è ${oggi}.
${lui}
I suoi profumi (mio = li possiede, desidero, provato): ${coll || "nessuno ancora"}.
${b.note ? `Indicazioni: ${b.note}` : ""}

1) Deduci il suo profilo olfattivo (famiglie e note che ama, cosa evita).
2) Organizza il guardaroba olfattivo con quello che POSSIEDE: firma, fresco/estate, ufficio, sera/inverno. Se manca un ruolo, dillo.
3) Cerca sul web 5 profumi reali da provare che coprono i ruoli mancanti o ampliano con coerenza, disponibili in Italia, con fascia di prezzo realistica, rispettando il budget. Includi almeno un'opzione accessibile e un classico delle case storiche.
Rispondi SOLO con JSON in italiano: {"profilo":"3 frasi","famiglie":["…"],"guardaroba":[{"ruolo":"Firma | Fresco | Ufficio | Sera","profumo":"nome di uno dei suoi o null","nota":"perché, oppure cosa cercare"}],"da_provare":[{"nome":"","marca":"","perche":"","famiglia":"","prezzo":"","dove":"","ricerca":"query Google","link":"pagina trovata o null"}],"consiglio":"un consiglio da maggiordomo inglese"}`;
      const { out, fonti } = await ask([{ text: prompt }], true);
      out.da_provare = (out.da_provare || []).slice(0, 6).map((x: Record<string, unknown>) => ({ ...x, link: cleanUrl(x.link) }));
      const res = { ...out, fonti, data: new Date().toISOString() };
      await sb.from("profiles").update({ profumi_analisi: res }).eq("id", user.id);
      return json(res);
    }

    if (b.action === "profumo_oggi") {
      const { data: items } = await sb.from("collezione").select("id, nome, marca, dettagli").eq("tipo", "profumo").eq("stato", "mio");
      if (!items?.length) return json({ error: "Aggiungi prima i profumi che possiedi" }, 400);
      const prompt = `Sei Alfred, il maggiordomo inglese del Signor ${(prof?.nome || "").split(" ")[0]}: gli dai del Lei. Oggi è ${oggi}, a ${prof?.citta || "Napoli"}. Occasione: ${b.occasione || "una giornata normale"}.
I suoi profumi: ${JSON.stringify(items.map((x) => ({ id: x.id, nome: x.nome, marca: x.marca, famiglia: x.dettagli?.famiglia, stagioni: x.dettagli?.stagioni, occasioni: x.dettagli?.occasioni, scia: x.dettagli?.scia, concentrazione: x.dettagli?.concentrazione })))}
Scegli UNO dei suoi profumi per oggi, tenendo conto di stagione, occasione e discrezione. Rispondi SOLO con JSON: {"id":"id del profumo scelto","dosi":"es. 2 spruzzi: collo e petto","perche":"2 frasi nel tuo stile","alternativa":"id di un'alternativa o null"}`;
      const { out } = await ask([{ text: prompt }], false);
      return json(out);
    }

    if (b.action === "pelle_consigli") {
      const [{ data: items }, { data: shoes }] = await Promise.all([
        sb.from("collezione").select("categoria, nome, marca, colore, stato, dettagli").eq("tipo", "pelle"),
        sb.from("garments").select("nome, colore").eq("categoria", "Scarpe").limit(30),
      ]);
      const prompt = `Sei un esperto di pelletteria maschile e consulente di stile per un gentleman (stile inglese anni '60-'70 adattato all'Italia di oggi). Oggi è ${oggi}.
${lui}
La sua pelletteria: ${(items || []).map((x) => `${x.categoria || ""}: ${x.nome}${x.marca ? " – " + x.marca : ""}${x.colore ? ", " + x.colore : ""} [${x.stato}]`).join("; ") || "nessun pezzo registrato"}.
Le sue scarpe: ${(shoes || []).map((s) => `${s.nome}${s.colore ? " (" + s.colore + ")" : ""}`).join("; ") || "—"}.
${b.note ? `Indicazioni: ${b.note}` : ""}

1) Valuta cosa ha e cosa manca per un set completo da gentleman: borsa da lavoro (24 ore o cartella), borsone da viaggio, cintura nera e marrone da abito, cintura casual, portafoglio sottile, porta carte, porta biglietti da visita.
2) Colori e pelli più adatti a lui, coerenti con scarpe, armocromia e metalli.
3) Cerca sul web 4-5 acquisti prioritari reali in Italia (anche artigiani, usato di qualità, marchi onesti), con prezzi realistici e coerenti con il budget.
Rispondi SOLO con JSON in italiano: {"valutazione":"2-3 frasi","set":[{"pezzo":"","ce_l_ha":true,"nota":""}],"colori":"quali toni di pelle e metalli scegliere e perché","priorita":[{"nome":"","categoria":"","perche":"","prezzo":"","dove":"","ricerca":"query Google","link":"o null"}],"cura":"il prossimo gesto di cura da fare sui suoi pezzi","consiglio":"un consiglio da maggiordomo inglese"}`;
      const { out, fonti } = await ask([{ text: prompt }], true);
      out.priorita = (out.priorita || []).slice(0, 6).map((x: Record<string, unknown>) => ({ ...x, link: cleanUrl(x.link) }));
      const res = { ...out, fonti, data: new Date().toISOString() };
      await sb.from("profiles").update({ pelle_analisi: res }).eq("id", user.id);
      return json(res);
    }

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
