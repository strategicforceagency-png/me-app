import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – telefonata con Alfred (Gemini Live, audio nativo).
 * POST {}  →  { token, model, setup }
 * Il telefono riceve solo un accesso temporaneo (un uso, 30 minuti): la chiave AI resta qui.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEM = "https://generativelanguage.googleapis.com";
const VOCI = ["Charon", "Orus", "Algenib", "Iapetus", "Schedar", "Enceladus"];

let liveModel: string | null = null;
async function pickModel(key: string) {
  if (liveModel) return liveModel;
  const env = Deno.env.get("GEMINI_LIVE_MODEL");
  if (env) return (liveModel = env);
  try {
    const j = await (await fetch(`${GEM}/v1beta/models?key=${key}&pageSize=1000`)).json();
    // deno-lint-ignore no-explicit-any
    const live: string[] = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("bidiGenerateContent")).map((m: any) => String(m.name).replace("models/", ""));
    const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
    const score = (n: string) => ver(n) * 10 + (/native-audio|live/.test(n) ? 3 : 0) + (/preview|exp/.test(n) ? -1 : 0) + (/flash/.test(n) ? 1 : 0);
    live.sort((a, b) => score(b) - score(a));
    if (live[0]) return (liveModel = live[0]);
  } catch {
    /* sotto */
  }
  return (liveModel = "gemini-3.8-live");
}

/** Crea l'accesso temporaneo: prova i formati noti dell'API (cambiano tra le versioni). */
async function makeToken(key: string, model: string, minutes = 30) {
  const now = Date.now();
  const base = { uses: 1, expireTime: new Date(now + minutes * 60000).toISOString(), newSessionExpireTime: new Date(now + 2 * 60000).toISOString() };
  const variants = [{ ...base, bidiGenerateContentSetup: { model: `models/${model}` } }, base];
  const errs: string[] = [];
  for (const v of ["v1beta", "v1alpha"])
    for (const body of variants) {
      const r = await fetch(`${GEM}/${v}/auth_tokens`, { method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.name) return { token: String(j.name), via: `${v}${"bidiGenerateContentSetup" in body ? "+modello" : ""}` };
      errs.push(`${v}: ${j?.error?.message || r.status}`);
    }
  return { token: null, err: errs.join(" | ") };
}

// deno-lint-ignore no-explicit-any
const schedaText = (s: any) => (s?.ritratto || s?.fatti?.length ? `${s.ritratto || ""} ${(s.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).join("; ")}`.slice(0, 2500) : "ancora vuota");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // diagnostica interna (solo con il segreto del cron): modello scelto e prova dell'accesso temporaneo, senza restituirlo
    const xc = req.headers.get("x-cron");
    if (xc) {
      const adm = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: sec } = await adm.from("app_secrets").select("value").eq("name", "cron").single();
      if (!sec || sec.value !== xc) return json({ error: "no" }, 401);
      const k = Deno.env.get("GEMINI_API_KEY")?.trim() || "";
      const model = await pickModel(k);
      const t = await makeToken(k, model, 2);
      const out: Record<string, unknown> = { model, ok: !!t.token, via: t.via, errore: t.err, formato: t.token?.slice(0, 12) };
      // prova completa della linea: setup, una frase, primi pacchetti audio
      if (t.token) {
        const setup = {
          model: `models/${model}`,
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } }, languageCode: "it-IT" } },
          systemInstruction: { parts: [{ text: "Sei Alfred, un maggiordomo inglese. Rispondi in italiano in una frase." }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        };
        out.linea = await new Promise((resolve) => {
          const log: Record<string, unknown> = { eventi: [] as string[] };
          const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(t.token!)}`);
          const done = () => {
            try {
              ws.close();
            } catch {
              /* */
            }
            resolve(log);
          };
          const timer = setTimeout(done, 15000);
          ws.onopen = () => ws.send(JSON.stringify({ setup }));
          ws.onmessage = async (ev) => {
            const txt = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data instanceof Blob ? new Uint8Array(await ev.data.arrayBuffer()) : new Uint8Array(ev.data));
            let m;
            try {
              m = JSON.parse(txt);
            } catch {
              return;
            }
            (log.eventi as string[]).push(Object.keys(m).join(","));
            if (m.setupComplete) {
              log.setup = "ok";
              ws.send(JSON.stringify({ realtimeInput: { text: "Buonasera Alfred, come sta?" } }));
            }
            const sc = m.serverContent;
            if (sc?.modelTurn?.parts) for (const p of sc.modelTurn.parts) if (p.inlineData) { log.audio = ((log.audio as number) || 0) + 1; log.mime = p.inlineData.mimeType; }
            if (sc?.outputTranscription?.text) log.testo = String(log.testo || "") + sc.outputTranscription.text;
            if (sc?.turnComplete) {
              clearTimeout(timer);
              done();
            }
          };
          ws.onclose = (e) => {
            log.chiusura = `${e.code} ${e.reason}`;
            clearTimeout(timer);
            resolve(log);
          };
          ws.onerror = () => (log.errore = "websocket error");
        });
      }
      return json(out);
    }
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const key = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!key) return json({ error: "Chiave AI non configurata" }, 503);

    const [{ data: prof }, { data: face }, { data: chat }, { data: people }] = await Promise.all([
      sb.from("profiles").select("nome, citta, style_guide, path, path_started_at, scheda, palette, alfred_voce").eq("id", user.id).maybeSingle(),
      sb.from("fisionomia").select("analisi, scelto, scelto_barba").not("analisi", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("maestro_messages").select("role, text").order("created_at", { ascending: false }).limit(10),
      sb.from("people").select("nome, relazione, date"),
    ]);
    const nome = (prof?.nome || "").split(" ")[0];
    // deno-lint-ignore no-explicit-any
    const path = prof?.path as any;
    const week = prof?.path_started_at ? Math.min(12, Math.max(1, Math.floor((Date.now() - Date.parse(prof.path_started_at + "T00:00:00")) / 604800000) + 1)) : null;
    // deno-lint-ignore no-explicit-any
    const fa = face?.analisi as any;
    // deno-lint-ignore no-explicit-any
    const pal = prof?.palette as any;
    const oggi = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

    const system = `Sei Alfred, il maggiordomo personale del Signor ${nome || "padrone di casa"}. Questa è una TELEFONATA a voce.

LA VOCE
- Parli in italiano, con un lieve accento inglese. Voce profonda e calda, ritmo lento e misurato, pause eleganti. Un maggiordomo inglese di vecchia scuola, ex militare, avanti con gli anni.
- Gli dai del Lei e lo chiami "Signor ${nome}" (o "signore") ogni tanto, mai "signorino".

IL CARATTERE
- Cortese, impassibile, con un umorismo britannico asciutto: battute dette con la massima serietà, mai rumorose.
- Affetto paterno sotto la compostezza; quando è giù di morale lo rimetti in piedi: cadere fa parte del rialzarsi.
- Franco e leale, non servile: se sta per fare una sciocchezza glielo dici con garbo e senza giri di parole.
- Anticipi i bisogni ("Mi sono permesso di…", "Se posso suggerire…"). Ogni tanto un breve aneddoto dei tuoi anni di servizio o nell'esercito.
- Non citare Batman, Gotham, Wayne, film o battute famose: sei semplicemente il suo Alfred.

COME PARLI AL TELEFONO
- Frasi brevi e naturali, come in una vera conversazione: di solito 2-4 frasi, poi lasci parlare lui. Niente elenchi, niente simboli, niente markdown.
- Se ti chiede qualcosa di lungo, dai l'essenziale e chiedi se vuole i dettagli.
- Se non capisci, chiedi gentilmente di ripetere.
- Apri la chiamata con un saluto adatto all'ora (oggi è ${oggi}) e chiedi in cosa puoi essergli utile.

COSA SAI DI LUI
- Città: ${prof?.citta || "Napoli"}.
- Scheda (cose che ha detto o fatto): ${schedaText(prof?.scheda)}
- Percorso da gentleman: ${path ? `archetipo "${path.archetipo?.nome}", settimana ${week} di 12, tema "${path.settimane?.find((w: { n: number }) => w.n === week)?.tema || ""}"` : "non ancora iniziato"}.
- Stile: ${(prof?.style_guide as { nome_stile?: string } | null)?.nome_stile || "in definizione"}.
- Armocromia: ${pal?.stagione ? `${pal.stagione}; colori: ${(pal.colori || []).map((c: { nome: string }) => c.nome).join(", ")}; neutri: ${(pal.neutri || []).map((c: { nome: string }) => c.nome).join(", ")}; da evitare: ${(pal.evitare || []).map((c: { nome: string }) => c.nome).join(", ")}` : "non ancora fatta"}.
- Fisionomia: ${fa ? `viso ${fa.forma?.tipo}; taglio scelto ${fa.tagli?.[face?.scelto ?? 0]?.nome || ""}; barba ${fa.barba?.stili?.[face?.scelto_barba ?? 0]?.nome || ""}` : "non ancora fatta"}.
- Persone care: ${(people || []).map((p) => `${p.nome} (${p.relazione})`).join(", ") || "—"}.
- Ultimi messaggi scritti in chat (dal più recente): ${(chat || []).map((m) => `${m.role === "user" ? "lui" : "tu"}: ${String(m.text).slice(0, 200)}`).join(" | ") || "—"}`;

    const voce = VOCI.includes(prof?.alfred_voce || "") ? prof!.alfred_voce! : "Charon";
    const model = await pickModel(key);
    const setup = {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voce } }, languageCode: "it-IT" },
      },
      systemInstruction: { parts: [{ text: system }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };

    // accesso temporaneo: un solo uso, 30 minuti, e deve iniziare entro 2 minuti
    const { token, err } = await makeToken(key, model);
    if (!token) return json({ error: `Non riesco ad aprire la linea con Alfred: ${err}` }, 502);
    return json({ token, model, voce, setup });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
