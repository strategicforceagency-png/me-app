import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Fisionomia: dalle foto del viso capisce forma e proporzioni e consiglia
 * il taglio di capelli, la barba, le montature e i colletti che stanno bene,
 * e la palette di colori personale (armocromia) su cui si abbinano i vestiti.
 * POST { id }  (riga della tabella fisionomia con le foto già caricate)
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEM = "https://generativelanguage.googleapis.com/v1beta";
let textModels: string[] | null = null;
async function models(key: string) {
  if (textModels) return textModels;
  const j = await (await fetch(`${GEM}/models?key=${key}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-pro$/.test(n)))].slice(0, 5);
  return textModels;
}
function parseJson(t: string) {
  try {
    return JSON.parse(t.replace(/```json|```/g, ""));
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    try {
      return m ? JSON.parse(m[0]) : null;
    } catch {
      return null;
    }
  }
}

const ANGOLI = ["di fronte", "di profilo", "di tre quarti"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const key = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!key) return json({ error: "Chiave AI non configurata" }, 503);

    const b = await req.json();
    const { data: row } = await sb.from("fisionomia").select("*").eq("id", b.id).maybeSingle();
    if (!row || !row.foto?.length) return json({ error: "Carica almeno una foto del viso" }, 400);
    const { data: prof } = await sb.from("profiles").select("nome, altezza, style_guide, gentleman").eq("id", user.id).maybeSingle();

    // deno-lint-ignore no-explicit-any
    const parts: any[] = [];
    for (const [i, path] of (row.foto as string[]).slice(0, 3).entries()) {
      const { data: file } = await sb.storage.from("fisionomia").download(path);
      if (!file) continue;
      const buf = new Uint8Array(await file.arrayBuffer());
      let s = "";
      for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode(...buf.subarray(k, k + 0x8000));
      parts.push({ text: `Foto ${i + 1}: viso ${ANGOLI[i] || ""}` });
      parts.push({ inline_data: { mime_type: file.type || "image/jpeg", data: btoa(s) } });
    }
    if (!parts.length) return json({ error: "Non riesco a leggere le foto, ricaricale" }, 400);

    const pref = row.preferenze || {};
    // deno-lint-ignore no-explicit-any
    const guide = prof?.style_guide as any;
    parts.push({
      text: `Sei un consulente d'immagine maschile e un maestro barbiere di scuola classica (gentleman inglese anni '60-'70 adattato all'Italia di oggi). Analizza con occhio tecnico le foto del viso di ${prof?.nome || "quest'uomo"} e digli quale taglio di capelli, barba, montature e colletti valorizzano la sua fisionomia.

Cosa sappiamo: altezza ${prof?.altezza ?? "?"} cm. Stile: ${guide?.nome_stile || "classico"}. Tipo di capelli secondo lui: ${pref.capelli || "—"}. Tempo che vuole dedicare ai capelli al mattino: ${pref.tempo || "—"}. Barba: ${pref.barba || "—"}. Contesto di lavoro: ${pref.lavoro || "—"}. Altre indicazioni: ${pref.note || "—"}.

COME ANALIZZARE
- Forma del viso: scegli tra ovale, tondo, quadrato, rettangolare (allungato), triangolare, a diamante, a cuore. Spiega da quali proporzioni lo deduci (larghezza di fronte, zigomi e mascella; lunghezza rispetto alla larghezza; angolo della mascella; mento). Se le foto non bastano o l'angolazione inganna, dillo e indica la seconda forma possibile.
- Capelli: tipo (lisci, mossi, ricci), spessore e densità, direzione naturale e vortici se visibili, attaccatura (descrivila in modo neutro e tecnico; se arretra alle tempie, scegli tagli che lo gestiscano con eleganza).
- Principi: i tagli devono bilanciare le proporzioni (es. volume in alto per un viso tondo, lati più pieni per un viso lungo, linee morbide per una mascella molto squadrata). Tieni conto dello stile gentleman: puliti, curati, senza mode eccessive.
- Barba: valuta densità e crescita visibili, direzione, linea delle guance e del collo. Proponi 2-3 stili (anche "rasato perfetto" se è la scelta migliore), il migliore per primo, con indicazioni precise per il barbiere.
- Palette colori (armocromia): osserva sottotono della pelle (caldo, freddo, neutro: riflessi dorati/olivastri o rosati/bluastri), colore e intensità degli occhi, colore di capelli e barba, e il contrasto tra pelle, capelli e occhi. Deduci la stagione cromatica con il sottotipo (es. Autunno profondo, Inverno freddo, Estate morbida, Primavera calda). La luce e il bilanciamento del bianco delle foto possono ingannare: se la foto è a luce artificiale o con filtri, dillo in "affidabilita" e resta prudente. Traduci la palette in un guardaroba maschile da gentleman: neutri per completi, pantaloni e cappotti; colori per camicie, cravatte, maglieria, pochette; metalli per orologio e accessori.
- Sii gentile e concreto: niente giudizi sull'aspetto, sull'età o sull'origine, nessuna ipotesi su salute. Solo osservazioni utili per scegliere.

Rispondi SOLO con JSON valido in italiano:
{"qualita_foto":"ok oppure cosa migliorare per un'analisi più precisa",
"forma":{"tipo":"","alternativa":"o null","perche":"2 frasi sulle proporzioni osservate","proporzioni":{"fronte":"","zigomi":"","mascella":"","lunghezza":""}},
"capelli":{"tipo":"","densita":"","attaccatura":"","note":""},
"tagli":[{"nome":"nome italiano","nome_inglese":"es. Side part, Ivy League, Crew cut","perche":"perché valorizza il suo viso (2 frasi)","lati":"es. macchinetta n.3 sfumata verso il basso, oppure forbice","sopra":"es. 5-7 cm","nuca":"es. sfumatura bassa naturale","riga":"es. laterale a sinistra, o nessuna","manutenzione":"ogni quante settimane","prodotto":"es. pasta opaca a tenuta media","styling":"come sistemarlo in 2 minuti al mattino","formalita":"da quali occasioni a quali","ricerca":"query per cercare foto di riferimento","per_il_barbiere":"frase pronta da leggere al barbiere"}],
"da_evitare":[{"cosa":"","perche":""}],
"barba":{"consiglio":"la scelta migliore in una frase","crescita":"come cresce (densità, zone più rade) in modo neutro","stili":[{"nome":"es. Stubble curato, Barba corta squadrata, Rasato","perche":"","lunghezza":"es. 3 mm con regolabarba / 1 cm sulle guance","forma":"come disegnarla per il suo viso","contorni":"linea delle guance e del collo (es. due dita sopra il pomo d'Adamo)","baffi":"","manutenzione":"ogni quanto e con cosa","prodotti":"es. olio da barba, balsamo","per_il_barbiere":"frase pronta","ricerca":"query per foto di riferimento"}]},
"montature":{"forme":["es. squadrate, panto"],"evitare":["…"],"perche":""},
"colletti":{"camicia":"es. colletto francese semi-aperto","nodo":"es. four-in-hand o mezzo Windsor","perche":"","cappelli":"se e quali"},
"sopracciglia":"un consiglio di cura, se utile, altrimenti null",
"palette":{"sottotono":"caldo | freddo | neutro","contrasto":"alto | medio | basso","stagione":"es. Autunno profondo","perche":"2 frasi: cosa hai osservato in pelle, occhi, capelli e barba","affidabilita":"quanto è affidabile con queste foto e come migliorarla","colori":[{"nome":"es. Verde bottiglia","hex":"#1F4D3A","uso":"es. cravatte, maglioni"}],"neutri":[{"nome":"es. Blu notte","hex":"#1C2A44","uso":"es. completi, cappotti"}],"evitare":[{"nome":"","hex":"#","perche":""}],"metalli":"es. oro giallo e ottone; evita l'argento lucido","consigli":{"camicie":"","completi":"","cravatte":"","maglieria":"","scarpe_cinture":""}},
"riassunto":"3 frasi da maggiordomo inglese: cosa valorizzare e la scelta migliore"}
Proponi 3 tagli, il più adatto per primo. Palette: 8-12 colori, 4-6 neutri, 3-5 da evitare, hex realistici.`,
    });

    let last = "Nessun modello AI disponibile";
    for (const m of await models(key)) {
      const r = await fetch(`${GEM}/models/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.35, responseMimeType: "application/json", maxOutputTokens: 14000 } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        last = j?.error?.message || `Errore ${r.status}`;
        if ([429, 404, 500, 503].includes(r.status) || /demand|overloaded|unavailable/i.test(last)) continue;
        break;
      }
      // deno-lint-ignore no-explicit-any
      const out = parseJson((j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join(""));
      if (!out?.forma || !Array.isArray(out.tagli)) {
        last = "Risposta non valida, riprova";
        continue;
      }
      out.tagli = out.tagli.slice(0, 3);
      await sb.from("fisionomia").update({ analisi: out, scelto: 0 }).eq("id", row.id);
      // la palette diventa quella del profilo: la usano guida di stile, abbinamenti e Alfred
      if (out.palette?.colori?.length) await sb.from("profiles").update({ palette: { ...out.palette, aggiornata: new Date().toISOString() } }).eq("id", user.id);
      return json({ analisi: out });
    }
    return json({ error: /quota|demand|overloaded/i.test(last) ? "L'AI è occupata, riprova tra un minuto" : last }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
