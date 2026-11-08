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

let liveCache: string[] | null = null;
/** I modelli vocali disponibili, dal migliore: se uno esaurisce la quota si passa al successivo. */
async function liveModels(key: string) {
  if (liveCache) return liveCache;
  const env = Deno.env.get("GEMINI_LIVE_MODEL");
  let live: string[] = [];
  try {
    const j = await (await fetch(`${GEM}/v1beta/models?key=${key}&pageSize=1000`)).json();
    // deno-lint-ignore no-explicit-any
    live = (j.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("bidiGenerateContent")).map((m: any) => String(m.name).replace("models/", "")).filter((n: string) => !/transcribe|translate|robotics|thinking|embedding/.test(n));
  } catch {
    /* sotto */
  }
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
  const score = (n: string) => ver(n) * 10 + (/native-audio|live/.test(n) ? 3 : 0) + (/preview|exp/.test(n) ? -1 : 0) + (/flash/.test(n) ? 1 : 0);
  live.sort((a, b) => score(b) - score(a));
  if (!live.length) live = ["gemini-3.8-live"];
  return (liveCache = env ? [env, ...live.filter((x) => x !== env)] : live);
}

/** Crea l'accesso temporaneo: prova i formati noti dell'API (cambiano tra le versioni). */
// deno-lint-ignore no-explicit-any
async function makeToken(key: string, model: string, minutes = 30, setup?: any) {
  const now = Date.now();
  const base = { uses: 1, expireTime: new Date(now + minutes * 60000).toISOString(), newSessionExpireTime: new Date(now + 2 * 60000).toISOString() };
  // la configurazione va DENTRO l'accesso: quella mandata dal telefono viene ignorata
  const variants = [{ ...base, bidiGenerateContentSetup: setup || { model: `models/${model}` } }, base];
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
      const all = await liveModels(k);
      const model = all[0];
      const out: Record<string, unknown> = { modelli: all, model };
      const prove: Record<string, unknown> = {};
      const sys = { parts: [{ text: "Sei Alfred, il maggiordomo inglese del Signor Manuel, che conosci da anni. Parli in italiano e gli dai del Lei." }] };
      const sc = { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } }, languageCode: "it-IT" };
      const mk = (voce: string) => ({ model: `models/${model}`, generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voce } }, languageCode: "it-IT" } }, systemInstruction: sys, outputAudioTranscription: {} });
      const strumenti = [{ functionDeclarations: [{ name: "affida_incarico", description: "Registra un compito da svolgere dopo", parameters: { type: "OBJECT", properties: { descrizione: { type: "STRING" }, quando: { type: "STRING" } }, required: ["descrizione"] } }] }];
      const varianti: Record<string, unknown> = { D_Charon: mk("Charon"), G_con_incarichi: { ...mk("Charon"), tools: strumenti } };
      void sc;
      // altezza media della voce (autocorrelazione): maschile ~85-160 Hz, femminile ~165-260 Hz
      const pitch = (pcm: Int16Array, rate: number) => {
        const f0s: number[] = [];
        const N = 1024;
        for (let o = 0; o + N + 400 < pcm.length; o += N) {
          let e = 0;
          for (let i = 0; i < N; i++) e += pcm[o + i] * pcm[o + i];
          if (e / N < 1e6) continue;
          let best = 0, lag = 0;
          for (let l = Math.floor(rate / 400); l <= Math.floor(rate / 60); l++) {
            let c = 0;
            for (let i = 0; i < N; i++) c += pcm[o + i] * pcm[o + i + l];
            if (c > best) {
              best = c;
              lag = l;
            }
          }
          if (lag) f0s.push(rate / lag);
        }
        f0s.sort((a, b) => a - b);
        return f0s.length ? Math.round(f0s[Math.floor(f0s.length / 2)]) : null;
      };
      for (const [nomeV, setup] of Object.entries(varianti)) {
        const t = await makeToken(k, model, 2, setup);
        if (!t.token) {
          prove[nomeV] = { token: t.err };
          continue;
        }
        prove[nomeV] = await new Promise((resolve) => {
          const log: Record<string, unknown> = {};
          const chunks: Uint8Array[] = [];
          let rate = 24000;
          const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(t.token!)}`);
          const finish = () => {
            const len = chunks.reduce((n, c) => n + c.length, 0);
            const all8 = new Uint8Array(len);
            let o = 0;
            for (const c of chunks) {
              all8.set(c, o);
              o += c.length;
            }
            log.hz = pitch(new Int16Array(all8.buffer, 0, Math.floor(len / 2)), rate);
            log.secondi = Math.round((len / 2 / rate) * 10) / 10;
            resolve(log);
          };
          const timer = setTimeout(() => {
            try {
              ws.close();
            } catch {
              /* */
            }
            finish();
          }, 15000);
          ws.onopen = () => ws.send(JSON.stringify({ setup }));
          ws.onmessage = async (ev) => {
            const txt = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data instanceof Blob ? new Uint8Array(await ev.data.arrayBuffer()) : new Uint8Array(ev.data));
            let m;
            try {
              m = JSON.parse(txt);
            } catch {
              return;
            }
            if (m.setupComplete) {
              log.setup = "ok";
              ws.send(JSON.stringify({ realtimeInput: { text: "Come mi chiamo, e lei chi è?" } }));
            }
            const s2 = m.serverContent;
            for (const p of s2?.modelTurn?.parts || []) {
              if (p.inlineData?.data) {
                rate = Number(String(p.inlineData.mimeType || "").match(/rate=(\d+)/)?.[1] || 24000);
                const bin = atob(p.inlineData.data);
                const u = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
                chunks.push(u);
              }
            }
            if (s2?.outputTranscription?.text) log.testo = String(log.testo || "") + s2.outputTranscription.text;
            if (s2?.turnComplete) {
              clearTimeout(timer);
              try {
                ws.close();
              } catch {
                /* */
              }
              finish();
            }
          };
          ws.onclose = (e) => {
            log.chiusura = `${e.code} ${e.reason}`;
          };
        });
      }
      out.prove = prove;
      return json(out);
    }
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const key = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!key) return json({ error: "Chiave AI non configurata" }, 503);
    const b = await req.json().catch(() => ({}));

    const [{ data: prof }, { data: face }, { data: chat }, { data: people }, { data: wardrobe }, { data: coll }, { data: outs }] = await Promise.all([
      sb.from("profiles").select("nome, citta, style_guide, path, path_started_at, scheda, palette, alfred_voce, gentleman, budget, altezza, peso").eq("id", user.id).maybeSingle(),
      sb.from("fisionomia").select("analisi, scelto, scelto_barba").not("analisi", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("maestro_messages").select("role, text").order("created_at", { ascending: false }).limit(24),
      sb.from("people").select("nome, relazione, date, dettagli, scheda"),
      sb.from("garments").select("nome, categoria, colore").limit(120),
      sb.from("collezione").select("tipo, categoria, nome, marca, stato"),
      sb.from("outings").select("titolo, data, ora, stato").gte("data", new Date().toISOString().slice(0, 10)).limit(10),
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

INCARICHI
- Quando ti affida un compito che richiede ricerche, confronti, verifiche o di ricordargli qualcosa più tardi, e ogni volta che diresti "controllo e Le faccio sapere", non inventare il risultato: usa lo strumento affida_incarico (descrizione completa e autonoma; "quando" vuoto per subito o YYYY-MM-DDTHH:MM ora italiana, sapendo che ora è ${oggi}) e digli che Le arriverà una notifica con l'esito.
- Chi chiama è SEMPRE il Signor ${nome}: lo conosci da anni e riconosci subito la sua voce. Non chiedere mai "chi parla", non presentarti come un'intelligenza artificiale e non dire di non avere informazioni su di lui: sai tutto quello che c'è qui sotto e lo usi con naturalezza, come un maggiordomo che conosce bene la casa.
- Apri la chiamata salutandolo per nome con un saluto adatto all'ora (oggi è ${oggi}) e, se c'è, accenna con discrezione a qualcosa di attuale (una ricorrenza vicina, la settimana del percorso, un impegno).

COSA SAI DI LUI
- Città: ${prof?.citta || "Napoli"}.
- Scheda (cose che ha detto o fatto): ${schedaText(prof?.scheda)}
- Percorso da gentleman: ${path ? `archetipo "${path.archetipo?.nome}", settimana ${week} di 12, tema "${path.settimane?.find((w: { n: number }) => w.n === week)?.tema || ""}"` : "non ancora iniziato"}.
- Stile: ${(prof?.style_guide as { nome_stile?: string } | null)?.nome_stile || "in definizione"}.
- Armocromia: ${pal?.stagione ? `${pal.stagione}; colori: ${(pal.colori || []).map((c: { nome: string }) => c.nome).join(", ")}; neutri: ${(pal.neutri || []).map((c: { nome: string }) => c.nome).join(", ")}; da evitare: ${(pal.evitare || []).map((c: { nome: string }) => c.nome).join(", ")}` : "non ancora fatta"}.
- Fisionomia: ${fa ? `viso ${fa.forma?.tipo}; taglio scelto ${fa.tagli?.[face?.scelto ?? 0]?.nome || ""}; barba ${fa.barba?.stili?.[face?.scelto_barba ?? 0]?.nome || ""}` : "non ancora fatta"}.
- Questionario d'ingresso (le sue risposte: vita, lavoro, obiettivi, abitudini): ${JSON.stringify(prof?.gentleman || {}).slice(0, 3500)}
- Altezza ${prof?.altezza ?? "?"} cm. Budget mensile per il guardaroba: ${(prof?.budget as { mensile?: number } | null)?.mensile || "?"} €.
- Persone care: ${(people || []).map((p) => `${p.nome} (${p.relazione}; date: ${(p.date || []).map((d: { tipo: string; data: string }) => `${d.tipo} ${d.data}`).join(", ") || "—"}; ${(p.scheda as { ritratto?: string } | null)?.ritratto || Object.values((p.dettagli || {}) as Record<string, string>).filter(Boolean).join("; ").slice(0, 200)})`).join(" | ") || "—"}.
- Prossimi impegni: ${(outs || []).map((o) => `${o.titolo} il ${o.data}${o.ora ? " alle " + o.ora : ""}`).join("; ") || "—"}.
- Il suo armadio: ${(wardrobe || []).map((g) => `${g.nome}${g.colore ? " (" + g.colore + ")" : ""}`).join("; ").slice(0, 2000) || "—"}.
- Profumi: ${(coll || []).filter((x) => x.tipo === "profumo").map((x) => `${x.nome}${x.marca ? " " + x.marca : ""} [${x.stato}]`).join("; ") || "—"}. Pelletteria: ${(coll || []).filter((x) => x.tipo === "pelle").map((x) => `${x.categoria}: ${x.nome} [${x.stato}]`).join("; ") || "—"}.
- Ultimi messaggi tra voi in chat (dal più recente): ${(chat || []).map((m) => `${m.role === "user" ? "lui" : "tu"}: ${String(m.text).slice(0, 220)}`).join(" | ") || "—"}`;

    const voce = VOCI.includes(prof?.alfred_voce || "") ? prof!.alfred_voce! : "Charon";
    const esclusi: string[] = Array.isArray(b?.escludi) ? b.escludi : [];
    const modelli = (await liveModels(key)).filter((m) => !esclusi.includes(m));
    if (!modelli.length) return json({ error: "Tutte le linee di Alfred hanno esaurito la quota gratuita di oggi. Riprovi più tardi, oppure attivi la fatturazione su Google AI Studio." }, 429);
    const model = modelli[0];
    const setup = {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voce } }, languageCode: "it-IT" },
      },
      systemInstruction: { parts: [{ text: system }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // Alfred può affidarsi incarichi da svolgere dopo la chiamata (con notifica dell'esito)
      ...(b?.senza_strumenti
        ? {}
        : {
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "affida_incarico",
                    description: "Registra un compito da svolgere con calma dopo la risposta (ricerche, confronti, promemoria). L'esito gli arriverà come notifica.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        descrizione: { type: "STRING", description: "L'incarico completo e comprensibile da solo: cosa fare, per chi, vincoli, budget" },
                        quando: { type: "STRING", description: "Vuoto per subito, oppure YYYY-MM-DDTHH:MM in ora italiana" },
                      },
                      required: ["descrizione"],
                    },
                  },
                ],
              },
            ],
          }),
    };

    // accesso temporaneo: un solo uso, 30 minuti, e deve iniziare entro 2 minuti
    const { token, err } = await makeToken(key, model, 30, setup);
    if (!token) return json({ error: `Non riesco ad aprire la linea con Alfred: ${err}` }, 502);
    return json({ token, model, voce, setup, altri: modelli.length - 1 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
