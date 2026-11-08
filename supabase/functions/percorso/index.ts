import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Accademia del gentleman: genera il percorso personalizzato di 12 settimane
 * a partire dal questionario d'ingresso.
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
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-pro$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-lite-latest")].slice(0, 9);
  return textModels;
}

function parseJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

const PILL = ["stile", "portamento", "linguaggio", "fisico", "salute", "grooming", "mente"];

// deno-lint-ignore no-explicit-any
function habits(list: any[], old: { id: string }[]) {
  const used = new Set(old.map((h) => h.id));
  let n = old.reduce((m, h) => Math.max(m, parseInt(h.id.slice(1)) || 0), 0);
  return (list || []).slice(0, 7).map((h, i) => {
    const keep = typeof h.id === "string" && used.has(h.id);
    return {
      id: keep ? h.id : old.length ? `h${++n}` : `h${i + 1}`,
      titolo: String(h.titolo || ""),
      pilastro: PILL.includes(h.pilastro) ? h.pilastro : "salute",
      quando: h.quando || "",
      dalla_settimana: Math.min(12, Math.max(1, Number(h.dalla_settimana) || 1)),
      minimo: h.minimo ? String(h.minimo) : undefined,
    };
  });
}
// deno-lint-ignore no-explicit-any
function trials(list: any[]) {
  return (list || []).slice(0, 4).map((t, i) => ({
    id: `p${i + 1}`,
    settimana: Math.min(12, Math.max(1, Number(t.settimana) || (i + 1) * 4)),
    pilastro: PILL.includes(t.pilastro) ? t.pilastro : "portamento",
    titolo: String(t.titolo || ""),
    dettaglio: String(t.dettaglio || ""),
    criteri: Array.isArray(t.criteri) ? t.criteri.slice(0, 5).map(String) : [],
  }));
}

// deno-lint-ignore no-explicit-any
function validate(p: any) {
  if (!p || !p.archetipo?.nome || !Array.isArray(p.settimane) || !p.allenamento?.sessioni) throw new Error("Percorso incompleto, riprova");
  p.pilastri = (p.pilastri || []).filter((x: { id: string }) => PILL.includes(x.id));
  // deno-lint-ignore no-explicit-any
  p.settimane = p.settimane.slice(0, 12).map((w: any, i: number) => ({
    n: i + 1,
    tema: w.tema || "",
    // deno-lint-ignore no-explicit-any
    missioni: (w.missioni || []).slice(0, 5).map((m: any, j: number) => ({
      id: `w${i + 1}m${j + 1}`,
      pilastro: PILL.includes(m.pilastro) ? m.pilastro : "stile",
      titolo: String(m.titolo || ""),
      dettaglio: String(m.dettaglio || ""),
      lezione: m.lezione || null,
    })),
  }));
  // deno-lint-ignore no-explicit-any
  p.abitudini = habits(p.abitudini, []);
  p.prove = trials(p.prove);
  p.fasi ||= [];
  p.alimentazione ||= { obiettivo: "", principi: [], giornata_tipo: [], da_limitare: [], idratazione: "" };
  p.guardaroba ||= { direzione: "", essenziali: [], regole: [] };
  p.archetipo.icone ||= [];
  p.generato_il = new Date().toISOString();
  return p;
}

// deno-lint-ignore no-explicit-any
async function gemini(key: string, prompt: string): Promise<any> {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models(key))) {
    const r = await gfetch(`${GEMINI}/${m}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 24000 } }),
    }, 120000); // il percorso è lungo da scrivere: più tempo prima di cambiare modello
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      if ([429, 404, 500, 503].includes(r.status)) continue;
      break;
    }
    // deno-lint-ignore no-explicit-any
    const text = (j.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
    const out = parseJson(text);
    if (out) return out;
    last = "Risposta AI non valida";
  }
  throw new Error(/quota|exceeded|demand|overloaded|no longer available/i.test(last) ? "L'AI ha esaurito per ora la quota gratuita di Google: riprova tra qualche minuto (con la fatturazione attiva su Google AI Studio non ci sono limiti)" : last);
}

const weekOf = (start: string | null) => {
  if (!start) return 1;
  const d = Math.floor((Date.now() - Date.parse(start + "T00:00:00")) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(d / 7) + 1));
};

// deno-lint-ignore no-explicit-any
const schedaText = (s: any) => (s?.ritratto || s?.fatti?.length ? `${s.ritratto || ""} ${(s.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).join("; ")}`.slice(0, 3500) : "ancora vuota");

/** Adatta il percorso dopo il controllo settimanale: riscrive le settimane future e le abitudini. */
// deno-lint-ignore no-explicit-any
async function adapt(sb: any, uid: string, key: string, prof: any, catalog: { id: string; titolo: string }[]) {
  const { data: full } = await sb.from("profiles").select("path, path_started_at").eq("id", uid).single();
  const path = full?.path;
  if (!path) return json({ error: "Nessun percorso da adattare" }, 400);
  const week = weekOf(full.path_started_at);
  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const [{ data: reviews }, { data: checks }, { data: prog }, { data: trialsDone }, { data: lang }] = await Promise.all([
    sb.from("path_reviews").select("week, data").order("week"),
    sb.from("path_checks").select("key, day").gte("day", since),
    sb.from("progress_entries").select("day, metric, value").order("day"),
    sb.from("field_trials").select("key, voto, note"),
    sb.from("language_logs").select("created_at, punteggio, intercalari").order("created_at", { ascending: false }).limit(10),
  ]);
  const doneMissions = new Set((await sb.from("path_checks").select("key").eq("day", "1970-01-01")).data?.map((r: { key: string }) => r.key) || []);
  // deno-lint-ignore no-explicit-any
  const habitStats = path.abitudini.map((h: any) => ({ titolo: h.titolo, id: h.id, giorni_fatti_ultime_2_settimane: (checks || []).filter((c: { key: string }) => c.key === `h:${h.id}`).length }));
  // deno-lint-ignore no-explicit-any
  const missionStats = path.settimane.filter((w: any) => w.n <= week).map((w: any) => ({ settimana: w.n, fatte: w.missioni.filter((m: any) => doneMissions.has(`m:${m.id}`)).map((m: any) => m.titolo), non_fatte: w.missioni.filter((m: any) => !doneMissions.has(`m:${m.id}`)).map((m: any) => m.titolo) }));

  const prompt = `Sei il direttore dell'Accademia di Habitus (gentiluomo inglese anni '60-'70 adattato all'Italia di oggi). Lo studente ${prof?.nome || ""} è alla settimana ${week} di 12 e ha appena fatto il controllo settimanale. Il tuo compito è ADATTARE il percorso come farebbe un sarto con un abito: tenere ciò che funziona, correggere ciò che non calza.

Questionario d'ingresso: ${JSON.stringify(prof?.gentleman || {}).slice(0, 4000)}
Cosa sappiamo di lui finora (scheda interna, aggiornata da chat, controlli e abitudini): ${schedaText(prof?.scheda)}
Archetipo: ${path.archetipo?.nome}. Pilastri iniziali: ${JSON.stringify(path.pilastri)}
Controlli settimanali (settimana 0 = punto di partenza): ${JSON.stringify(reviews || []).slice(0, 5000)}
Abitudini attuali e costanza nelle ultime 2 settimane (14 = perfetto): ${JSON.stringify(habitStats)}
Missioni passate: ${JSON.stringify(missionStats).slice(0, 4000)}
Misure e peso: ${JSON.stringify(prog || []).slice(0, 1500)}
Prove sul campo fatte: ${JSON.stringify(trialsDone || [])}
Ultime analisi del linguaggio (punteggio 0-100): ${JSON.stringify(lang || [])}
Settimane future attuali: ${JSON.stringify(path.settimane.filter((w: { n: number }) => w.n > week)).slice(0, 6000)}
Lezioni disponibili (usa SOLO questi id o null): ${catalog.map((c) => c.id).join(", ")}

Regole:
- Se la costanza è bassa o ha segnalato poco tempo, stanchezza o sonno scarso: ALLEGGERISCI (meno missioni, abitudini più piccole, togli quelle che non riesce a fare). Se va bene: aggiungi una sfida in più.
- Se un pilastro non migliora secondo le sue autovalutazioni, dagli più spazio nelle prossime settimane.
- Mantieni temi coerenti con le fasi (Fondamenta 1-4, Costruzione 5-8, Raffinatezza 9-12).
- Abitudini: restituisci l'elenco COMPLETO aggiornato (max 6). Per quelle che restano usa lo stesso "id". Indica "dalla_settimana" e "minimo".
- Allenamento: se il feedback lo richiede (troppo, troppo poco, dolori), restituisci una scheda corretta nello stesso formato; altrimenti null.
- "nota": 2-3 frasi in tono da mentore britannico che spiegano cosa hai cambiato e perché.

Rispondi SOLO con JSON: {"nota":"","settimane":[{"n":${Math.min(12, week + 1)},"tema":"","missioni":[{"pilastro":"stile","titolo":"","dettaglio":"","lezione":null}]}],"abitudini":[{"id":"h1","titolo":"","pilastro":"salute","quando":"","dalla_settimana":1,"minimo":""}],"allenamento":null}
Le settimane devono essere esattamente quelle da ${week + 1} a 12${week >= 12 ? " (nessuna: sei all'ultima settimana, restituisci settimane vuote)" : ""}.`;

  const out = await gemini(key, prompt);
  // deno-lint-ignore no-explicit-any
  const future = (out.settimane || []).filter((w: any) => Number(w.n) > week && Number(w.n) <= 12).map((w: any) => ({
    n: Number(w.n),
    tema: String(w.tema || ""),
    // deno-lint-ignore no-explicit-any
    missioni: (w.missioni || []).slice(0, 5).map((m: any, j: number) => ({
      id: `w${w.n}m${j + 1}a${week}`,
      pilastro: PILL.includes(m.pilastro) ? m.pilastro : "stile",
      titolo: String(m.titolo || ""),
      dettaglio: String(m.dettaglio || ""),
      lezione: catalog.some((c) => c.id === m.lezione) ? m.lezione : null,
    })),
  }));
  // deno-lint-ignore no-explicit-any
  const kept = path.settimane.filter((w: any) => w.n <= week || !future.some((f: any) => f.n === w.n));
  // deno-lint-ignore no-explicit-any
  path.settimane = [...kept, ...future].sort((a: any, b: any) => a.n - b.n);
  if (Array.isArray(out.abitudini) && out.abitudini.length) path.abitudini = habits(out.abitudini, path.abitudini);
  if (out.allenamento?.sessioni?.length) path.allenamento = { ...path.allenamento, ...out.allenamento };
  path.adattamenti = [...(path.adattamenti || []), { settimana: week, nota: String(out.nota || ""), data: new Date().toISOString() }];
  const { error } = await sb.from("profiles").update({ path }).eq("id", uid);
  if (error) throw new Error(error.message);
  return json({ path, nota: out.nota || "" });
}

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
    const { data: prof } = await sb.from("profiles").select("nome, gentleman, taglia_top, taglia_pantaloni, taglia_scarpe, scheda").eq("id", user.id).single();
    const answers = prof?.gentleman;
    if (!answers) return json({ error: "Completa prima il questionario" }, 400);
    const catalog: { id: string; titolo: string }[] = Array.isArray(b.catalog) ? b.catalog.slice(0, 80) : [];
    if (b.mode === "adatta") return await adapt(sb, user.id, key, prof, catalog);

    const [{ data: wardrobe }, { data: health }] = await Promise.all([
      sb.from("garments").select("nome, categoria, colore").limit(120),
      sb.from("health_metrics").select("day, metric, value").gte("day", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)).in("metric", ["recovery", "sleep_hours", "hrv", "rhr", "steps", "weight"]),
    ]);

    const prompt = `Sei il direttore dell'Accademia di Habitus, una scuola per diventare un vero gentleman nello spirito del gentiluomo inglese degli anni '60 e '70: sartoria di Savile Row, camicie di Jermyn Street, tweed e flanella, cravatte regimental, trench e giacche cerate, scarpe di Northampton, ma soprattutto modi impeccabili, un linguaggio curato e preciso, autocontrollo, cultura, forma fisica e cura di sé. Adatti questo ideale alla vita reale di oggi in Italia, senza essere anacronistico o caricaturale.

Lo studente si chiama ${prof?.nome || "—"}. Ecco le sue risposte al questionario d'ingresso:
${JSON.stringify(answers, null, 1)}
Cosa sappiamo già di lui (scheda interna, se presente): ${schedaText(prof?.scheda)}

Il suo armadio attuale (${wardrobe?.length || 0} capi): ${(wardrobe || []).map((g) => `${g.nome} (${g.categoria})`).join("; ").slice(0, 2500) || "non ancora catalogato"}.
Dati salute recenti (Whoop/Apple, se presenti): ${JSON.stringify(health || []).slice(0, 1500)}.

Lezioni disponibili nell'Accademia (usa SOLO questi id nel campo "lezione", oppure null):
${catalog.map((c) => `${c.id} = ${c.titolo}`).join("\n")}

Costruisci il SUO percorso personale di 12 settimane. Regole:
- Tutto in italiano, dai del tu, tono da mentore britannico: elegante, diretto, mai pedante.
- Archetipo: un nome evocativo (es. "Il gentiluomo di città", "Lo sportivo di campagna", "Il diplomatico") coerente con la sua vita, 2 frasi di descrizione, un motto breve, e "icone": 2-3 modelli di stile descritti in modo generico (es. "il banchiere londinese in flanella grigia", "l'attore in tweed di fine settimana"), senza nomi di persone reali.
- Pilastri: valuta tutti e 7 (id: stile, portamento, linguaggio, fisico, salute, grooming, mente) con punteggio 1-5 basato sulle risposte, una diagnosi onesta di 1 frase, un obiettivo a 12 settimane, e priorità 1-7 (1 = più urgente, rispetta le sue priorità dichiarate).
- Linguaggio: lavora in modo specifico sui difetti che ha indicato (intercalari, parolacce, anglicismi, vocabolario ristretto, registro): missioni come "Una giornata senza intercalari: registra un vocale la sera e analizzalo nel Laboratorio del linguaggio", "Riscrivi tre email di lavoro nel Laboratorio", "Impara e usa 5 parole nuove questa settimana". Includi almeno un'abitudine giornaliera di linguaggio (es. "La parola del giorno").
- Fasi: 3 fasi (Fondamenta 1-4, Costruzione 5-8, Raffinatezza 9-12) con focus.
- Settimane: esattamente 12, ognuna con un tema e 3-4 missioni CONCRETE e verificabili, realistiche per il tempo che ha al giorno e per il suo budget. Bilancia i pilastri secondo le priorità. Collega una lezione quando pertinente. Includi missioni di linguaggio ogni settimana se è tra le priorità, altrimenti a settimane alterne. Esempi di missioni buone: "Fai sistemare l'orlo di due pantaloni dal sarto", "Lucida le tue scarpe seguendo la lezione", "Invita qualcuno a cena e applica le regole della tavola", "Leggi 20 pagine al giorno di un classico inglese".
- VITA REALE (sezione "La tua vita reale" del questionario): è il vincolo più importante. Se ha un neonato o figli piccoli, sonno irregolare, molte giornate piene, stress alto o tende a mollare, il percorso deve essere più leggero: meno missioni (2 a settimana), abitudini minuscole, allenamenti brevi e spostabili. Metti le attività nei momenti liberi che ha indicato e rispetta gli impegni fissi. Meglio un piano piccolo mantenuto che uno ambizioso abbandonato.
- Abitudini: 5-6 abitudini giornaliere semplici e misurabili (es. "In piedi entro le 7:00", "10 minuti di lettura", "2 litri d'acqua"), legate a quello che vuole migliorare. NON partono tutte insieme: "dalla_settimana" indica quando si aggiungono (3 dalla settimana 1, poi una nuova ogni 1-2 settimane; se la vita è piena, massimo 4 in totale). Per ognuna scrivi "minimo": la versione da 2 minuti per le giornate storte (es. "una pagina", "un bicchiere d'acqua").
- Prove sul campo: 3 prove alla fine di ogni mese (settimane 4, 8, 12) da fare nel mondo reale, non nell'app: es. "Prima visita dal sarto per un capo da sistemare", "Organizza una cena e gestiscila con le regole della tavola", "Presenta un argomento per 3 minuti davanti a qualcuno e registrati". Ognuna con 3-4 "criteri" per autovalutarsi (es. "Ho tenuto il telefono fuori dal tavolo").
- Allenamento: segui le linee guida OMS sull'attività fisica degli adulti (150-300 minuti a settimana di attività moderata e forza almeno 2 giorni) e i principi di sovraccarico progressivo dell'ACSM. Crea una scheda per ESATTAMENTE i giorni a settimana che può allenarsi, della durata indicata, con l'attrezzatura che ha, per il suo obiettivo fisico e il suo livello attuale. Rispetta infortuni/limitazioni (evita esercizi a rischio e indica alternative). Usa giorni non consecutivi quando possibile ("Lun", "Mer", "Ven"…). Per ogni sessione: riscaldamento, 5-8 esercizi con serie, ripetizioni (es. "8-10"), recupero in secondi e note tecniche brevi, defaticamento. Indica come progredire nelle 12 settimane e come regolarsi quando ha dormito male (sforzo percepito, serie ridotte).
- Alimentazione: segui le Linee guida per una sana alimentazione del CREA; indicazioni sane e sostenibili per il suo obiettivo (niente diete estreme, niente numeri di calorie), principi, una giornata tipo con esempi di pasti all'italiana, cosa limitare, idratazione. Se ha condizioni particolari, suggerisci un nutrizionista.
- Guardaroba: la direzione di stile (gentleman inglese adattato a lui, al suo clima e al suo lavoro) e una "strategia" di 2-3 frasi coerente con budget mensile e approccio agli acquisti: con budget basso punta su palette neutra intercambiabile (blu navy, grigio, bianco, azzurro, marrone), basi dalle catene scelte con criterio (fibre naturali, cuciture, taglie da far sistemare) e sarto per l'adattamento, usato e saldi per i capi strutturati; mai giacche strutturate o scarpe di bassa qualità. Con budget alto, su misura e artigiani. Poi 8-12 capi essenziali in ordine di priorità con query di ricerca in italiano, fascia di prezzo ("budget"), "costo_stimato" in euro (numero) e "dove" (es. "catena + sarto", "outlet", "usato", "su misura"), coerenti col budget mensile. Infine 5 regole.

Rispondi SOLO con JSON valido con questa struttura:
{"archetipo":{"nome":"","descrizione":"","motto":"","icone":[""]},"ritratto":"2-3 frasi su chi è oggi e chi può diventare","pilastri":[{"id":"stile","punteggio":3,"diagnosi":"","obiettivo":"","priorita":1}],"fasi":[{"nome":"Fondamenta","da":1,"a":4,"focus":""}],"settimane":[{"n":1,"tema":"","missioni":[{"pilastro":"stile","titolo":"","dettaglio":"","lezione":null}]}],"abitudini":[{"titolo":"","pilastro":"salute","quando":"mattina","dalla_settimana":1,"minimo":""}],"prove":[{"settimana":4,"pilastro":"portamento","titolo":"","dettaglio":"","criteri":[""]}],"allenamento":{"obiettivo":"","sessioni":[{"giorno":"Lun","nome":"","durata_min":45,"riscaldamento":"","esercizi":[{"nome":"","serie":3,"ripetizioni":"8-10","recupero_s":90,"note":""}],"defaticamento":""}],"progressione":"","note":""},"alimentazione":{"obiettivo":"","principi":[""],"giornata_tipo":[{"pasto":"Colazione","esempio":""}],"da_limitare":[""],"idratazione":""},"guardaroba":{"direzione":"","strategia":"","essenziali":[{"nome":"","priorita":"alta","ricerca":"","budget":"","costo_stimato":80,"dove":""}],"regole":[""]}}`;

    const path = validate(await gemini(key, prompt));
    const start = new Date().toISOString().slice(0, 10);
    const { error } = await sb.from("profiles").update({ path, path_started_at: b.keepStart ? undefined : start }).eq("id", user.id);
    if (error) throw new Error(error.message);
    return json({ path });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
