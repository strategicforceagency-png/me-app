import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – gli incarichi di Alfred: le cose che gli affida (o che lui stesso promette di controllare)
 * vengono svolte in background e il risultato arriva come notifica e come messaggio nella chat.
 * POST { action: "crea", testo, quando?, origine?, riservato? }   (utente)  affida un incarico
 * POST { action: "annulla", id }                                  (utente)
 * POST /esegui { id }                                             (x-cron)  lo svolge adesso
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const GEM = "https://generativelanguage.googleapis.com/v1beta";
const lenti = new Set<string>();
const gfetch = (u: string, o: RequestInit, ms = 60000) =>
  fetch(u, { ...o, signal: AbortSignal.timeout(ms) }).catch(() => {
    const m = u.match(/models\/([^:/?]+):generateContent/)?.[1];
    if (m) lenti.add(m);
    return new Response(JSON.stringify({ error: { message: "Il modello non ha risposto in tempo" } }), { status: 503 });
  });
const ordina = (l: string[]) => {
  const rapidi = l.filter((m) => /^gemini-3\.[56]-flash$/.test(m));
  const resto = [...rapidi, ...l.filter((m) => !rapidi.includes(m))];
  return [...resto.filter((m) => !lenti.has(m)), ...resto.filter((m) => lenti.has(m))];
};
const key = () => Deno.env.get("GEMINI_API_KEY")!.trim();
let textModels: string[] | null = null;
async function models() {
  if (textModels) return textModels;
  const j = await (await fetch(`${GEM}/models?key=${key()}&pageSize=1000`)).json();
  // deno-lint-ignore no-explicit-any
  const gen: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => String(m.name).replace("models/", ""));
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const by = (a: string[]) => [...a].sort((x, y) => ver(y) - ver(x));
  const vivo = (n: string) => !/^gemini-[12]\./.test(n);
  textModels = [...by(gen.filter((n) => /^gemini-[\d.]+-flash$/.test(n) && vivo(n))), ...gen.filter((n) => n === "gemini-flash-latest"), ...by(gen.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n) && vivo(n)))].slice(0, 8);
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
async function ask0(prompt: string, search: boolean): Promise<{ out: any; fonti: Fonte[] }> {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.4, maxOutputTokens: 10000, ...(search ? {} : { responseMimeType: "application/json" }) },
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
    const out = parseJson((c?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join(""));
    if (!out?.esito) {
      last = "Risposta non valida";
      continue;
    }
    // deno-lint-ignore no-explicit-any
    const fonti = ((c?.groundingMetadata?.groundingChunks || []) as any[])
      .map((g) => g.web)
      .filter((w) => w?.uri)
      .reduce((acc: Fonte[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || "fonte", url: w.uri }]), [])
      .slice(0, 8);
    return { out, fonti };
  }
  throw new Error(/quota|exceeded|demand|overloaded/i.test(last) ? "quota AI esaurita per ora" : last);
}
/** Ricerca Google vera, in prosa: con l'obbligo di rispondere in JSON il modello non cerca. */
async function ricerca(domanda: string): Promise<{ testo: string; fonti: Fonte[] }> {
  let last = "Nessun modello AI disponibile";
  for (const m of ordina(await models())) {
    const r = await gfetch(`${GEM}/models/${m}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: domanda }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2, maxOutputTokens: 8000 } }),
    }, 110000);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      last = j?.error?.message || `Errore ${r.status}`;
      continue;
    }
    const c = j.candidates?.[0];
    // deno-lint-ignore no-explicit-any
    const testo = (c?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
    // deno-lint-ignore no-explicit-any
    const fonti = ((c?.groundingMetadata?.groundingChunks || []) as any[])
      .map((g) => g.web)
      .filter((w) => w?.uri)
      .reduce((acc: Fonte[], w) => (acc.some((a) => a.titolo === w.title) ? acc : [...acc, { titolo: w.title || "fonte", url: w.uri }]), [])
      .slice(0, 8);
    if (testo) return { testo, fonti };
    last = "Ricerca vuota";
  }
  throw new Error(last);
}
/** Prima cerca davvero sul web (in prosa), poi scrive il resoconto in JSON partendo da ciò che ha trovato. */
async function ask(prompt: string, incarico: string) {
  let trovato: { testo: string; fonti: Fonte[] } | null = null;
  try {
    trovato = await ricerca(`Sei l'assistente di ricerca di un maggiordomo. Cerca online tutto ciò che serve per svolgere questo incarico, con informazioni aggiornate e verificabili (orari, giorni di apertura, prezzi, disponibilità, recensioni, indirizzi, alternative). Riporta i fatti trovati citando i siti, senza inventare nulla. Oggi è ${oraRoma()}. Incarico: «${incarico}»`);
  } catch {
    trovato = null;
  }
  const conRicerca = !!trovato && trovato.fonti.length > 0;
  const extra = conRicerca
    ? `\n\nRICERCA WEB APPENA FATTA (usa questi fatti, non inventarne altri; se qualcosa non risulta, dillo):\n${trovato!.testo.slice(0, 12000)}`
    : "\n\nATTENZIONE: in questo momento la ricerca web non ha dato risultati. Usa ciò che sai con certezza, niente link inventati, prezzi solo come fasce indicative, e diglielo con garbo se qualcosa va verificato.";
  const r = await ask0(prompt + extra, false);
  return { out: r.out, fonti: conRicerca ? trovato!.fonti : [], senza_ricerca: !conRicerca };
}

/** "2026-11-09T09:00" inteso come ora di Roma → istante UTC */
function daRoma(s: string): string | null {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(asUtc)).map((p) => [p.type, p.value]));
  const romaDiQuellIstante = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  return new Date(asUtc - (romaDiQuellIstante - asUtc)).toISOString();
}
const oraRoma = () => new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

// deno-lint-ignore no-explicit-any
const schedaText = (s: any) => (s?.ritratto || s?.fatti?.length ? `${s.ritratto || ""} ${(s.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).join("; ")}`.slice(0, 3000) : "—");

async function contesto(sb: SupabaseClient, uid: string) {
  const [{ data: p }, { data: gar }, { data: ppl }, { data: coll }, { data: outs }, { data: chat }] = await Promise.all([
    sb.from("profiles").select("nome, citta, palette, style_guide, scheda, budget, gentleman, taglia_top, taglia_pantaloni, taglia_scarpe, posizione").eq("id", uid).maybeSingle(),
    sb.from("garments").select("nome, categoria, colore, stagione, brand, valutazione").eq("user_id", uid).not("stato", "in", "(venduto,regalato)").limit(150),
    sb.from("people").select("nome, relazione, date, dettagli, non_piace, scheda").eq("user_id", uid).limit(30),
    sb.from("collezione").select("tipo, categoria, nome, marca, stato").eq("user_id", uid).limit(60),
    sb.from("outings").select("titolo, data, ora, stato").eq("user_id", uid).gte("data", new Date().toISOString().slice(0, 10)).limit(10),
    sb.from("maestro_messages").select("role, text").eq("user_id", uid).order("created_at", { ascending: false }).limit(16),
  ]);
  // deno-lint-ignore no-explicit-any
  const pr = p as any;
  return {
    nome: String(pr?.nome || "").split(" ")[0],
    testo: `Lui: ${pr?.nome || "—"}, vive a ${pr?.citta || "Napoli"}${pr?.posizione?.luogo ? ` (ora si trova a ${pr.posizione.luogo})` : ""}. Taglie ${pr?.taglia_top || "?"}/${pr?.taglia_pantaloni || "?"}/${pr?.taglia_scarpe || "?"}. Budget guardaroba ${pr?.budget?.mensile || "?"} € al mese.
Stile: ${pr?.style_guide?.nome_stile || "gentleman classico"}. Armocromia: ${pr?.palette?.stagione || "—"} (colori: ${(pr?.palette?.colori || []).map((c: { nome: string }) => c.nome).join(", ")}).
Cosa sai di lui: ${schedaText(pr?.scheda)}
Questionario d'ingresso: ${JSON.stringify(pr?.gentleman || {}).slice(0, 1500)}
Armadio: ${(gar || []).map((g) => `${g.nome}${g.colore ? " (" + g.colore + ")" : ""}`).join("; ").slice(0, 2500) || "—"}
Persone care: ${(ppl || []).map((x) => `${x.nome} (${x.relazione}; date ${(x.date || []).map((d: { tipo: string; data: string }) => `${d.tipo} ${d.data}`).join(", ")}; gusti ${Object.values((x.dettagli || {}) as Record<string, string>).filter(Boolean).join("; ").slice(0, 300)}; non le piace ${x.non_piace || "—"}; ${(x.scheda as { ritratto?: string } | null)?.ritratto || ""})`).join(" | ").slice(0, 3500) || "—"}
Profumi e pelletteria: ${(coll || []).map((x) => `${x.nome}${x.marca ? " " + x.marca : ""} [${x.tipo}, ${x.stato}]`).join("; ").slice(0, 1200) || "—"}
Prossimi impegni: ${(outs || []).map((o) => `${o.titolo} il ${o.data}${o.ora ? " alle " + o.ora : ""}`).join("; ") || "—"}
Ultimi messaggi in chat (dal più recente): ${(chat || []).map((m) => `${m.role === "user" ? "lui" : "Alfred"}: ${String(m.text).slice(0, 300)}`).join(" | ").slice(0, 3500)}`,
  };
}

const VAI = ["armadio", "outfit", "stile", "profumi", "pelletteria", "persone", "regali", "uscite", "lettere", "percorso", "accademia", "fisico", "fisionomia", "linguaggio", "budget", "alfred"];

async function esegui(admin: SupabaseClient, id: string, secret: string) {
  const { data: t } = await admin.from("incarichi").select("*").eq("id", id).maybeSingle();
  if (!t || ["fatto", "annullato", "da_confermare"].includes(t.stato)) return { ok: false, motivo: "non da fare" };
  if (t.stato === "in_corso" && t.iniziato_at && Date.now() - new Date(t.iniziato_at).getTime() < 4 * 60000) return { ok: false, motivo: "già in corso" };
  await admin.from("incarichi").update({ stato: "in_corso", iniziato_at: new Date().toISOString(), tentativi: (t.tentativi || 0) + 1 }).eq("id", id);
  try {
    const ctx = await contesto(admin, t.user_id);
    const prompt = `Sei Alfred, il maggiordomo inglese di vecchia scuola del Signor ${ctx.nome}: gli dai del Lei, lo chiami "Signor ${ctx.nome}", tono pacato, preciso, con un filo di ironia britannica asciutta. Ora sono le ${oraRoma()} (ora italiana).
Lui ti ha affidato questo incarico${t.quando ? ", da svolgere adesso" : ""}: «${t.testo}»
Svolgilo davvero e fino in fondo, come un maggiordomo che torna con il lavoro fatto: cerca, confronta, verifica, decidi. Se è un promemoria, è il momento di ricordarglielo con garbo, aggiungendo ciò che gli serve sapere. Se riguarda acquisti, dai opzioni concrete con prezzo e dove trovarle; se riguarda persone, tieni conto dei loro gusti; se riguarda lo stile, usa il suo armadio e la sua armocromia. Se manca un'informazione che solo lui può dare, fai comunque il massimo e chiedigliela alla fine. Puoi solo cercare sul web e ragionare: non hai telefonato né scritto a nessuno e non devi fingere di averlo fatto. Se l'incarico chiedeva di contattare qualcuno, trova numero, orari e prezzi pubblicati e preparagli in due righe cosa chiedere.

Cosa sai di lui:
${ctx.testo}

Rispondi SOLO con JSON valido in italiano:
{"esito":"i dettagli, che lui apre solo se vuole approfondire: discorsivo e naturale, senza grassetto e senza titoli; nomi, prezzi, orari e dove trovarli; la tua scelta e il perché. Se ci sono più opzioni puoi usare un breve elenco con -. Non ripetere il saluto né la sintesi.",
"sintesi":"quello che gli dici a voce appena torni da lui: 1-2 frasi brevi e naturali con la conclusione, es. \\"Signor ${ctx.nome}, lasci perdere quel locale: la domenica a pranzo è chiuso. Ho trovato di meglio a due passi, i dettagli sono qui sotto.\\"",
"titolo":"titolo della notifica, max 45 caratteri, es. \\"Fatto: i fiori per Emanuela\\"",
"breve":"testo della notifica, max 140 caratteri, con la cosa più importante",
"vai":"la sezione dell'app più utile per proseguire, una tra ${VAI.join(", ")}",
"seguito":null oppure {"testo":"un eventuale incarico successivo che lui ha chiesto (es. ricordarglielo più avanti)","quando":"YYYY-MM-DDTHH:MM ora italiana"}}`;
    const { out, fonti, senza_ricerca } = await ask(prompt, t.testo);
    const vai = VAI.includes(out.vai) ? out.vai : "alfred";
    const esito = String(out.esito || "").trim() + (senza_ricerca ? "\n\n_La ricerca web di Google oggi non era disponibile: ho usato ciò che so, verifichi prezzi e disponibilità._" : "");
    await admin.from("incarichi").update({ stato: "fatto", esito, breve: String(out.breve || "").slice(0, 200), vai, fonti, fatto_at: new Date().toISOString() }).eq("id", id);
    if (!t.riservato) await admin.from("maestro_messages").insert({ user_id: t.user_id, role: "model", text: `${String(out.sintesi || out.breve || "").trim()}\n\n📋 **Incarico svolto** — ${t.testo}\n\n${esito}` });
    if (out.seguito?.testo) {
      const quando = daRoma(out.seguito.quando);
      if (quando && new Date(quando).getTime() > Date.now()) await admin.from("incarichi").insert({ user_id: t.user_id, testo: String(out.seguito.testo), quando, origine: "seguito", riservato: t.riservato });
    }
    await fetch(`${URL_}/functions/v1/promemoria/invia`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron": secret },
      body: JSON.stringify({ user_id: t.user_id, title: String(out.titolo || "Alfred ha finito").slice(0, 60), body: String(out.breve || "L'incarico è svolto: le ho lasciato il resoconto in chat.").slice(0, 200), url: "./?vai=alfred", tag: "incarico" }),
    }).then((r) => r.text()).catch(() => null);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // si riprova al prossimo giro (fino a 3 volte), poi si avvisa
    const fine = (t.tentativi || 0) + 1 >= 3;
    await admin.from("incarichi").update({ stato: fine ? "errore" : "in_attesa", esito: fine ? `Non sono riuscito a completarlo: ${msg}` : null, quando: fine ? t.quando : new Date(Date.now() + 10 * 60000).toISOString() }).eq("id", id);
    if (fine)
      await fetch(`${URL_}/functions/v1/promemoria/invia`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": secret }, body: JSON.stringify({ user_id: t.user_id, title: "Un incarico è rimasto in sospeso", body: `Non sono riuscito a completare: ${t.testo}`.slice(0, 200), url: "./?vai=alfred", tag: "incarico" }) }).catch(() => null);
    return { ok: false, errore: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "cron").single();
  const secret = sec?.value as string;
  const avvia = (id: string) =>
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil(fetch(`${URL_}/functions/v1/incarichi/esegui`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron": secret }, body: JSON.stringify({ id }) }).then((r) => r.text()).catch(() => null));
  try {
    if (route === "esegui") {
      if (req.headers.get("x-cron") !== secret) return json({ error: "no" }, 401);
      const { id } = await req.json();
      return json(await esegui(admin, id, secret));
    }
    if (route === "cron") {
      // dal promemoria ogni 5 minuti: incarichi arrivati all'ora stabilita, o rimasti bloccati
      if (req.headers.get("x-cron") !== secret) return json({ error: "no" }, 401);
      const ora = new Date().toISOString();
      const { data: pronti } = await admin.from("incarichi").select("id").eq("stato", "in_attesa").or(`quando.is.null,quando.lte.${ora}`).limit(5);
      const { data: bloccati } = await admin.from("incarichi").select("id").eq("stato", "in_corso").lt("iniziato_at", new Date(Date.now() - 6 * 60000).toISOString()).limit(3);
      for (const r of [...(pronti || []), ...(bloccati || [])]) avvia(r.id);
      return json({ avviati: (pronti?.length || 0) + (bloccati?.length || 0) });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();
    if (b.action === "crea") {
      const testo = String(b.testo || "").trim().slice(0, 1500);
      if (!testo) return json({ error: "Incarico vuoto" }, 400);
      const quando = b.quando ? daRoma(String(b.quando)) || (isNaN(Date.parse(b.quando)) ? null : new Date(b.quando).toISOString()) : null;
      // ogni incarico aspetta la conferma di lui prima di consumare credito (salvo conferma già data)
      const { data: row, error } = await sb.from("incarichi").insert({ testo, quando, origine: b.origine || "chat", riservato: !!b.riservato, stato: b.confermato ? "in_attesa" : "da_confermare" }).select("*").single();
      if (error) throw new Error(error.message);
      if (b.confermato && (!quando || new Date(quando).getTime() <= Date.now() + 60000)) avvia(row.id);
      return json({ incarico: row });
    }
    if (b.action === "conferma") {
      const { data: row } = await sb.from("incarichi").update({ stato: "in_attesa" }).eq("id", b.id).eq("stato", "da_confermare").select("*").maybeSingle();
      if (row && (!row.quando || new Date(row.quando).getTime() <= Date.now() + 60000)) avvia(row.id);
      return json({ incarico: row });
    }
    if (b.action === "annulla") {
      await sb.from("incarichi").update({ stato: "annullato" }).eq("id", b.id).in("stato", ["da_confermare", "in_attesa", "errore"]);
      return json({ ok: true });
    }
    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
