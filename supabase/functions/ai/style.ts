// Ispirazioni (Instagram / foto) e guida di stile personale.
type Img = { mime: string; data: string };
type GeminiFn = (kind: "text" | "image", parts: unknown[], config?: Record<string, unknown>) => Promise<unknown[]>;

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const imgPart = (i: Img) => ({ inline_data: { mime_type: i.mime, data: i.data } });

function textOf(parts: unknown[]) {
  // deno-lint-ignore no-explicit-any
  return (parts as any[]).filter((p) => !p.thought).map((p) => p.text || "").join("");
}
function parseJson<T>(t: string, fallback: T): T {
  try {
    return JSON.parse(t) as T;
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch { /* */ }
    }
    return fallback;
  }
}
const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/\\u0026/g, "&").replace(/\\\//g, "/");

/** Immagine di un post Instagram pubblico tramite la pagina di embed ufficiale. */
export async function igPost(url: string): Promise<{ image: string; username: string | null; caption: string | null }> {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("Link non valido: serve il link di un post (instagram.com/p/…)");
  const embed = `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/`;
  const r = await fetch(embed, { headers: { "User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9" } });
  const html = await r.text();
  const img =
    html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/)?.[1] ||
    html.match(/<img[^>]+class="[^"]*EmbeddedMediaImage[^"]*"[^>]+src="([^"]+)"/)?.[1] ||
    html.match(/"display_url\\?":\\?"([^"\\]+(?:\\.[^"\\]*)*)/)?.[1] ||
    html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!img) throw new Error("Post non leggibile (privato o non disponibile): carica uno screenshot");
  const username = html.match(/class="UsernameText"[^>]*>([^<]+)</)?.[1] || html.match(/"username\\?":\\?"([^"\\]+)/)?.[1] || null;
  const caption = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments/)?.[1]?.replace(/<[^>]+>/g, " ").trim() || null;
  return { image: decode(img), username, caption: caption ? caption.slice(0, 400) : null };
}

export type Analysis = {
  riassunto: string;
  stili: { nome: string; descrizione: string; peso: number }[];
  palette: { nome: string; hex: string }[];
  capi_chiave: { nome: string; categoria: string; colore: string; perche: string }[];
  formule: { nome: string; pezzi: string[]; occasione: string }[];
  look: { immagine: number; titolo: string; pezzi: string[]; stile: string; occasione: string }[];
  brand: string[];
  vestibilita: string;
  dettagli: string[];
};

export async function analyzeInspiration(
  gemini: GeminiFn,
  images: Img[],
  handle: string | null,
  videos: { uri: string; mime: string; caption?: string }[] = [],
  captions: { caption?: string; tipo?: string }[] = [],
): Promise<Analysis> {
  const parts: unknown[] = [];
  images.forEach((im, i) => {
    parts.push({ text: `IMMAGINE ${i}` });
    parts.push(imgPart(im));
  });
  videos.forEach((v, i) => {
    parts.push({ text: `VIDEO ${i}${v.caption ? ` — didascalia: ${v.caption.slice(0, 300)}` : ""}` });
    parts.push({ file_data: { mime_type: v.mime, file_uri: v.uri } });
  });
  const caps = captions.map((c) => c.caption).filter(Boolean).slice(0, 18);
  parts.push({
    text: `Sei un personal shopper e stylist maschile di alto livello. ${handle ? `Questi contenuti vengono dal profilo Instagram @${handle}` : "Questi sono contenuti di ispirazione"}: ${images.length} immagini (screenshot, post, foto dei caroselli, copertine o fotogrammi di video)${videos.length ? ` e ${videos.length} video completi` : ""}. ${videos.length ? "Guarda i video per intero: capi che compaiono solo in alcuni momenti, come cadono e si muovono i tessuti, vestibilità in movimento, dettagli (polsini, risvolti, calze, accessori), e ascolta l'audio se nomina capi, marchi o consigli di stile. Usa anche i video nei campi dell'analisi. " : ""}${caps.length ? `Didascalie dei post (possono nominare capi, marchi, tessuti): ${JSON.stringify(caps).slice(0, 4000)}. ` : ""}Analizza SOLO l'abbigliamento e lo stile, non la persona.
Rispondi SOLO con JSON valido, in italiano, con questa struttura:
{
 "riassunto": "2-3 frasi sullo stile complessivo",
 "stili": [{"nome": "es. Quiet luxury, Old money, Streetwear minimal, Smart casual mediterraneo", "descrizione": "1 frase", "peso": 0-100}],
 "palette": [{"nome": "es. Cammello", "hex": "#C19A6B"}],
 "capi_chiave": [{"nome": "es. Cardigan in cashmere", "categoria": una tra ["Felpe e Maglioni","Maglie","Camicie","Canotte","Pantaloni","Giacche e Cappotti","Scarpe","Accessori"], "colore": "…", "perche": "perché è distintivo di questo stile"}],
 "formule": [{"nome": "nome breve dell'outfit tipo", "pezzi": ["capo 1","capo 2","scarpe","accessorio"], "occasione": "es. Weekend, Lavoro, Serata"}],
 "look": [{"immagine": indice di una IMMAGINE (non dei video), "titolo": "nome del look", "pezzi": ["descrizione di ogni capo visibile con colore e materiale"], "stile": "stile principale", "occasione": "…"}],
 "brand": ["brand riconoscibili o di riferimento per questo stile"],
 "vestibilita": "come vestono i capi (slim, regular, oversize, cropped…)",
 "dettagli": ["dettagli ricorrenti: es. maniche risvoltate, orologio in acciaio, calzino a vista…"]
}
Regole: 2-4 stili ordinati per peso; 5-8 colori nella palette; 6-12 capi chiave; 3-6 formule; un elemento in "look" per ogni immagine che mostra un outfit diverso (salta immagini senza vestiti e fotogrammi quasi identici). Non inventare brand se non sei ragionevolmente sicuro.`,
  });
  const out = await gemini("text", parts, { responseMimeType: "application/json", temperature: 0.4 });
  const a = parseJson<Analysis>(textOf(out), {
    riassunto: "",
    stili: [],
    palette: [],
    capi_chiave: [],
    formule: [],
    look: [],
    brand: [],
    vestibilita: "",
    dettagli: [],
  });
  for (const k of ["stili", "palette", "capi_chiave", "formule", "look", "brand", "dettagli"] as const) {
    // deno-lint-ignore no-explicit-any
    if (!Array.isArray((a as any)[k])) (a as any)[k] = [];
  }
  return a;
}

export type Guide = {
  nome_stile: string;
  manifesto: string;
  parole_chiave: string[];
  palette: { nome: string; hex: string }[];
  capi_essenziali: { nome: string; categoria: string; colore: string; ce_l_hai: boolean; capo_id: string | null; ricerca: string }[];
  formule: { nome: string; pezzi: string[]; occasione: string; con_i_tuoi_capi: string[] }[];
  regole: { si: string[]; no: string[] };
  prossimi_acquisti: { nome: string; perche: string; priorita: "alta" | "media" | "bassa"; ricerca: string; budget: string }[];
  generato_il?: string;
};

// deno-lint-ignore no-explicit-any
const paletteText = (p: any) =>
  p?.colori?.length
    ? `PALETTE PERSONALE (dall'analisi del suo viso, armocromia: ${p.stagione || ""}, sottotono ${p.sottotono || "?"}, contrasto ${p.contrasto || "?"}). Neutri: ${(p.neutri || []).map((c: { nome: string; hex: string }) => `${c.nome} ${c.hex}`).join(", ")}. Colori: ${(p.colori || []).map((c: { nome: string; hex: string }) => `${c.nome} ${c.hex}`).join(", ")}. Da evitare vicino al viso: ${(p.evitare || []).map((c: { nome: string }) => c.nome).join(", ")}. Metalli: ${p.metalli || "—"}. La palette della guida, i colori dei capi essenziali, delle formule e dei prossimi acquisti DEVONO partire da questa palette personale, adattata allo stile scelto: usa i neutri per completi, pantaloni e capispalla e i colori per camicie, cravatte e maglieria; non proporre i colori da evitare vicino al viso.`
    : "";

export async function buildGuide(
  gemini: GeminiFn,
  picks: { kind: string; value: unknown; fonte: string | null }[],
  wardrobe: { id: string; nome: string; categoria: string; colore: string | null; formalita: string | null }[],
  profile: Record<string, unknown> | null,
): Promise<Guide> {
  const prompt = `Sei il personal shopper personale di ${profile?.nome || "questo utente"} (uomo). Ha costruito un moodboard selezionando questi elementi dalle sue ispirazioni:
${JSON.stringify(picks, null, 1)}

Il suo armadio attuale (id, nome, categoria, colore, formalità):
${JSON.stringify(wardrobe.map((g) => [g.id, g.nome, g.categoria, g.colore, g.formalita]))}

Misure: altezza ${profile?.altezza ?? "?"} cm, peso ${profile?.peso ?? "?"} kg; taglie: top ${profile?.taglia_top || "?"}, pantaloni ${profile?.taglia_pantaloni || "?"}, scarpe ${profile?.taglia_scarpe || "?"}.
${paletteText(profile?.palette)}

Crea la SUA guida di stile personale: sintetizza gli elementi scelti in uno stile coerente e indossabile, adatto a lui. Confronta con l'armadio: per ogni capo essenziale indica se ce l'ha già (ce_l_hai=true e capo_id = id del capo più simile) oppure no. Nelle formule usa i nomi dei suoi capi quando esistono. I "prossimi_acquisti" sono massimo 6, ordinati per impatto (quelli che sbloccano più outfit con ciò che ha già). "ricerca" è una query breve in italiano per cercare quel capo online (es. "mocassino scamosciato marrone uomo"). "budget" è una fascia indicativa in euro.
Rispondi SOLO con JSON valido in italiano:
{"nome_stile": "nome evocativo dello stile, 2-4 parole", "manifesto": "3-4 frasi in seconda persona", "parole_chiave": ["5-7 parole"], "palette": [{"nome":"","hex":"#"}], "capi_essenziali": [{"nome":"","categoria":"","colore":"","ce_l_hai":true,"capo_id":null,"ricerca":""}], "formule": [{"nome":"","pezzi":[""],"occasione":"","con_i_tuoi_capi":["nomi dei suoi capi usati"]}], "regole": {"si":["5 regole"],"no":["4 errori da evitare"]}, "prossimi_acquisti": [{"nome":"","perche":"","priorita":"alta","ricerca":"","budget":"€50-90"}]}`;
  const out = await gemini("text", [{ text: prompt }], { responseMimeType: "application/json", temperature: 0.5 });
  const g = parseJson<Guide>(textOf(out), {} as Guide);
  if (!g.nome_stile) throw new Error("L'AI non ha restituito una guida valida, riprova");
  g.parole_chiave ||= [];
  g.palette ||= [];
  g.capi_essenziali ||= [];
  g.formule ||= [];
  g.regole ||= { si: [], no: [] };
  g.prossimi_acquisti ||= [];
  const ids = new Set(wardrobe.map((w) => w.id));
  g.capi_essenziali.forEach((c) => {
    if (c.capo_id && !ids.has(c.capo_id)) c.capo_id = null;
  });
  g.generato_il = new Date().toISOString();
  return g;
}
