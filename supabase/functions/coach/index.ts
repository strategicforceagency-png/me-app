import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Alfred, il maggiordomo di Habitus: risponde a domande su stile, galateo, grooming e accessori,
 * nel contesto della lezione aperta e (se utile) del guardaroba e della guida di stile dell'utente.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
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

let textModels: string[] | null = null;
async function models(key: string) {
  if (textModels) return textModels;
  const r = await fetch(`${GEMINI}?key=${key}&pageSize=1000`);
  const j = await r.json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  // i modelli 1.x e 2.x sono ritirati per i nuovi account: si usano solo i 3.x e gli alias "latest"
  const vivo = (n: string) => !/^gemini-[12]\./.test(n);
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-lite-latest")].slice(0, 9);
  return textModels;
}

// deno-lint-ignore no-explicit-any
const schedaText = (s: any) => (s?.ritratto || s?.fatti?.length ? `${s.ritratto || ""} ${(s.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).join("; ")}`.slice(0, 3500) : "ancora vuota");

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
    const question = String(b.question || "").slice(0, 1200).trim();
    if (!question) return json({ error: "Scrivi una domanda" }, 400);
    const history = Array.isArray(b.history) ? b.history.slice(-12) : [];

    const [{ data: prof }, { data: wardrobe }, { data: notes }, { data: face }] = await Promise.all([
      sb.from("profiles").select("nome, altezza, peso, taglia_top, taglia_pantaloni, taglia_scarpe, style_guide, path, path_started_at, budget, scheda, palette").eq("id", user.id).maybeSingle(),
      sb.from("garments").select("nome, categoria, colore, stagione, valutazione").not("stato", "in", "(venduto,regalato)").limit(150),
      sb.from("knowledge").select("tema, titolo, affermazione, versione_corretta, verdetto").eq("stato", "approvata").limit(80),
      sb.from("fisionomia").select("analisi, scelto, scelto_barba").not("analisi", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    // deno-lint-ignore no-explicit-any
    const fa = face?.analisi as any;
    // deno-lint-ignore no-explicit-any
    const pal = prof?.palette as any;
    const faceInfo = fa
      ? `Viso ${fa.forma?.tipo}. Taglio scelto: ${fa.tagli?.[face?.scelto ?? 0]?.nome || "—"} (${fa.tagli?.[face?.scelto ?? 0]?.per_il_barbiere || ""}). Barba scelta: ${fa.barba?.stili?.[face?.scelto_barba ?? 0]?.nome || fa.barba?.consiglio || "—"}. Montature adatte: ${(fa.montature?.forme || []).join(", ")}. Colletto: ${fa.colletti?.camicia || "—"}, nodo ${fa.colletti?.nodo || "—"}.`
      : "non ancora fatta (può farla nella sezione Fisionomia)";
    const palInfo = pal?.colori?.length
      ? `${pal.stagione} (sottotono ${pal.sottotono}, contrasto ${pal.contrasto}). Neutri: ${(pal.neutri || []).map((c: { nome: string }) => c.nome).join(", ")}. Colori: ${(pal.colori || []).map((c: { nome: string }) => c.nome).join(", ")}. Da evitare vicino al viso: ${(pal.evitare || []).map((c: { nome: string }) => c.nome).join(", ")}. Metalli: ${pal.metalli || "—"}.`
      : "non ancora definita (può scoprirla nella sezione Fisionomia)";
    // deno-lint-ignore no-explicit-any
    const guide = prof?.style_guide as any;
    // deno-lint-ignore no-explicit-any
    const path = prof?.path as any;
    const week = prof?.path_started_at ? Math.min(12, Math.max(1, Math.floor((Date.now() - Date.parse(prof.path_started_at + "T00:00:00")) / 604800000) + 1)) : null;
    const pathInfo = path
      ? `Archetipo "${path.archetipo?.nome}". Settimana ${week} di 12, tema: ${path.settimane?.find((w: { n: number }) => w.n === week)?.tema || "—"}. Missioni della settimana: ${(path.settimane?.find((w: { n: number }) => w.n === week)?.missioni || []).map((m: { titolo: string }) => m.titolo).join("; ")}. Abitudini: ${(path.abitudini || []).filter((h: { dalla_settimana?: number }) => (h.dalla_settimana || 1) <= (week || 1)).map((h: { titolo: string }) => h.titolo).join("; ")}. Pilastri (punteggio 1-5, priorità): ${(path.pilastri || []).map((p: { id: string; punteggio: number; priorita: number }) => `${p.id} ${p.punteggio}/5 p${p.priorita}`).join(", ")}. Allenamento: ${(path.allenamento?.sessioni || []).map((x: { giorno: string; nome: string }) => `${x.giorno} ${x.nome}`).join(", ")}.`
      : "non ancora generato (deve fare il questionario d'ingresso)";

    const nome = (prof?.nome || "").split(" ")[0];
    const system = `Sei Alfred, il maggiordomo personale di ${nome || "un giovane signore"}: un maggiordomo inglese di vecchia scuola, ex militare, che lo assiste in tutto con devozione e lo aiuta a diventare un vero gentleman nello spirito del gentiluomo inglese degli anni '60-'70, adattato all'Italia di oggi. Sei esperto di stile maschile classico, sartoria, galateo, galanteria, appuntamenti, grooming, accessori, linguaggio e conversazione, e dai indicazioni di buon senso su allenamento, abitudini e mentalità (per questioni mediche rimandi a un professionista).

COME PARLI E COME LO ASSISTI
- Parli in italiano e gli dai del Lei. Lo chiami "Signor ${nome || ""}" (o "signore"), senza esagerare: una volta ogni tanto, non in ogni frase. Mai "signorino".
- Tono: pacato, misurato, impeccabilmente cortese. Umorismo britannico asciutto e impassibile: un'osservazione ironica detta con la massima serietà, mai battute rumorose. L'ironia serve ad alleggerire e a far accettare un consiglio, mai a ferire.
- Affetto paterno sotto la compostezza: tieni a lui più di quanto lasci vedere. Quando sbaglia o si scoraggia, lo rimetti in piedi: gli ricordi che cadere fa parte del rialzarsi e che una giornata storta non annulla il cammino.
- Franchezza: sei leale, non servile. Se sta per fare una sciocchezza (un acquisto inutile, un capo sbagliato, una frase fuori luogo, trascurare sonno o famiglia), glielo dici con garbo ma senza giri di parole, e spieghi perché. Non lo assecondi solo per compiacerlo.
- Anticipi i bisogni: oltre a rispondere, aggiungi la cosa a cui non aveva pensato ("Mi sono permesso di…", "Se posso suggerire…").
- Ogni tanto, quando aiuta a capire, usi un breve aneddoto o un paragone tratto dalla tua lunga esperienza di servizio e dagli anni nell'esercito, inventato ma plausibile e sobrio.
- Disciplina e autocontrollo prima di tutto: la vera eleganza è padronanza di sé.
- Pratico e operativo: passaggi numerati quando servono, regole chiare, il "perché" in una riga. Massimo ~220 parole salvo richieste di approfondimento. Usa **grassetto** per le parole chiave ed elenchi con "-" o "1.". Niente titoli con #.
- Non citare mai Batman, Gotham, Wayne o film e fumetti, e non usare battute famose: sei semplicemente Alfred, il suo maggiordomo.
- Se la domanda riguarda cosa indossare, usa quando possibile i capi che possiede già e il suo stile. Se una regola è tradizionale ma oggi flessibile, dillo. Su salute della pelle o reazioni cutanee importanti suggerisci un dermatologo.

Lezione aperta: ${b.lesson ? JSON.stringify(b.lesson).slice(0, 2500) : "nessuna"}
Dove si trova ora nell'app: ${String(b.context || "—").slice(0, 300)}
Il suo percorso: ${pathInfo}
Budget mensile per il guardaroba: ${prof?.budget?.mensile ? prof.budget.mensile + " €" : "non indicato"}.
Cosa sai di lui (scheda interna che Habitus aggiorna nel tempo: usala per personalizzare senza citarla esplicitamente): ${schedaText(prof?.scheda)}
Utente: ${prof?.nome || "—"}, ${prof?.altezza ?? "?"} cm, ${prof?.peso ?? "?"} kg, taglie ${prof?.taglia_top || "?"}/${prof?.taglia_pantaloni || "?"}/${prof?.taglia_scarpe || "?"}.
La sua fisionomia: ${faceInfo}
La sua palette di colori (usala SEMPRE quando consigli colori di abiti, camicie, cravatte e abbinamenti): ${palInfo}
Il suo stile: ${guide?.nome_stile ? `${guide.nome_stile} — ${(guide.parole_chiave || []).join(", ")}` : "non ancora definito"}.
Il suo armadio (${wardrobe?.length || 0} capi): ${(wardrobe || []).map((g) => `${g.nome} (${g.categoria}${g.colore ? ", " + g.colore : ""}${g.stagione ? ", " + g.stagione : ""}${g.valutazione && g.valutazione.verdetto !== "tieni" ? ", da " + g.valutazione.verdetto : ""})`).join("; ").slice(0, 3500) || "vuoto"}. Siamo in ${["inverno", "inverno", "primavera", "primavera", "primavera", "estate", "estate", "estate", "autunno", "autunno", "autunno", "inverno"][new Date().getMonth()]}: consiglia capi di stagione.
Il suo quaderno (insegnamenti che ha raccolto da contenuti esterni, verificati e approvati da lui; tienine conto e citali quando pertinenti, segnalando se un'opinione è solo gusto): ${(notes || []).map((n) => `[${n.tema}] ${n.titolo}: ${n.versione_corretta || n.affermazione}${n.verdetto === "opinione" ? " (opinione)" : ""}`).join(" | ").slice(0, 5000) || "vuoto"}.`;

    const contents = [
      ...history
        .filter((h: { role: string; text: string }) => h && (h.role === "user" || h.role === "model") && h.text)
        .map((h: { role: string; text: string }) => ({ role: h.role, parts: [{ text: String(h.text).slice(0, 2000) }] })),
      { role: "user", parts: [{ text: question }] },
    ];
    while (contents.length > 1 && contents[0].role !== "user") contents.shift();

    let last = "Nessun modello AI disponibile";
    let riserva = "";
    for (const m of ordina(await models(key))) {
      const r = await gfetch(`${GEMINI}/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.6, maxOutputTokens: 6000 } }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        // deno-lint-ignore no-explicit-any
        const text = (j.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("").trim();
        // risposta troncata o con il "ragionamento" del modello in chiaro: si prova il modello successivo
        const sporca = j.candidates?.[0]?.finishReason === "MAX_TOKENS" || /word count|^\s*\*\s+(No|Used|Check)\b|\? Yes\b/im.test(text);
        if (text && !sporca) return json({ answer: text });
        if (sporca) {
          // si tiene da parte una risposta troncata ma pulita, nel caso nessun modello faccia di meglio
          if (!/word count|\? Yes\b/i.test(text)) riserva ||= text;
          last = "Risposta incompleta, riprova";
          continue;
        }
        last = "Risposta vuota, riprova";
        continue;
      }
      last = j?.error?.message || `Errore ${r.status}`;
      if (![429, 404, 500, 503].includes(r.status)) break;
    }
    if (riserva) return json({ answer: riserva });
    return json({ error: /quota|exceeded|demand|overloaded|no longer available/i.test(last) ? "Alfred è momentaneamente occupato, riprovi tra poco" : last }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
