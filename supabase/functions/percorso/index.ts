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

let textModels: string[] | null = null;
async function models(key: string) {
  if (textModels) return textModels;
  const r = await fetch(`${GEMINI}?key=${key}&pageSize=1000`);
  const j = await r.json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-pro$/.test(n)))].slice(0, 5);
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
  p.abitudini = (p.abitudini || []).slice(0, 7).map((h: any, i: number) => ({ id: `h${i + 1}`, titolo: h.titolo, pilastro: PILL.includes(h.pilastro) ? h.pilastro : "salute", quando: h.quando || "" }));
  p.fasi ||= [];
  p.alimentazione ||= { obiettivo: "", principi: [], giornata_tipo: [], da_limitare: [], idratazione: "" };
  p.guardaroba ||= { direzione: "", essenziali: [], regole: [] };
  p.archetipo.icone ||= [];
  p.generato_il = new Date().toISOString();
  return p;
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
    const { data: prof } = await sb.from("profiles").select("nome, gentleman, taglia_top, taglia_pantaloni, taglia_scarpe").eq("id", user.id).single();
    const answers = prof?.gentleman;
    if (!answers) return json({ error: "Completa prima il questionario" }, 400);
    const [{ data: wardrobe }, { data: health }] = await Promise.all([
      sb.from("garments").select("nome, categoria, colore").limit(120),
      sb.from("health_metrics").select("day, metric, value").gte("day", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)).in("metric", ["recovery", "sleep_hours", "hrv", "rhr", "steps", "weight"]),
    ]);
    const catalog: { id: string; titolo: string }[] = Array.isArray(b.catalog) ? b.catalog.slice(0, 80) : [];

    const prompt = `Sei il direttore dell'Accademia di Habitus, una scuola per diventare un vero gentleman nello spirito del gentiluomo inglese degli anni '60 e '70: sartoria di Savile Row, camicie di Jermyn Street, tweed e flanella, cravatte regimental, trench e giacche cerate, scarpe di Northampton, ma soprattutto modi impeccabili, un linguaggio curato e preciso, autocontrollo, cultura, forma fisica e cura di sé. Adatti questo ideale alla vita reale di oggi in Italia, senza essere anacronistico o caricaturale.

Lo studente si chiama ${prof?.nome || "—"}. Ecco le sue risposte al questionario d'ingresso:
${JSON.stringify(answers, null, 1)}

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
- Abitudini: 5-6 abitudini giornaliere semplici e misurabili (es. "In piedi entro le 7:00", "10 minuti di lettura", "2 litri d'acqua"), legate alle abitudini che vuole migliorare.
- Allenamento: crea una scheda per ESATTAMENTE i giorni a settimana che può allenarsi, della durata indicata, con l'attrezzatura che ha, per il suo obiettivo fisico e il suo livello attuale. Rispetta infortuni/limitazioni (evita esercizi a rischio e indica alternative). Usa giorni non consecutivi quando possibile ("Lun", "Mer", "Ven"…). Per ogni sessione: riscaldamento, 5-8 esercizi con serie, ripetizioni (es. "8-10"), recupero in secondi e note tecniche brevi, defaticamento. Indica come progredire nelle 12 settimane.
- Alimentazione: linee guida sane e sostenibili per il suo obiettivo (niente diete estreme, niente numeri di calorie), principi, una giornata tipo con esempi di pasti all'italiana, cosa limitare, idratazione. Se ha condizioni particolari, suggerisci un nutrizionista.
- Guardaroba: la direzione di stile (gentleman inglese adattato a lui, al suo clima e al suo lavoro), 8-12 capi essenziali da acquistare in ordine di priorità con query di ricerca in italiano e fascia di prezzo coerente col budget, 5 regole.

Rispondi SOLO con JSON valido con questa struttura:
{"archetipo":{"nome":"","descrizione":"","motto":"","icone":[""]},"ritratto":"2-3 frasi su chi è oggi e chi può diventare","pilastri":[{"id":"stile","punteggio":3,"diagnosi":"","obiettivo":"","priorita":1}],"fasi":[{"nome":"Fondamenta","da":1,"a":4,"focus":""}],"settimane":[{"n":1,"tema":"","missioni":[{"pilastro":"stile","titolo":"","dettaglio":"","lezione":null}]}],"abitudini":[{"titolo":"","pilastro":"salute","quando":"mattina"}],"allenamento":{"obiettivo":"","sessioni":[{"giorno":"Lun","nome":"","durata_min":45,"riscaldamento":"","esercizi":[{"nome":"","serie":3,"ripetizioni":"8-10","recupero_s":90,"note":""}],"defaticamento":""}],"progressione":"","note":""},"alimentazione":{"obiettivo":"","principi":[""],"giornata_tipo":[{"pasto":"Colazione","esempio":""}],"da_limitare":[""],"idratazione":""},"guardaroba":{"direzione":"","essenziali":[{"nome":"","priorita":"alta","ricerca":"","budget":""}],"regole":[""]}}`;

    let last = "Nessun modello AI disponibile";
    for (const m of await models(key)) {
      const r = await fetch(`${GEMINI}/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 24000 } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        last = j?.error?.message || `Errore ${r.status}`;
        if ([429, 404, 500, 503].includes(r.status)) continue;
        break;
      }
      // deno-lint-ignore no-explicit-any
      const text = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      try {
        const path = validate(parseJson(text));
        const start = new Date().toISOString().slice(0, 10);
        const { error } = await sb.from("profiles").update({ path, path_started_at: b.keepStart ? undefined : start }).eq("id", user.id);
        if (error) throw new Error(error.message);
        return json({ path });
      } catch (e) {
        last = e instanceof Error ? e.message : String(e);
      }
    }
    return json({ error: /quota|demand|overloaded/i.test(last) ? "L'AI è occupata, riprova tra un minuto" : last }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
