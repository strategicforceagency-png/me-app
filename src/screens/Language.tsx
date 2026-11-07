import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Feather, Loader2, Mic, PenLine, Sparkles, Square, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { PAROLE, wordOfDay } from "../gentleman/words";
import { useApp } from "../lib/store";
import { fn, supabase } from "../lib/supabase";

type Analysis = {
  trascrizione: string;
  punteggio: number;
  registro: { attuale: string; adatto: string; commento: string };
  intercalari: { parola: string; volte: number }[];
  parolacce: number;
  ripetizioni: { parola: string; volte: number; alternative: string[] }[];
  colloquialismi: { espressione: string; alternativa: string }[];
  anglicismi: { termine: string; italiano: string }[];
  errori: { errore: string; correzione: string; spiegazione: string }[];
  voce: { ritmo: string; esitazioni: number; commento: string } | null;
  versione_gentleman: string;
  parole_nuove: { parola: string; significato: string; esempio: string }[];
  punti_forza: string[];
  consiglio: string;
};
type LogRow = { id: string; created_at: string; kind: "testo" | "vocale"; contesto: string | null; punteggio: number | null; intercalari: number | null; analysis: Analysis };

const CONTESTI = ["Email di lavoro", "Messaggio a un cliente", "Messaggio a un amico", "Conversazione", "Presentazione", "Primo appuntamento"];
const MAX_SEC = 180;

/* registrazione → WAV mono 16 kHz (formato accettato ovunque dall'AI) */
async function toWav(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const audio = await ctx.decodeAudioData(buf);
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(audio.duration * rate), rate);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  ctx.close();
  const pcm = out.getChannelData(0);
  const data = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  data.setUint32(4, 36 + pcm.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 1, true);
  data.setUint32(24, rate, true);
  data.setUint32(28, rate * 2, true);
  data.setUint16(32, 2, true);
  data.setUint16(34, 16, true);
  w(36, "data");
  data.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  const bytes = new Uint8Array(data.buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function LanguageScreen() {
  const app = useApp();
  const [mode, setMode] = useState<"scrivi" | "registra">("scrivi");
  const [contesto, setContesto] = useState(CONTESTI[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ a: Analysis; kind: string } | null>(null);
  const [history, setHistory] = useState<LogRow[]>([]);
  const [rec, setRec] = useState<{ sec: number } | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const word = wordOfDay();

  const load = useCallback(async () => {
    const { data } = await supabase.from("language_logs").select("*").order("created_at", { ascending: false }).limit(30);
    setHistory((data as LogRow[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!rec) return;
    if (rec.sec >= MAX_SEC) {
      stop();
      return;
    }
    const t = window.setTimeout(() => setRec((r) => (r ? { sec: r.sec + 1 } : r)), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec]);
  useEffect(() => window.scrollTo({ top: 0 }), [result]);

  const analyze = async (body: Record<string, unknown>, kind: string) => {
    setBusy(true);
    try {
      const r = await fn<{ analysis: Analysis }>("linguaggio", "", { ...body, contesto });
      setResult({ a: r.analysis, kind });
      setText("");
      load();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        setBusy(true);
        try {
          const data = await toWav(blob);
          await analyze({ audio: { mime: "audio/wav", data } }, "vocale");
        } catch (e) {
          app.toast("Registrazione non leggibile: " + (e as Error).message);
          setBusy(false);
        }
      };
      mr.current = rec;
      rec.start();
      setRec({ sec: 0 });
    } catch {
      app.toast("Consenti l'uso del microfono per registrare");
    }
  };
  const stop = () => {
    mr.current?.stop();
    setRec(null);
  };

  if (result) return <ResultView a={result.a} kind={result.kind} onBack={() => setResult(null)} />;

  const scored = history.filter((h) => h.punteggio != null).slice(0, 12).reverse();

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Laboratorio del linguaggio</h1>
      <p className="text-muted text-[14px] mt-2">Scrivi un messaggio o registra un vocale: analizzo come ti esprimi e ti mostro come lo direbbe un gentleman.</p>

      {/* parola del giorno */}
      <div className="mt-5 rounded-[22px] bg-hero text-herofg p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold flex items-center gap-2">
            <Feather size={13} /> La parola del giorno
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-[32px] font-semibold">{word.parola}</span>
            <span className="text-[12px] italic opacity-60">{word.tipo}</span>
          </div>
          <div className="text-[14px] opacity-80">{word.significato}</div>
          <div className="text-[14px] italic mt-2">"{word.esempio}"</div>
          {word.invece_di && <div className="text-[12px] text-gold mt-2">Al posto di: {word.invece_di}</div>}
        </div>
      </div>

      {/* input */}
      <section className="mt-5 rounded-[22px] bg-surface shadow-soft p-5">
        <div className="p-1 rounded-full bg-card grid grid-cols-2 gap-1">
          {(
            [
              ["scrivi", "Scrivi", <PenLine key="p" size={15} />],
              ["registra", "Registra un vocale", <Mic key="m" size={15} />],
            ] as const
          ).map(([k, l, ic]) => (
            <button key={k} onClick={() => setMode(k)} className={`h-10 rounded-full text-[13.5px] font-semibold flex items-center justify-center gap-1.5 ${mode === k ? "bg-surface shadow-soft" : "text-muted"}`}>
              {ic} {l}
            </button>
          ))}
        </div>
        <div className="mt-4 text-[12.5px] text-muted mb-2">Contesto</div>
        <div className="flex flex-wrap gap-1.5">
          {CONTESTI.map((c) => (
            <button key={c} onClick={() => setContesto(c)} className={`px-3 py-1.5 rounded-full text-[13px] border ${contesto === c ? "bg-brand text-brand-fg border-brand" : "border-line"}`}>
              {c}
            </button>
          ))}
        </div>

        {mode === "scrivi" ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Incolla qui un'email, un messaggio WhatsApp o scrivi come racconteresti qualcosa a voce…"
              className="mt-4 w-full h-40 px-4 py-3 rounded-[16px] bg-card border border-transparent focus:border-gold focus:bg-surface outline-none text-[15.5px] resize-none"
            />
            <button
              onClick={() => analyze({ text }, "testo")}
              disabled={text.trim().length < 15 || busy}
              className="mt-3 h-12 w-full rounded-full bg-brand text-brand-fg font-semibold shadow-pill flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Analizza
            </button>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center text-center">
            {busy ? (
              <>
                <Loader2 size={30} className="animate-spin text-gold" />
                <p className="text-muted text-[14px] mt-3">Ascolto e analizzo il tuo vocale…</p>
              </>
            ) : (
              <>
                <button
                  onClick={rec ? stop : start}
                  className={`h-24 w-24 rounded-full grid place-items-center transition shadow-pill ${rec ? "bg-danger text-white" : "bg-brand text-brand-fg"}`}
                  aria-label={rec ? "Ferma" : "Registra"}
                >
                  {rec ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}
                </button>
                {rec ? (
                  <div className="mt-3 font-display text-[28px] font-semibold tabular-nums">
                    {Math.floor(rec.sec / 60)}:{String(rec.sec % 60).padStart(2, "0")}
                    <span className="text-[13px] text-muted font-sans ml-2">/ 3:00</span>
                  </div>
                ) : (
                  <p className="text-[13.5px] text-muted mt-3 max-w-[340px]">
                    Parla come faresti al telefono: racconta la tua giornata, presentati, oppure prova un discorso. Fino a 3 minuti.
                  </p>
                )}
                {rec && (
                  <motion.div className="mt-2 flex gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.span key={i} className="w-1.5 rounded-full bg-gold" animate={{ height: [6, 18, 6] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }} />
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* progressi */}
      {scored.length > 1 && (
        <section className="mt-6 rounded-[22px] bg-surface shadow-soft p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">I tuoi progressi</div>
          <div className="mt-3 flex items-end gap-1.5 h-24">
            {scored.map((h) => (
              <div key={h.id} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-[4px] bg-gold" style={{ height: `${(h.punteggio! / 10) * 80}px`, opacity: 0.55 + (h.punteggio! / 10) * 0.45 }} title={`${h.punteggio}/10`} />
              </div>
            ))}
          </div>
          <div className="mt-2 text-[12px] text-muted flex justify-between">
            <span>Punteggio eleganza (ultime {scored.length} analisi)</span>
            <span>Intercalari medi: {(scored.reduce((s, h) => s + (h.intercalari || 0), 0) / scored.length).toFixed(1)}</span>
          </div>
        </section>
      )}

      {/* storico */}
      {history.length > 0 && (
        <section className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Le tue analisi
          </div>
          <div className="mt-3 rounded-[20px] bg-surface shadow-soft divide-y divide-line">
            {history.slice(0, 10).map((h) => (
              <button key={h.id} onClick={() => setResult({ a: h.analysis, kind: h.kind })} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="h-10 w-10 rounded-full bg-gold-tint text-gold grid place-items-center font-display text-[18px] font-semibold shrink-0">{h.punteggio ?? "–"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate">{h.analysis.trascrizione?.slice(0, 70) || "Analisi"}</div>
                  <div className="text-[12px] text-muted">
                    {h.kind === "vocale" ? "Vocale" : "Testo"} · {h.contesto || "—"} · {new Date(h.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* vocabolario */}
      <Vocabulary history={history} />
    </div>
  );
}

function Vocabulary({ history }: { history: LogRow[] }) {
  const learned = new Map<string, { parola: string; significato: string; esempio: string }>();
  history.forEach((h) => h.analysis.parole_nuove?.forEach((p) => learned.set(p.parola.toLowerCase(), p)));
  const list = [...learned.values()];
  const [all, setAll] = useState(false);
  return (
    <section className="mt-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Il tuo vocabolario
      </div>
      <p className="text-[13px] text-muted mt-1">Le parole suggerite nelle tue analisi, più la raccolta dell'Accademia.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[...list, ...(all ? PAROLE : PAROLE.slice(0, list.length ? 4 : 8))].map((p, i) => (
          <div key={p.parola + i} className="rounded-[16px] bg-surface shadow-soft p-3.5">
            <div className="font-display text-[20px] font-semibold">{p.parola}</div>
            <div className="text-[13px] text-muted">{p.significato}</div>
            <div className="text-[13px] italic mt-1">"{p.esempio}"</div>
          </div>
        ))}
      </div>
      {!all && (
        <button onClick={() => setAll(true)} className="mt-3 text-gold text-[13.5px] font-medium">
          Mostra tutte le {PAROLE.length} parole dell'Accademia
        </button>
      )}
    </section>
  );
}

function ResultView({ a, kind, onBack }: { a: Analysis; kind: string; onBack: () => void }) {
  const app = useApp();
  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="rounded-[20px] bg-surface shadow-soft p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-3">{title}</div>
      {children}
    </section>
  );
  const totInter = a.intercalari.reduce((s, x) => s + x.volte, 0);
  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[14px] text-muted mb-4">
        <ArrowLeft size={16} /> Laboratorio
      </button>
      <div className="rounded-[24px] bg-hero text-herofg p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <div className="h-20 w-20 rounded-full border-2 border-gold grid place-items-center shrink-0">
            <span className="font-display text-[34px] font-semibold text-gold">{a.punteggio}</span>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Eleganza · {kind === "vocale" ? "vocale" : "testo"}</div>
            <div className="text-[15px] mt-1">
              Registro <b>{a.registro?.attuale}</b>
              {a.registro?.adatto && a.registro.adatto !== a.registro.attuale ? (
                <>
                  {" "}
                  → adatto: <b>{a.registro.adatto}</b>
                </>
              ) : null}
            </div>
            <div className="text-[13px] opacity-70 mt-1">{a.registro?.commento}</div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Intercalari", totInter],
            ["Parolacce", a.parolacce || 0],
            ["Errori", a.errori.length],
          ].map(([l, n]) => (
            <div key={l as string} className="rounded-[14px] bg-white/[.06] py-2.5">
              <div className="font-display text-[24px] font-semibold">{n}</div>
              <div className="text-[11px] opacity-60">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <section className="rounded-[20px] border border-gold/40 bg-gold-tint p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">Come lo direbbe un gentleman</div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(a.versione_gentleman).then(() => app.toast("Copiato"));
              }}
              className="text-gold"
              aria-label="Copia"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-[15.5px] leading-relaxed mt-2 whitespace-pre-line">{a.versione_gentleman}</p>
        </section>

        {a.consiglio && (
          <div className="rounded-[18px] bg-hero text-herofg px-5 py-4 text-[14.5px]">
            <b className="text-gold">Il consiglio di Alfred. </b>
            {a.consiglio}
          </div>
        )}

        {a.voce && (
          <Section title="La tua voce">
            <div className="flex gap-4 text-[14px]">
              <span>
                Ritmo: <b>{a.voce.ritmo}</b>
              </span>
              <span>
                Esitazioni: <b>{a.voce.esitazioni}</b>
              </span>
            </div>
            <p className="text-[14px] text-muted mt-1.5">{a.voce.commento}</p>
          </Section>
        )}

        {a.intercalari.length > 0 && (
          <Section title="Intercalari">
            <div className="flex flex-wrap gap-2">
              {a.intercalari.map((x) => (
                <span key={x.parola} className="px-3 py-1.5 rounded-full bg-card text-[13.5px]">
                  "{x.parola}" <b className="text-gold">×{x.volte}</b>
                </span>
              ))}
            </div>
            <p className="text-[12.5px] text-muted mt-2">Il trucco: sostituisci l'intercalare con una breve pausa. Il silenzio dà autorevolezza.</p>
          </Section>
        )}

        {(a.ripetizioni.length > 0 || a.colloquialismi.length > 0 || a.anglicismi.length > 0) && (
          <Section title="Parole da migliorare">
            <div className="space-y-2 text-[14px]">
              {a.ripetizioni.map((x) => (
                <div key={"r" + x.parola}>
                  <b>{x.parola}</b> ripetuta {x.volte} volte → <span className="text-gold">{x.alternative.join(", ")}</span>
                </div>
              ))}
              {a.colloquialismi.map((x) => (
                <div key={"c" + x.espressione}>
                  <span className="line-through text-muted">{x.espressione}</span> → <span className="text-gold">{x.alternativa}</span>
                </div>
              ))}
              {a.anglicismi.map((x) => (
                <div key={"a" + x.termine}>
                  <span className="line-through text-muted">{x.termine}</span> → <span className="text-gold">{x.italiano}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {a.errori.length > 0 && (
          <Section title="Errori">
            <div className="space-y-3">
              {a.errori.map((x, i) => (
                <div key={i} className="text-[14px]">
                  <div className="flex items-start gap-2">
                    <X size={15} className="text-danger mt-0.5 shrink-0" />
                    <span className="line-through text-muted">{x.errore}</span>
                  </div>
                  <div className="flex items-start gap-2 mt-0.5">
                    <Check size={15} className="text-gold mt-0.5 shrink-0" />
                    <span>{x.correzione}</span>
                  </div>
                  <div className="text-[12.5px] text-muted ml-6">{x.spiegazione}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {a.parole_nuove.length > 0 && (
          <Section title="Tre parole nuove per te">
            <div className="space-y-3">
              {a.parole_nuove.map((p) => (
                <div key={p.parola}>
                  <div className="font-display text-[22px] font-semibold">{p.parola}</div>
                  <div className="text-[13.5px] text-muted">{p.significato}</div>
                  <div className="text-[13.5px] italic mt-0.5">"{p.esempio}"</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {a.punti_forza.length > 0 && (
          <Section title="Cosa hai fatto bene">
            <ul className="space-y-1.5">
              {a.punti_forza.map((x) => (
                <li key={x} className="flex gap-2 text-[14px]">
                  <Check size={16} className="text-gold shrink-0 mt-0.5" />
                  {x}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title={kind === "vocale" ? "Trascrizione" : "Il tuo testo"}>
          <p className="text-[14px] text-muted leading-relaxed whitespace-pre-line">{a.trascrizione}</p>
        </Section>
      </div>
    </div>
  );
}
