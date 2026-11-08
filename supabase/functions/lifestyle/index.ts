import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Vita: idee regalo e uscite (cene, weekend, viaggi) con ricerca sul web e analisi delle recensioni.
 * POST { action: "regali", person_id, occasione, budget, note }
 * POST { action: "uscite", tipo, dove, quando, budget, preferenze, person_id? }
 * POST { action: "lettera", tipo, tono, lunghezza, contenuto, person_id? }
 * POST { action: "serata", preferenze, tempo, contesto, person_id? }
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
/** Gemini con ricerca Google: restituisce JSON + fonti consultate. */
// deno-lint-ignore no-explicit-any
async function searchAsk(prompt: string): Promise<{ out: any; fonti: { titolo: string; url: string }[]; senza_ricerca?: boolean }> {
  try {
    return await searchAsk0(prompt);
  } catch (e) {
    // ricerca Google esaurita o lenta: si risponde comunque, senza fonti web
    if (/quota|tempo/i.test(String(e)))
      return {
        out: await ask(`${prompt}\n\nATTENZIONE: in questo momento NON hai accesso alla ricerca web. Proponi solo posti, marchi e prodotti molto noti e affermati che conosci con certezza; metti "link": null e "voto": null, non inventare indirizzi o prezzi precisi (usa fasce indicative).`, 0.6),
        fonti: [] as { titolo: string; url: string }[],
        senza_ricerca: true,
      };
    throw e;
  }
}
async function searchAsk0(prompt: string) {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.5, maxOutputTokens: 12000 } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status) || /demand|overloaded|unavailable/i.test(last)) continue;
      throw new Error(last);
    }
    const c = j.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const text = (c?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
    const out = parseJson(text);
    if (!out) {
      last = "Risposta non valida, riprova";
      continue;
    }
    // deno-lint-ignore no-explicit-any
    const fonti = ((c?.groundingMetadata?.groundingChunks || []) as any[])
      .map((g) => g.web)
      .filter((w) => w?.uri)
      .reduce((acc: { titolo: string; url: string }[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || "fonte", url: w.uri }]), [])
      .slice(0, 10);
    return { out, fonti };
  }
  throw new Error(/quota|exceeded|demand|overloaded|no longer available/i.test(last) ? "L'AI ha esaurito per ora la quota gratuita di Google: riprova tra qualche minuto (con la fatturazione attiva su Google AI Studio non ci sono limiti)" : last);
}
/** Gemini senza ricerca, risposta JSON. */
async function ask(prompt: string, temperature = 0.8) {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 8000 } }),
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

// i link inventati sono il rischio maggiore: si tengono solo URL plausibili
const cleanUrl = (u: unknown) => {
  const s = String(u || "").trim();
  return /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(s) && !/example\.com|vertexaisearch/i.test(s) ? s : null;
};

// deno-lint-ignore no-explicit-any
const schedaText = (s: any) => (s?.ritratto || s?.fatti?.length ? `${s.ritratto || ""} ${(s.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).join("; ")}`.slice(0, 3500) : "ancora vuota");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();
    const { data: prof } = await sb.from("profiles").select("nome, citta, scheda").eq("id", user.id).maybeSingle();
    const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const person = b.person_id ? (await sb.from("people").select("*").eq("id", b.person_id).maybeSingle()).data : null;
    const LAB: Record<string, string> = { moda: "Moda e borse", gioielli: "Gioielli e orologi", profumi: "Profumi e cura di sé", fiori: "Fiori", cibo: "Cibo, vino e ristoranti", luoghi: "Luoghi e viaggi", passioni: "Passioni e tempo libero", esperienze: "Esperienze che ama", taglia_abiti: "Taglia abiti", taglia_scarpe: "Numero scarpe", taglia_anello: "Misura anello", taglia_altro: "Altre misure" };
    const det = person ? Object.entries((person.dettagli || {}) as Record<string, string>).filter(([, v]) => v && String(v).trim()).map(([k, v]) => `${LAB[k] || k}: ${String(v).trim()}`).join(". ") : "";
    const chi = person
      ? `Persona: ${person.nome} (${person.relazione}). ${det ? det + ". " : ""}${person.gusti ? "Altri gusti: " + person.gusti + ". " : ""}Cose che non le piacciono: ${person.non_piace || "—"}. ${person.taglie ? "Taglie: " + person.taglie + ". " : ""}Idee annotate nel tempo: ${(person.idee || []).map((i: { testo: string; analisi?: { prezzo?: string; marca?: string; nota?: string } }) => `${i.testo}${i.analisi?.nota ? " (" + i.analisi.nota + ")" : ""}`).join("; ") || "—"}. Note: ${person.note || "—"}. Scheda interna su di lei/lui: ${schedaText(person.scheda)}.`
      : "";

    const lui = `Chi è lui (scheda interna, per scegliere cose nel suo stile e nelle sue possibilità): ${schedaText(prof?.scheda)}`;

    if (b.action === "regali") {
      if (!person) return json({ error: "Scegli la persona" }, 400);
      const { data: past } = await sb.from("gifts").select("titolo, occasione, data").eq("person_id", person.id).in("stato", ["scelto", "regalato"]).limit(40);
      const prompt = `Sei il consigliere di un gentleman (stile classico inglese, adattato all'Italia di oggi). Oggi è ${oggi}. ${prof?.nome || "Lui"} vive a ${prof?.citta || "Napoli"} e deve fare un regalo.
${chi}
${lui}
Ricorrenza: ${b.occasione || "un pensiero senza motivo"}. Budget: ${b.budget || "libero"}. ${b.note ? `Indicazioni: ${b.note}.` : ""}
Regali già fatti (da NON ripetere): ${(past || []).map((g) => `${g.titolo} (${g.occasione || ""})`).join("; ") || "nessuno"}.

${/figli/i.test(person.relazione || "") ? `È ${person.relazione === "Figlia" ? "sua figlia" : "suo figlio"}: calcola l'età dalla data di nascita se presente nelle ricorrenze (${JSON.stringify(person.date || [])}) e scegli regali adatti all'età e alla fase di crescita, sicuri (marchio CE, niente piccole parti sotto i 3 anni), che durino nel tempo o creino un ricordo (es. un oggetto da conservare, un'esperienza insieme). ` : ""}Cerca sul web idee CONCRETE, acquistabili ora in Italia o online, pertinenti ai suoi gusti e alla ricorrenza. Varia le categorie: un oggetto di qualità, un'esperienza da fare insieme, qualcosa di personalizzato o artigianale, e un'idea piccola ma molto pensata. Niente regali banali o impersonali (buoni generici, gadget). Rispetta il budget.

Rispondi SOLO con JSON valido in italiano:
{"idee":[{"titolo":"nome preciso del regalo","categoria":"oggetto | esperienza | personalizzato | fiori | gastronomia | libro | gioiello | moda | casa","perche":"perché è giusto per lei e per questa ricorrenza (2 frasi)","prezzo":"es. 80-120 €","dove":"negozio, marca o artigiano","link":"URL di una pagina trovata nella ricerca, altrimenti null","ricerca":"query Google per trovarlo","tocco":"il dettaglio da gentleman: biglietto scritto a mano, confezione, consegna, momento"}],"biglietto":"una bozza breve (2-3 righe), elegante e sincera, per il biglietto scritto a mano","consiglio":"un consiglio di galateo sul come e quando darlo"}
Da 6 a 8 idee. Non inventare link: se non sei sicuro metti null.`;
      const { out, fonti, senza_ricerca } = await searchAsk(prompt);
      // deno-lint-ignore no-explicit-any
      const idee = (out.idee || []).slice(0, 8).map((i: any) => ({ ...i, link: cleanUrl(i.link), ricerca: i.ricerca || i.titolo }));
      return json({ idee, biglietto: out.biglietto || "", consiglio: out.consiglio || "", fonti, senza_ricerca: !!senza_ricerca });
    }

    if (b.action === "uscite") {
      const tipo = String(b.tipo || "Cena romantica");
      const viaggio = /viaggio|weekend/i.test(tipo);
      const prompt = `Sei il concierge di un gentleman (stile classico, gusto per i posti autentici e ben fatti, niente trappole per turisti). Oggi è ${oggi}. ${prof?.nome || "Lui"} vive a ${prof?.citta || "Napoli"}.
${lui}
Cosa vuole organizzare: ${tipo}. Dove: ${b.dove || prof?.citta || "Napoli e dintorni"}. Quando: ${b.quando || "da definire"}. Budget: ${b.budget || "medio-alto"}. Preferenze: ${b.preferenze || "—"}.
${chi ? `Con chi: ${chi}` : ""}

Cerca sul web ${viaggio ? "destinazioni e strutture (hotel, dimore, agriturismi di qualità)" : "locali"} reali e attualmente aperti. Per ognuno ANALIZZA LE RECENSIONI (Google, TripAdvisor, TheFork, guide Michelin, Gambero Rosso, Slow Food, Booking, articoli di stampa): cosa lodano davvero, cosa criticano, il voto medio e quante recensioni. Scarta i posti con recensioni recenti negative o incoerenti. Presenta solo i migliori.

Rispondi SOLO con JSON valido in italiano:
{"proposte":[{"nome":"","tipo":"es. ristorante di pesce, enoteca, hotel boutique","zona":"quartiere o località","indirizzo":"se trovato","prezzo":"es. 70-90 € a persona, oppure €€€","voto":"es. 4,6 su Google (1.240 recensioni); 4,5 TripAdvisor","perche":"perché è perfetto per questa occasione (2 frasi)","punti_forti":["dalle recensioni"],"punti_deboli":["dalle recensioni, onestamente"],"atmosfera":"","dress_code":"cosa indossare","prenotazione":"come prenotare e con quanto anticipo","link":"sito ufficiale o pagina trovata nella ricerca, altrimenti null","ricerca":"query Google per trovarlo",${viaggio ? '"itinerario":[{"giorno":"Giorno 1","piano":"mattina, pomeriggio, sera in 2-3 frasi"}],' : ""}"tocco":"un consiglio da gentleman per rendere la serata/il viaggio speciale"}],"nota":"consiglio generale (orari, stagione, cosa evitare)"}
Da 3 a 5 proposte, la migliore per prima. Non inventare indirizzi, voti o link: se non li trovi metti null.`;
      const { out, fonti, senza_ricerca } = await searchAsk(prompt);
      // deno-lint-ignore no-explicit-any
      const proposte = (out.proposte || []).slice(0, 5).map((p: any) => ({ ...p, link: cleanUrl(p.link), ricerca: p.ricerca || `${p.nome} ${p.zona || ""}` }));
      return json({ proposte, nota: out.nota || "", fonti, senza_ricerca: !!senza_ricerca });
    }

    if (b.action === "lettera") {
      const prompt = `Sei il Maestro di Habitus e aiuti ${prof?.nome || "un uomo"} a scrivere come un gentleman: italiano curato e naturale, niente frasi fatte, niente retorica, niente emoji salvo richiesta, sincerità prima dell'effetto. Il testo deve sembrare scritto da lui, non da un poeta.
${lui}
Cosa deve scrivere: ${b.tipo || "un biglietto"}.
${chi ? `Destinatario: ${chi}` : b.destinatario ? `Destinatario: ${b.destinatario}` : ""}
Tono: ${b.tono || "elegante e affettuoso"}. Lunghezza: ${b.lunghezza || "breve"}.
Cosa vuole dire, con parole sue: ${b.contenuto || "—"}.

Scrivi 3 versioni diverse per approccio (non solo per parole), poi un consiglio di galateo su come e quando consegnarlo o inviarlo (a mano o messaggio, carta, penna, momento giusto).
Rispondi SOLO con JSON: {"versioni":[{"titolo":"es. Sobria, Più calda, Con un tocco di ironia","testo":"il testo pronto, con a capo dove servono"}],"consiglio":"…"}`;
      const out = await ask(prompt, 0.85);
      return json({ versioni: (out.versioni || []).slice(0, 3), consiglio: out.consiglio || "" });
    }

    if (b.action === "serata") {
      const prompt = `Sei il Maestro di Habitus. ${prof?.nome || "Lui"} vuole preparare una serata a casa per due, fatta con cura, ${b.contesto || "con un bambino piccolo in casa: quindi dopo la nanna, durata di circa due ore, niente di stancante, preparazione semplice e veloce"}.
${chi ? `Per: ${chi}` : ""}
${lui}
Stagione e giorno: ${oggi}. Indicazioni: ${b.preferenze || "—"}. Tempo di preparazione disponibile: ${b.tempo || "circa 30 minuti"}.

Proponi 3 serate diverse (es. una cena a tema, un aperitivo lungo, un dolce e un film), ognuna completa e realistica.
Rispondi SOLO con JSON in italiano:
{"serate":[{"titolo":"","idea":"1-2 frasi","menu":[{"piatto":"","come":"preparazione rapida in 2-3 frasi","tempo":"es. 15 min"}],"spesa":["cosa comprare"],"atmosfera":"luci, tavola, dettagli","musica":"genere o 3 artisti/album adatti","dopo":"cosa fare dopo cena (film consigliato con titolo, gioco, passeggiata in terrazzo…)","conversazione":["2-3 spunti di conversazione non banali"],"tocco":"il gesto da gentleman che fa la differenza","tempi":"scaletta: cosa preparare prima e cosa durante"}]}`;
      const out = await ask(prompt, 0.9);
      return json({ serate: (out.serate || []).slice(0, 3) });
    }

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
