import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Habitus – collaudo completo con l'utente di prova (test-claude@me-app.test), dati separati da quelli di Manuel.
 * Protetto dal segreto interno (header x-cron). POST { step }
 * Ogni passo chiama una funzione vera con il token dell'utente di prova e verifica nel database cosa è cambiato.
 */
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const TEST_EMAIL = "test-claude@me-app.test";
const TEST_ID = "b77585a2-ae1c-4ea3-ac68-2ce755b00918";
const CATALOG = [
  { id: "vestirsi/abito", titolo: "Vestirsi – L'abito" },
  { id: "cravatte/nodi", titolo: "Cravatte – I nodi" },
  { id: "galateo/tavola", titolo: "Galateo – A tavola" },
  { id: "grooming/rasatura", titolo: "Grooming – La rasatura" },
  { id: "profumi/indossarlo", titolo: "Profumi – Indossarlo con misura" },
  { id: "pelletteria/cintura", titolo: "Pelletteria – La cintura" },
];

Deno.serve(async (req) => {
  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "cron").single();
  if (!sec || req.headers.get("x-cron") !== sec.value) return json({ error: "no" }, 401);
  const { step } = await req.json().catch(() => ({ step: "" }));
  if (step === "modelli") {
    const k = Deno.env.get("GEMINI_API_KEY")!.trim();
    const tempo = async (m: string, cerca: boolean) => {
      const t0 = Date.now();
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(40000), body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: cerca ? "Che tempo fa oggi a Napoli? Una riga." : "Scrivi una frase di auguri di compleanno elegante." }] }], ...(cerca ? { tools: [{ google_search: {} }] } : {}) }) }).catch((e) => ({ status: 0, json: async () => ({ error: { message: String(e) } }) }) as unknown as Response);
      const b = await r.json().catch(() => ({}));
      return `${r.status} ${((Date.now() - t0) / 1000).toFixed(1)}s ${b?.error?.message?.slice(0, 90) || ""}`;
    };
    const nuovi: Record<string, string> = {};
    await Promise.all(["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"].map(async (m) => {
      nuovi[m] = `testo: ${await tempo(m, false)} | ricerca: ${await tempo(m, true)}`;
    }));
    return json({ nuovi });
  }

  // accesso come utente di prova: password nuova a ogni passo, mai restituita
  const pwd = crypto.randomUUID() + "Aa1!";
  const { error: eu } = await admin.auth.admin.updateUserById(TEST_ID, { password: pwd });
  if (eu) return json({ error: "utente di prova: " + eu.message }, 500);
  const anon = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: sess, error: es } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: pwd });
  if (es || !sess.session) return json({ error: "accesso di prova: " + es?.message }, 500);
  const token = sess.session.access_token;
  const db = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const call = async (fn: string, body: unknown, path = "") => {
    const t0 = Date.now();
    const r = await fetch(`${URL_}/functions/v1/${fn}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, secondi: Math.round((Date.now() - t0) / 100) / 10, j };
  };
  const cut = (x: unknown, n = 400) => String(JSON.stringify(x) ?? "").slice(0, n);
  const ok = (cond: unknown) => (cond ? "OK" : "KO");

  try {
    if (step === "prepara") {
      for (const t of ["outfit_items", "outfits", "garments", "people", "gifts", "outings", "letters", "collezione", "maestro_messages", "path_reviews", "path_checks", "knowledge", "tutorials", "contents", "style_picks", "notifications", "fisionomia"]) await admin.from(t).delete().eq("user_id", TEST_ID);
      await admin.from("profiles").update({
        nome: "Manuel Collaudo",
        citta: "Napoli",
        altezza: 180,
        peso: 78,
        taglia_top: "M",
        taglia_pantaloni: "48",
        taglia_scarpe: "43",
        budget: { mensile: 150, approccio: "qualita" },
        gentleman: {
          eta: "34", lavoro: "Sales manager, spesso in giacca", obiettivi: ["stile", "portamento", "linguaggio"], tempo_giorno: "20 minuti", allenamento_giorni: 3, attrezzatura: "manubri a casa",
          vita: { figli: "un neonato", sonno: "irregolare", impegni: "lavoro 9-19" }, linguaggio: ["intercalari"], priorita: ["stile", "linguaggio", "fisico"],
        },
        palette: { stagione: "Autunno profondo", sottotono: "caldo", contrasto: "medio", metalli: "oro giallo", neutri: [{ nome: "Blu notte", hex: "#1C2A44" }, { nome: "Marrone tabacco", hex: "#6B4A2B" }], colori: [{ nome: "Verde bottiglia", hex: "#1F4D3A" }, { nome: "Bordeaux", hex: "#6D1F2B" }, { nome: "Senape", hex: "#C99A2E" }], evitare: [{ nome: "Bianco ottico", hex: "#FFFFFF" }, { nome: "Rosa confetto", hex: "#F4B6C2" }] },
        scheda: {}, path: null, path_started_at: null, style_guide: null, profumi_analisi: null, pelle_analisi: null,
      }).eq("id", TEST_ID);
      await admin.from("garments").insert([
        { user_id: TEST_ID, nome: "Blazer blu navy", categoria: "Giacche e Cappotti", colore: "blu navy", formalita: "Smart casual" },
        { user_id: TEST_ID, nome: "Camicia azzurra Oxford", categoria: "Camicie", colore: "azzurro", formalita: "Smart casual" },
        { user_id: TEST_ID, nome: "Chino beige", categoria: "Pantaloni", colore: "beige", formalita: "Casual" },
        { user_id: TEST_ID, nome: "Pantalone in flanella grigia", categoria: "Pantaloni", colore: "grigio", formalita: "Elegante" },
        { user_id: TEST_ID, nome: "Mocassino scamosciato marrone", categoria: "Scarpe", colore: "marrone", formalita: "Smart casual" },
        { user_id: TEST_ID, nome: "Maglione girocollo verde bottiglia", categoria: "Felpe e Maglioni", colore: "verde", formalita: "Casual" },
      ]);
      const oggi = new Date();
      const tra = (g: number) => new Date(oggi.getTime() + g * 86400000).toISOString().slice(5, 10);
      const { data: p } = await admin.from("people").insert({
        user_id: TEST_ID, nome: "Emanuela Prova", relazione: "Moglie",
        date: [{ tipo: "Compleanno", data: `1990-${tra(5)}` }, { tipo: "Anniversario", data: `2019-${tra(40)}` }],
        dettagli: { moda: "minimal, borse piccole a mano, toni caldi", fiori: "peonie bianche", cibo: "cucina giapponese, bollicine", luoghi: "Costiera amalfitana, Parigi", passioni: "gialli, yoga" },
        non_piace: "sorprese in pubblico, oro bianco",
      }).select("id").single();
      await admin.from("collezione").insert([
        { user_id: TEST_ID, tipo: "profumo", nome: "Vétiver", marca: "Guerlain", stato: "mio" },
        { user_id: TEST_ID, tipo: "pelle", categoria: "Cartella", nome: "Cartella in cuoio testa di moro", colore: "testa di moro", stato: "mio" },
        { user_id: TEST_ID, tipo: "pelle", categoria: "Cintura", nome: "Cintura nera liscia", colore: "nero", stato: "mio" },
      ]);
      await admin.from("maestro_messages").insert([
        { user_id: TEST_ID, role: "user", text: "Lavoro in giacca tre giorni a settimana e il venerdì sono più casual. Odio le cravatte troppo lucide." },
        { user_id: TEST_ID, role: "model", text: "Ottima scelta evitare le sete lucide, Signor Manuel: le grenadine opache le staranno meglio." },
        { user_id: TEST_ID, role: "user", text: "Il mio obiettivo è smettere di dire 'cioè' e 'praticamente' in riunione." },
      ]);
      await admin.from("style_picks").insert([
        { user_id: TEST_ID, kind: "stile", key: "old-money", value: { nome: "Old money", descrizione: "classico discreto" } },
        { user_id: TEST_ID, kind: "capo", key: "blazer-navy", value: { nome: "Blazer navy", colore: "blu" } },
        { user_id: TEST_ID, kind: "colore", key: "cammello", value: { nome: "Cammello", hex: "#C19A6B" } },
      ]);
      return json({ ok: true, persona: p?.id });
    }

    if (step === "percorso") {
      const r = await call("percorso", { catalog: CATALOG });
      const { data: pr } = await db.from("profiles").select("path").eq("id", TEST_ID).single();
      const path = pr?.path as { settimane?: unknown[]; abitudini?: unknown[]; archetipo?: { nome: string }; guardaroba?: { strategia?: string } } | null;
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, verifica: { percorso_salvato: ok(path), settimane: path?.settimane?.length, abitudini: path?.abitudini?.length, archetipo: path?.archetipo?.nome, strategia_budget: path?.guardaroba?.strategia?.slice(0, 160) } });
    }
    if (step === "adatta") {
      await db.from("path_reviews").upsert({ week: 0, data: { pilastri: { stile: 3, linguaggio: 2 } } });
      await db.from("path_reviews").upsert({ week: 1, data: { andamento: 2, energia: 2, sonno: 1, tempo: 1, allenamento: "troppo", note: "il neonato non mi fa dormire" } });
      const r = await call("percorso", { mode: "adatta", catalog: CATALOG });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, nota: r.j.nota, verifica: { adattato: ok(r.j.path?.adattamenti?.length) } });
    }
    if (step === "scheda_me") {
      const r = await call("conoscenza", { action: "me" });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, ritratto: r.j.scheda?.ritratto, fatti: (r.j.scheda?.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).slice(0, 12) });
    }
    if (step === "alfred") {
      const r = await call("coach", { question: "Che colore di cravatta mi sta meglio, e cosa mi metto stasera per la cena con Emanuela?", history: [] });
      const a = String(r.j.answer || "");
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, risposta: a.slice(0, 900), verifica: { usa_signor: ok(/Signor/i.test(a)), usa_armocromia: ok(/bottiglia|bordeaux|senape|tabacco|blu notte/i.test(a)), usa_armadio: ok(/blazer|flanella|mocassin|oxford|chino|maglione/i.test(a)), niente_signorino: ok(!/signorino/i.test(a)) } });
    }
    if (step === "idea") {
      const { data: p } = await db.from("people").select("id").eq("nome", "Emanuela Prova").single();
      const r = await call("conoscenza", { action: "idea", person_id: p!.id, testo: "le piacciono tanto https://it.wikipedia.org/wiki/Paeonia", link: "https://it.wikipedia.org/wiki/Paeonia" });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, idea: r.j.idea?.testo, analisi: r.j.idea?.analisi, scheda_persona: { ritratto: r.j.scheda?.ritratto, fatti: (r.j.scheda?.fatti || []).map((f: { testo: string; cat: string }) => `[${f.cat}] ${f.testo}`).slice(0, 10) } });
    }
    if (["regali", "uscite", "lettera", "serata"].includes(step)) {
      const { data: p } = await db.from("people").select("id").eq("nome", "Emanuela Prova").single();
      const body =
        step === "regali" ? { action: "regali", person_id: p!.id, occasione: "Compleanno", budget: "80-150 €" }
        : step === "uscite" ? { action: "uscite", tipo: "Cena romantica", dove: "Napoli", budget: "medio-alto", person_id: p!.id }
        : step === "lettera" ? { action: "lettera", tipo: "Biglietto di compleanno", contenuto: "grazie per la pazienza con le notti in bianco del bimbo", person_id: p!.id }
        : { action: "serata", person_id: p!.id };
      const r = await call("lifestyle", body);
      const txt = JSON.stringify(r.j);
      return json({
        step, http: r.status, secondi: r.secondi, errore: r.j.error,
        esempio: cut(r.j.idee?.slice(0, 3) || r.j.proposte?.slice(0, 2) || r.j.versioni?.slice(0, 1) || r.j.serate?.slice(0, 1), 1200),
        fonti: (r.j.fonti || []).length,
        verifica: { usa_gusti_di_lei: ok(/peoni|giappon|bollicin|costiera|minimal|yoga|giall/i.test(txt)), evita_cio_che_non_le_piace: ok(!/oro bianco/i.test(txt) || /evit|non.{0,20}oro bianco/i.test(txt)) },
      });
    }
    if (step === "profumi") {
      const { data: it } = await db.from("collezione").select("id").eq("tipo", "profumo").limit(1).single();
      const a = await call("collezione", { action: "profumo", id: it!.id });
      const b = await call("collezione", { action: "profumo_oggi", occasione: "Ufficio" });
      const c = await call("collezione", { action: "profumi_consigli" });
      return json({ step, scheda: { http: a.status, secondi: a.secondi, errore: a.j.error, famiglia: a.j.dettagli?.famiglia, anno: a.j.dettagli?.anno, note: a.j.dettagli?.note }, oggi: { http: b.status, errore: b.j.error, dosi: b.j.dosi, perche: b.j.perche }, consigli: { http: c.status, secondi: c.secondi, errore: c.j.error, profilo: c.j.profilo, da_provare: (c.j.da_provare || []).map((x: { nome: string; marca: string; prezzo: string }) => `${x.nome} – ${x.marca} (${x.prezzo})`), fonti: (c.j.fonti || []).length } });
    }
    if (step === "pelle") {
      const r = await call("collezione", { action: "pelle_consigli" });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, valutazione: r.j.valutazione, colori: r.j.colori, set: (r.j.set || []).map((s: { pezzo: string; ce_l_ha: boolean }) => `${s.ce_l_ha ? "✓" : "·"} ${s.pezzo}`), priorita: (r.j.priorita || []).map((p: { nome: string; prezzo: string }) => `${p.nome} (${p.prezzo})`), fonti: (r.j.fonti || []).length });
    }
    if (step === "stile") {
      const r = await call("ai", { action: "style_guide" });
      const g = r.j.guide;
      const pal = (g?.palette || []).map((c: { nome: string }) => c.nome);
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, nome_stile: g?.nome_stile, palette: pal, verifica: { usa_armocromia: ok(pal.some((n: string) => /bottiglia|bordeaux|senape|tabacco|blu notte|cammello/i.test(n))), evita_bianco_ottico: ok(!pal.some((n: string) => /bianco ottico|rosa confetto/i.test(n))) }, prossimi_acquisti: (g?.prossimi_acquisti || []).map((x: { nome: string; budget: string }) => `${x.nome} (${x.budget})`) });
    }
    if (step === "contenuti") {
      const { data: c } = await db.from("contents").insert({ kind: "link", source: "https://www.hockerty.com/it/blog/come-fare-il-nodo-alla-cravatta" }).select("id").single();
      const a = await call("contenuti", { action: "raccogli", id: c!.id });
      if (a.status !== 200) return json({ step, raccogli: a });
      const b = await call("contenuti", { action: "analizza", id: c!.id });
      return json({ step, id: c!.id, raccogli: { http: a.status, secondi: a.secondi, j: a.j }, analizza: { http: b.status, secondi: b.secondi, j: b.j } });
    }
    if (step === "verifica") {
      const { data: c } = await db.from("contents").select("id").order("created_at", { ascending: false }).limit(1).single();
      const r = await call("contenuti", { action: "verifica", id: c!.id });
      const { data: k } = await db.from("knowledge").select("tema, corso, titolo, verdetto, fonti").eq("content_id", c!.id);
      const { data: t } = await db.from("tutorials").select("id, corso, titolo, data, verifica").eq("content_id", c!.id);
      return json({
        step, http: r.status, secondi: r.secondi, errore: r.j.error,
        insegnamenti: (k || []).map((x) => `[${x.corso || x.tema}] ${x.titolo} → ${x.verdetto} (${(x.fonti || []).length} fonti)`),
        tutorial_wikihow: (t || []).map((x) => ({ corso: x.corso, titolo: x.titolo, difficolta: x.data?.difficolta, occorrente: x.data?.occorrente, passaggi: (x.data?.passaggi || []).map((p: { titolo: string; illustrazione: string }) => p.titolo), con_descrizione_illustrazione: (x.data?.passaggi || []).every((p: { illustrazione?: string }) => !!p.illustrazione), errori: x.data?.errori, verifica: x.verifica?.verdetto })),
      });
    }
    if (step === "illustra") {
      const { data: t } = await db.from("tutorials").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!t) return json({ step, errore: "nessun tutorial" });
      const r = await call("contenuti", { action: "illustra", tutorial_id: t.id, step: 0 });
      return json({ step, http: r.status, secondi: r.secondi, risposta: r.j });
    }
    if (step === "voce") {
      const r = await call("voce", {});
      return json({ step, http: r.status, errore: r.j.error, modello: r.j.model, voce: r.j.voce, accesso: ok(String(r.j.token || "").startsWith("auth_tokens/")), contesto_caratteri: r.j.setup?.systemInstruction?.parts?.[0]?.text?.length, contiene: { emanuela: ok(/Emanuela/.test(r.j.setup?.systemInstruction?.parts?.[0]?.text || "")), armocromia: ok(/Autunno profondo/.test(r.j.setup?.systemInstruction?.parts?.[0]?.text || "")), armadio: ok(/Blazer/.test(r.j.setup?.systemInstruction?.parts?.[0]?.text || "")), profumi: ok(/Vétiver|Vetiver/.test(r.j.setup?.systemInstruction?.parts?.[0]?.text || "")) } });
    }
    if (step === "notifiche") {
      const r = await call("promemoria", {}, "/test");
      const { data: n } = await db.from("notifications").select("titolo, vai").limit(3);
      return json({ step, http: r.status, risposta: r.j, area_notifiche: n });
    }
    if (step === "meteo") {
      const { data: g } = await db.from("garments").select("id, categoria, nome");
      const pick = (c: string) => (g || []).find((x) => x.categoria === c)?.id;
      const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
      await db.from("outfits").delete().eq("giorno", oggi);
      const { data: o } = await db.from("outfits").insert({ nome: "Prova meteo", stile: "Ufficio", giorno: oggi }).select("id").single();
      const items = [["Camicie", "top"], ["Pantaloni", "bottom"], ["Scarpe", "scarpe"]].map(([c, sl]) => ({ outfit_id: o!.id, garment_id: pick(c), slot: sl, layer: 1, user_id: TEST_ID })).filter((x) => x.garment_id);
      await db.from("outfit_items").insert(items);
      const r = await call("armadio", { action: "meteo", lat: 40.85, lon: 14.27 });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, luogo: r.j.luogo, meteo: r.j.meteo && { min: r.j.meteo.min, max: r.j.meteo.max, pioggia: r.j.meteo.pioggia_max, ore_pioggia: r.j.meteo.ore_pioggia }, verdetto: r.j.verdetto, messaggio: r.j.messaggio, modifiche: r.j.modifiche, accessori: r.j.accessori, verifica: { outfit_letto: ok(r.j.outfit_id === o!.id) } });
    }
    if (step === "trova") {
      const { data: g } = await db.from("garments").select("id").eq("nome", "Blazer blu navy").single();
      await db.from("garments").update({ brand: "Massimo Dutti" }).eq("id", g!.id);
      const r = await call("armadio", { action: "trova", id: g!.id });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, online: r.j.online && { nome: r.j.online.nome, certezza: r.j.online.certezza, link: r.j.online.link, immagine: !!r.j.online.immagine, prezzo: r.j.online.prezzo } });
    }
    if (step === "revisione") {
      const r = await call("armadio", { action: "revisione" });
      return json({ step, http: r.status, secondi: r.secondi, errore: r.j.error, sintesi: r.j.sintesi, stagioni: r.j.stagioni, mancano: r.j.mancano, capi: (r.j.capi || []).map((c: { nome: string; verdetto: string; motivo: string; vinted?: { titolo: string; prezzo: string }; sostituto?: { cosa: string; opzioni: unknown[] }; errore?: string }) => ({ nome: c.nome, verdetto: c.verdetto, motivo: c.motivo, vinted: c.vinted && `${c.vinted.titolo} – ${c.vinted.prezzo}`, sostituto: c.sostituto && `${c.sostituto.cosa} (${c.sostituto.opzioni?.length} opzioni)`, errore: c.errore })) });
    }
    if (step === "pulisci") {
      for (const t of ["outfit_items", "outfits", "garments", "people", "gifts", "outings", "letters", "collezione", "maestro_messages", "path_reviews", "path_checks", "knowledge", "tutorials", "contents", "style_picks", "notifications", "fisionomia", "inspirations"]) await admin.from(t).delete().eq("user_id", TEST_ID);
      await admin.from("profiles").update({ path: null, scheda: {}, style_guide: null, palette: null, profumi_analisi: null, pelle_analisi: null, gentleman: null, armadio_revisione: null, posizione: null }).eq("id", TEST_ID);
      return json({ ok: true });
    }
    return json({ error: "passo sconosciuto" }, 400);
  } catch (e) {
    return json({ step, eccezione: e instanceof Error ? e.message : String(e) }, 500);
  }
});
