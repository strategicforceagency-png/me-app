import { AlfredAvatar } from "./AlfredIcon";
import { AlfredCall } from "./AlfredCall";
import { AnimatePresence, motion } from "framer-motion";
import { Eraser, Loader2, Mic, Phone, SendHorizontal, Square, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../lib/store";
import { fn, supabase, learnMe, uploadImage } from "../lib/supabase";
import { RichText } from "../screens/Academy";
import { ChevronDown, ClipboardList } from "lucide-react";

const SEGNO = "📋 **Incarico svolto**";
/** Un incarico svolto: la frase detta da Alfred resta visibile, il resoconto completo va in un riquadro da aprire. */
function dividi(text: string) {
  const i = text.indexOf(SEGNO);
  if (i < 0) return { voce: text, compito: "", dettaglio: "" };
  const resto = text.slice(i + SEGNO.length).replace(/^\s*—\s*/, "");
  const a = resto.indexOf("\n\n");
  return { voce: text.slice(0, i).trim(), compito: (a < 0 ? resto : resto.slice(0, a)).trim(), dettaglio: a < 0 ? "" : resto.slice(a + 2).trim() };
}
function AlfredText({ text }: { text: string }) {
  const [aperto, setAperto] = useState(false);
  const d = dividi(text);
  if (!d.compito) return <RichText text={text} />;
  return (
    <div>
      {d.voce ? <RichText text={d.voce} /> : <p className="text-[14.5px]">Ho finito quello che mi aveva chiesto, signore.</p>}
      <button onClick={() => setAperto(!aperto)} className="mt-2 w-full flex items-center gap-2 rounded-[12px] bg-card px-3 py-2 text-left text-[12.5px] text-muted">
        <ClipboardList size={14} className="text-gold shrink-0" />
        <span className="flex-1 min-w-0 truncate">Incarico svolto · {d.compito}</span>
        <ChevronDown size={15} className={`shrink-0 transition-transform ${aperto ? "rotate-180" : ""}`} />
      </button>
      {aperto && (
        <div className="mt-2 border-l-2 border-gold/40 pl-3 text-[14px]">
          <div className="text-[12px] text-muted mb-1.5">{d.compito}</div>
          <RichText text={d.dettaglio} />
        </div>
      )}
    </div>
  );
}

type Msg = { id?: string; role: "user" | "model"; text: string };

const SCREEN: Record<string, string> = {
  percorso: "Oggi (il suo percorso del giorno)",
  progressi: "Progressi",
  accademia: "Accademia (lezioni)",
  contenuti: "Contenuti e quaderno",
  linguaggio: "Laboratorio del linguaggio",
  profumi: "Profumi (la sua collezione e il profilo olfattivo)",
  pelletteria: "Pelletteria (borse, cinture, portafogli)",
  fisionomia: "Fisionomia (analisi del viso: taglio di capelli, barba, montature)",
  armadio: "Armadio",
  outfit: "Crea outfit",
  stile: "Ispirazioni di stile",
  budget: "Budget e acquisti",
  fisico: "Fisico e allenamento",
  salute: "Salute",
  profilo: "Profilo",
};
const SUGGESTIONS = [
  "Cosa indosso domani per una cena importante?",
  "Su cosa dovrei concentrarmi questa settimana?",
  "Come rompo il ghiaccio a un primo appuntamento?",
  "Rendi più elegante questo messaggio: …",
];

/* ---------- voce ---------- */
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void; onend: () => void; onerror: () => void };
const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
/* Lettura ad alta voce SOLO su richiesta, con la stessa voce maschile delle chiamate (Gemini TTS). */
let lettore: HTMLAudioElement | null = null;
const cache = new Map<string, string>();
const voceSubs = new Set<(k: string | null, carica: boolean) => void>();
let inLettura: string | null = null;
const avvisa = (k: string | null, carica = false) => voceSubs.forEach((f) => f(k, carica));
function wav(pcm: Uint8Array, rate = 24000) {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o: number, t: string) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  return new Blob([h.buffer, pcm], { type: "audio/wav" });
}
function ferma() {
  lettore?.pause();
  inLettura = null;
  avvisa(null);
}
async function speak(key: string, text: string, toast: (m: string) => void) {
  if (inLettura === key) return ferma();
  // il lettore si crea dentro il tocco, così iPhone permette la riproduzione anche dopo l'attesa
  if (!lettore) lettore = new Audio();
  lettore.pause();
  lettore.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
  lettore.play().catch(() => {});
  inLettura = key;
  avvisa(key, !cache.has(key));
  try {
    let url = cache.get(key);
    if (!url) {
      const r = await fn<{ mime: string; data: string }>("leggi", "", { testo: text });
      const bin = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
      const blob = /wav/i.test(r.mime) ? new Blob([bin], { type: "audio/wav" }) : wav(bin, Number(r.mime.match(/rate=(\d+)/)?.[1]) || 24000);
      url = URL.createObjectURL(blob);
      cache.set(key, url);
    }
    if (inLettura !== key) return;
    lettore.src = url;
    lettore.onended = () => ferma();
    avvisa(key, false);
    await lettore.play();
  } catch (e) {
    ferma();
    toast((e as Error).message || "Alfred non riesce a leggere adesso");
  }
}
function Ascolta({ id, text }: { id: string; text: string }) {
  const app = useApp();
  const [stato, setStato] = useState<{ k: string | null; carica: boolean }>({ k: inLettura, carica: false });
  useEffect(() => {
    const f = (k: string | null, carica: boolean) => setStato({ k, carica });
    voceSubs.add(f);
    return () => {
      voceSubs.delete(f);
    };
  }, []);
  const mio = stato.k === id;
  return (
    <button onClick={() => speak(id, text, app.toast)} className="mt-1.5 text-[11.5px] text-muted flex items-center gap-1 hover:text-gold">
      {mio && stato.carica ? <Loader2 size={12} className="animate-spin" /> : mio ? <Square size={11} /> : <Volume2 size={12} />} {mio ? (stato.carica ? "Un attimo…" : "Ferma") : "Ascolta"}
    </button>
  );
}

export function MaestroChat() {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [armed, setArmed] = useState(0);
  const faceRef = useRef<HTMLInputElement>(null);
  /** Il volto di Alfred lo sceglie l'utente: un'immagine sua, privata. */
  const changeFace = async (f?: File) => {
    if (!f) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = await uploadImage("avatars", u.user!.id, f, "alfred");
      await app.setProfile({ alfred_foto: path });
      app.toast("Il nuovo volto di Alfred è pronto");
    } catch (e) {
      app.toast((e as Error).message);
    }
  };
  const end = useRef<HTMLDivElement>(null);
  const rec = useRef<SR | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.from("maestro_messages").select("id, role, text").order("created_at", { ascending: false }).limit(60);
      setMsgs(((data as Msg[]) || []).reverse());
    } catch {
      setMsgs([]);
    }
  }, []);
  const [call, setCall] = useState(false);
  useEffect(() => {
    const f = () => load();
    // dalla notifica di un incarico svolto: si apre la chat con il resoconto
    const apri = () => {
      setOpen(true);
      load();
    };
    window.addEventListener("habitus:chat-ricarica", f);
    window.addEventListener("habitus:apri-alfred", apri);
    return () => {
      window.removeEventListener("habitus:chat-ricarica", f);
      window.removeEventListener("habitus:apri-alfred", apri);
    };
  }, [load]);
  useEffect(() => {
    // a ogni apertura si ricarica: gli incarichi svolti in background scrivono nella chat
    if (open) load();
  }, [open, load]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) {
      rec.current?.stop();
      ferma();
    }
  }, [open]);

  const send = async (q?: string) => {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    rec.current?.stop();
    setText("");
    const history = (msgs || []).slice(-12).map(({ role, text }) => ({ role, text }));
    setMsgs((m) => [...(m || []), { role: "user", text: question }]);
    setBusy(true);
    supabase.from("maestro_messages").insert({ role: "user", text: question }).then(() => {});
    try {
      const r = await fn<{ answer: string; incarichi?: { id: string; testo: string; quando: string | null }[] }>("coach", "", { question, history, context: `Schermata: ${SCREEN[app.tab] || app.tab}` });
      const inc = (r.incarichi || [])
        .map((x) => `🕰️ _Incarico preso in carico${x.quando ? ` per ${new Date(x.quando).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}: ${x.testo}. Le arriverà una notifica con l'esito._`)
        .join("\n\n");
      const testo = inc ? `${r.answer}\n\n${inc}` : r.answer;
      setMsgs((m) => [...(m || []), { role: "model", text: testo }]);
      await supabase.from("maestro_messages").insert({ role: "model", text: testo });
      // ogni 6 domande Habitus aggiorna quello che sa di te
      if (((msgs || []).filter((x) => x.role === "user").length + 1) % 6 === 0) learnMe((sc) => app.setProfile({ scheda: sc }));
    } catch (e) {
      setMsgs((m) => [...(m || []), { role: "model", text: `Non sono riuscito a rispondere: ${(e as Error).message}` }]);
    }
    setBusy(false);
  };

  const listen = () => {
    if (!SpeechRec) return app.toast("Dettatura non disponibile su questo browser: usa il microfono della tastiera");
    if (listening) {
      rec.current?.stop();
      return;
    }
    ferma();
    const r = new SpeechRec();
    r.lang = "it-IT";
    r.interimResults = true;
    r.continuous = false;
    const base = text ? text.trimEnd() + " " : "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(base + t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const clear = async () => {
    if (Date.now() - armed > 3000) {
      setArmed(Date.now());
      return app.toast("Tocca di nuovo per cancellare la conversazione");
    }
    await supabase.from("maestro_messages").delete().gte("created_at", "1970-01-01");
    setMsgs([]);
    setArmed(0);
  };

  if (app.quizOpen) return null;

  return (
    <>
      {/* pulsante */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            onClick={() => setOpen(true)}
            aria-label="Parla con Alfred"
            className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] lg:right-8 lg:bottom-8 z-[35] h-14 w-14 rounded-full shadow-dock grid place-items-center"
          >
            <AlfredAvatar size={56} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            className="fixed z-[55] inset-0 lg:inset-auto lg:right-8 lg:bottom-8 lg:h-[640px] lg:max-h-[calc(100vh-64px)] lg:w-[420px] lg:rounded-[26px] lg:shadow-dock lg:ring-1 lg:ring-line bg-bg flex flex-col overflow-hidden"
          >
            <div className="bg-hero text-herofg px-4 pb-3.5 pt-[calc(14px+env(safe-area-inset-top))] lg:pt-4 flex items-center gap-3">
              <button onClick={() => faceRef.current?.click()} className="relative shrink-0" aria-label="Cambia il volto di Alfred" title="Cambia il volto di Alfred">
                <AlfredAvatar size={40} />
              </button>
              <input ref={faceRef} type="file" accept="image/*" className="hidden" onChange={(e) => changeFace(e.target.files?.[0])} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-[20px] leading-none">Alfred</div>
                <div className="text-[12px] opacity-70 mt-1">Il suo maggiordomo personale</div>
              </div>
              <button onClick={() => setCall(true)} className="h-9 w-9 grid place-items-center rounded-full bg-gold/20 text-gold hover:bg-gold/30" aria-label="Chiama Alfred" title="Chiama Alfred">
                <Phone size={17} />
              </button>
              {!!msgs?.length && (
                <button onClick={clear} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10" aria-label="Cancella conversazione">
                  <Eraser size={17} className={armed ? "text-gold" : "opacity-70"} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10" aria-label="Chiudi">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
              {msgs === null && (
                <div className="grid place-items-center py-10 text-muted">
                  <Loader2 className="animate-spin" />
                </div>
              )}
              {msgs?.length === 0 && (
                <div className="pt-4">
                  <div className="rounded-[20px] bg-surface shadow-soft p-4 text-[14.5px] leading-relaxed">
                    {new Date().getHours() < 13 ? "Buongiorno" : "Buonasera"}, signor{app.profile?.nome ? ` ${app.profile.nome.split(" ")[0]}` : "e"}. Alfred, al suo servizio. Che si tratti di cosa indossare, di come comportarsi o di trovare le parole giuste, mi chieda pure: conosco il suo armadio, il suo percorso e, mi permetta, anche qualche sua debolezza.
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          if (s.endsWith("…")) {
                            setText(s.replace("…", ""));
                            input.current?.focus();
                          } else send(s);
                        }}
                        className="text-left rounded-full border border-line bg-surface px-4 py-2.5 text-[13.5px] hover:border-gold"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs?.map((m, i) =>
                m.role === "user" ? (
                  <div key={m.id || i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-brand text-brand-fg px-3.5 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  </div>
                ) : (
                  <div key={m.id || i} className="flex gap-2">
                    <AlfredAvatar size={28} className="shrink-0 mt-0.5" />
                    <div className="max-w-[88%] rounded-[18px] rounded-tl-[6px] bg-surface shadow-soft px-3.5 py-2.5 text-[14.5px] leading-relaxed">
                      <AlfredText text={m.text} />
                      <Ascolta id={m.id || String(i)} text={dividi(m.text).voce || m.text} />
                    </div>
                  </div>
                ),
              )}
              {busy && (
                <div className="flex gap-2 items-center text-muted text-[13px]">
                  <AlfredAvatar size={28} className="shrink-0" />
                  <span className="flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-gold" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.2 }} />
                    ))}
                  </span>
                </div>
              )}
              <div ref={end} />
            </div>

            <div className="border-t border-line bg-surface px-3 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
              {listening && <div className="text-[12px] text-gold px-2 pb-1.5">Ti ascolto… tocca di nuovo il microfono per fermare</div>}
              <div className="flex items-end gap-2">
                <button onClick={listen} className={`h-11 w-11 rounded-full grid place-items-center shrink-0 transition ${listening ? "bg-gold text-ongold animate-pulse" : "bg-card"}`} aria-label="Detta">
                  <Mic size={19} />
                </button>
                <textarea
                  ref={input}
                  value={text}
                  rows={1}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(140, e.target.scrollHeight) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Scrivi o detta ad Alfred…"
                  className="flex-1 min-h-[44px] max-h-[140px] resize-none rounded-[22px] bg-card px-4 py-2.5 text-[16px] outline-none focus:ring-1 focus:ring-gold"
                />
                <button onClick={() => send()} disabled={!text.trim() || busy} className="h-11 w-11 rounded-full bg-brand text-brand-fg grid place-items-center shrink-0 disabled:opacity-40" aria-label="Invia">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AlfredCall open={call} onClose={() => setCall(false)} />
    </>
  );
}
