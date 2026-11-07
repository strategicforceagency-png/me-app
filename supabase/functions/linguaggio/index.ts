import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – Laboratorio del linguaggio: analizza un testo o un vocale e propone la versione "da gentleman".
 * body: { text?: string, audio?: { mime: string, data: base64 }, contesto?: string }
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
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n)))].slice(0, 5);
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

const PROMPT = (contesto: string, isAudio: boolean) => `Sei il maestro di lingua dell'Accademia di Habitus, scuola per gentleman. Analizzi come si esprime lo studente (italiano) e lo aiuti a parlare e scrivere con eleganza, precisione e naturalezza: niente linguaggio pomposo o antiquato, ma un italiano curato, ricco e sicuro, come un gentiluomo di oggi.
${isAudio ? "Ricevi un messaggio vocale: prima trascrivilo fedelmente (inclusi intercalari, esitazioni e ripetizioni), poi analizzalo anche nel modo di parlare (ritmo, pause, sicurezza)." : "Ricevi un testo scritto."}
Contesto dichiarato: ${contesto || "non specificato"}.

Rispondi SOLO con JSON valido in italiano:
{
 "trascrizione": "testo analizzato (per i vocali la trascrizione fedele)",
 "punteggio": 1-10 (eleganza e proprietà complessiva),
 "registro": {"attuale": "es. informale/colloquiale", "adatto": "il registro giusto per il contesto", "commento": "1 frase"},
 "intercalari": [{"parola": "cioè", "volte": 3}],
 "parolacce": 0,
 "ripetizioni": [{"parola": "", "volte": 0, "alternative": ["", ""]}],
 "colloquialismi": [{"espressione": "", "alternativa": ""}],
 "anglicismi": [{"termine": "", "italiano": ""}],
 "errori": [{"errore": "", "correzione": "", "spiegazione": ""}],
 "voce": ${isAudio ? '{"ritmo": "lento/giusto/veloce", "esitazioni": 0, "commento": "1-2 frasi su ritmo, pause e sicurezza"}' : "null"},
 "versione_gentleman": "la stessa comunicazione riscritta come la direbbe/scriverebbe un gentleman, mantenendo il senso e la sua personalità",
 "parole_nuove": [{"parola": "", "significato": "", "esempio": "frase d'esempio adatta alla sua vita"}],
 "punti_forza": ["1-2 cose fatte bene"],
 "consiglio": "il consiglio più importante, 1-2 frasi"
}
Regole: elenchi vuoti se non c'è nulla da segnalare; 3 parole_nuove sempre; sii onesto ma incoraggiante.`;

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
    const text = String(b.text || "").trim().slice(0, 6000);
    const audio = b.audio && b.audio.data ? { mime: String(b.audio.mime || "audio/webm").split(";")[0], data: String(b.audio.data) } : null;
    if (!text && !audio) return json({ error: "Scrivi un testo o registra un vocale" }, 400);
    if (audio && audio.data.length > 14_000_000) return json({ error: "Vocale troppo lungo: massimo circa 3 minuti" }, 400);
    const contesto = String(b.contesto || "").slice(0, 200);

    const parts: unknown[] = [];
    if (audio) parts.push({ inline_data: { mime_type: audio.mime, data: audio.data } });
    if (text) parts.push({ text: `TESTO DA ANALIZZARE:\n${text}` });
    parts.push({ text: PROMPT(contesto, !!audio) });

    let last = "Nessun modello AI disponibile";
    for (const m of await models(key)) {
      const r = await fetch(`${GEMINI}/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 6000 } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        last = j?.error?.message || `Errore ${r.status}`;
        if ([429, 404, 500, 503].includes(r.status)) continue;
        break;
      }
      // deno-lint-ignore no-explicit-any
      const out = parseJson((j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join(""));
      if (!out?.versione_gentleman) {
        last = "Analisi non riuscita, riprova";
        continue;
      }
      for (const k of ["intercalari", "ripetizioni", "colloquialismi", "anglicismi", "errori", "parole_nuove", "punti_forza"]) if (!Array.isArray(out[k])) out[k] = [];
      const intercalari = out.intercalari.reduce((s: number, x: { volte?: number }) => s + (Number(x.volte) || 0), 0);
      const { data: row } = await sb
        .from("language_logs")
        .insert({ user_id: user.id, kind: audio ? "vocale" : "testo", contesto: contesto || null, punteggio: Number(out.punteggio) || null, intercalari, analysis: out })
        .select("id, created_at")
        .single();
      return json({ analysis: out, id: row?.id, created_at: row?.created_at });
    }
    return json({ error: /quota|demand|overloaded/i.test(last) ? "L'AI è occupata, riprova tra un minuto" : last }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
