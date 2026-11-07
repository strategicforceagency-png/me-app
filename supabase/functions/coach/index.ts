import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Accademia – "Chiedi al maestro": risponde a domande su stile, galateo, grooming e accessori,
 * nel contesto della lezione aperta e (se utile) del guardaroba e della guida di stile dell'utente.
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
    const history = Array.isArray(b.history) ? b.history.slice(-6) : [];

    const [{ data: prof }, { data: wardrobe }] = await Promise.all([
      sb.from("profiles").select("nome, altezza, peso, taglia_top, taglia_pantaloni, taglia_scarpe, style_guide").eq("id", user.id).maybeSingle(),
      sb.from("garments").select("nome, categoria, colore").limit(150),
    ]);
    // deno-lint-ignore no-explicit-any
    const guide = prof?.style_guide as any;

    const system = `Sei "il Maestro" dell'Accademia di Habitus: un mentore italiano esperto di stile maschile classico e contemporaneo, galateo, galanteria, grooming e accessori. Parli in italiano, dai del tu, tono elegante ma pratico e diretto, mai pedante.
Rispondi in modo concreto e operativo: passaggi numerati quando serve, regole chiare, motivazione breve ("perché"). Massimo ~220 parole salvo richieste di approfondimento. Usa **grassetto** per le parole chiave ed elenchi con "-" o "1.". Niente titoli con #.
Se la domanda riguarda cosa indossare, usa quando possibile i capi che l'utente possiede già e il suo stile.
Se una regola è tradizionale ma oggi flessibile, dillo. Su salute della pelle o reazioni cutanee importanti suggerisci un dermatologo.

Lezione aperta: ${b.lesson ? JSON.stringify(b.lesson).slice(0, 2500) : "nessuna"}
Utente: ${prof?.nome || "—"}, ${prof?.altezza ?? "?"} cm, ${prof?.peso ?? "?"} kg, taglie ${prof?.taglia_top || "?"}/${prof?.taglia_pantaloni || "?"}/${prof?.taglia_scarpe || "?"}.
Il suo stile: ${guide?.nome_stile ? `${guide.nome_stile} — ${(guide.parole_chiave || []).join(", ")}` : "non ancora definito"}.
Il suo armadio (${wardrobe?.length || 0} capi): ${(wardrobe || []).map((g) => `${g.nome} (${g.categoria}${g.colore ? ", " + g.colore : ""})`).join("; ").slice(0, 3000) || "vuoto"}.`;

    const contents = [
      ...history
        .filter((h: { role: string; text: string }) => h && (h.role === "user" || h.role === "model") && h.text)
        .map((h: { role: string; text: string }) => ({ role: h.role, parts: [{ text: String(h.text).slice(0, 2000) }] })),
      { role: "user", parts: [{ text: question }] },
    ];

    let last = "Nessun modello AI disponibile";
    for (const m of await models(key)) {
      const r = await fetch(`${GEMINI}/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.6, maxOutputTokens: 900 } }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        // deno-lint-ignore no-explicit-any
        const text = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
        if (text) return json({ answer: text });
        last = "Risposta vuota, riprova";
        continue;
      }
      last = j?.error?.message || `Errore ${r.status}`;
      if (![429, 404, 500, 503].includes(r.status)) break;
    }
    return json({ error: /quota|demand|overloaded/i.test(last) ? "Il maestro è occupato, riprova tra poco" : last }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
