import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, LockOpen, Mic, MicOff, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { AlfredAvatar } from "./AlfredIcon";

/**
 * Telefonata con Alfred: microfono → Gemini Live (audio a 16 kHz) → voce di Alfred (24 kHz).
 * La trascrizione finisce nella chat, così Alfred ricorda anche quello che vi siete detti a voce.
 */
type Stato = "chiamo" | "linea" | "ascolto" | "parla" | "errore" | "fine";

const WS = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

const WORKLET = `class Mic extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('habitus-mic',Mic)`;

function toB64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b: string) {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** Float32 a qualsiasi frequenza → PCM 16 bit a 16 kHz. */
function toPcm16(f: Float32Array, rate: number) {
  const ratio = rate / 16000;
  const n = Math.floor(f.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, f[Math.floor(i * ratio)]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

export function AlfredCall({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stato, setStato] = useState<Stato>("chiamo");
  const [errore, setErrore] = useState("");
  const [muto, setMuto] = useState(false);
  const [sec, setSec] = useState(0);
  const [sottotitolo, setSottotitolo] = useState("");
  const [livello, setLivello] = useState(0);
  const r = useRef<{
    ws?: WebSocket;
    inCtx?: AudioContext;
    outCtx?: AudioContext;
    stream?: MediaStream;
    node?: AudioWorkletNode;
    next: number;
    sources: AudioBufferSourceNode[];
    buf: Float32Array[];
    bufLen: number;
    muto: boolean;
    pronto: boolean;
    tIn: string;
    tOut: string;
    chiuso: boolean;
    riservata: boolean;
    model: string;
    escludi: string[];
    altri: number;
  }>({ next: 0, sources: [], buf: [], bufLen: 0, muto: false, pronto: false, tIn: "", tOut: "", chiuso: false, riservata: false, model: "", escludi: [], altri: 0 });
  const [riservata, setRiservata] = useState(() => {
    try {
      return localStorage.getItem("habitus-chiamata-riservata") === "1";
    } catch {
      return false;
    }
  });
  r.current.riservata = riservata;
  const toggleRiservata = () => {
    const v = !riservata;
    setRiservata(v);
    r.current.riservata = v;
    if (v) {
      r.current.tIn = "";
      r.current.tOut = "";
    }
    try {
      localStorage.setItem("habitus-chiamata-riservata", v ? "1" : "0");
    } catch {
      /* */
    }
  };

  const salvaTurno = () => {
    const s = r.current;
    const rows = [];
    if (s.tIn.trim()) rows.push({ role: "user", text: `🎙️ ${s.tIn.trim()}` });
    if (s.tOut.trim()) rows.push({ role: "model", text: s.tOut.trim() });
    s.tIn = "";
    s.tOut = "";
    // chiamata riservata: niente viene salvato
    if (rows.length && !s.riservata) supabase.from("maestro_messages").insert(rows).then(() => {});
  };

  const chiudi = () => {
    const s = r.current;
    if (s.chiuso) return;
    s.chiuso = true;
    salvaTurno();
    try {
      s.ws?.close();
    } catch {
      /* */
    }
    s.stream?.getTracks().forEach((t) => t.stop());
    s.node?.disconnect();
    s.sources.forEach((x) => {
      try {
        x.stop();
      } catch {
        /* */
      }
    });
    s.inCtx?.close().catch(() => {});
    s.outCtx?.close().catch(() => {});
    window.dispatchEvent(new Event("habitus:chat-ricarica"));
  };

  const fermaVoce = () => {
    const s = r.current;
    s.sources.forEach((x) => {
      try {
        x.stop();
      } catch {
        /* */
      }
    });
    s.sources = [];
    s.next = 0;
  };

  const suona = (b64: string, mime: string) => {
    const s = r.current;
    const ctx = s.outCtx!;
    const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000);
    const bytes = fromB64(b64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const ab = ctx.createBuffer(1, pcm.length, rate);
    const ch = ab.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = ctx.createBufferSource();
    src.buffer = ab;
    src.connect(ctx.destination);
    const t = Math.max(ctx.currentTime + 0.02, s.next);
    src.start(t);
    s.next = t + ab.duration;
    s.sources.push(src);
    setStato("parla");
    src.onended = () => {
      s.sources = s.sources.filter((x) => x !== src);
      if (!s.sources.length && !s.chiuso) setStato("ascolto");
    };
  };

  const avvia = async (retry = false) => {
    const s = r.current;
    if (!retry) s.escludi = [];
    s.chiuso = false;
    s.pronto = false;
    setStato("chiamo");
    setErrore("");
    setSec(0);
    setSottotitolo("");
    try {
      // i contesti audio si creano subito, dentro il tocco (iPhone lo richiede)
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      s.outCtx = new AC({ sampleRate: 24000 });
      try {
        s.inCtx = new AC({ sampleRate: 16000 });
      } catch {
        s.inCtx = new AC();
      }
      await Promise.all([s.outCtx.resume(), s.inCtx.resume()]);
      s.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      const { token, setup, model, altri } = await fn<{ token: string; setup: unknown; model: string; altri: number }>("voce", "", { escludi: s.escludi });
      s.model = model;
      s.altri = altri;
      if (s.chiuso) return;

      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await s.inCtx.audioWorklet.addModule(url);
      const srcNode = s.inCtx.createMediaStreamSource(s.stream);
      s.node = new AudioWorkletNode(s.inCtx, "habitus-mic");
      srcNode.connect(s.node);
      const rate = s.inCtx.sampleRate;
      s.node.port.onmessage = (e) => {
        const f = e.data as Float32Array;
        let peak = 0;
        for (let i = 0; i < f.length; i += 8) peak = Math.max(peak, Math.abs(f[i]));
        setLivello((l) => l * 0.7 + peak * 0.3);
        if (!s.pronto || s.muto || s.ws?.readyState !== 1) return;
        s.buf.push(f);
        s.bufLen += f.length;
        if (s.bufLen >= rate * 0.1) {
          const all = new Float32Array(s.bufLen);
          let o = 0;
          for (const b of s.buf) {
            all.set(b, o);
            o += b.length;
          }
          s.buf = [];
          s.bufLen = 0;
          s.ws!.send(JSON.stringify({ realtimeInput: { audio: { data: toB64(toPcm16(all, rate)), mimeType: "audio/pcm;rate=16000" } } }));
        }
      };

      const ws = new WebSocket(`${WS}?access_token=${encodeURIComponent(token)}`);
      s.ws = ws;
      ws.onopen = () => ws.send(JSON.stringify({ setup }));
      ws.onmessage = async (ev) => {
        const txt = typeof ev.data === "string" ? ev.data : await (ev.data as Blob).text();
        // deno-lint-ignore no-explicit-any
        let m: any;
        try {
          m = JSON.parse(txt);
        } catch {
          return;
        }
        if (m.setupComplete) {
          s.pronto = true;
          setStato("linea");
          // Alfred risponde per primo, come al telefono
          ws.send(JSON.stringify({ realtimeInput: { text: "(Il Signore ha appena chiamato. Rispondi al telefono.)" } }));
          return;
        }
        const sc = m.serverContent;
        if (!sc) {
          if (m.goAway) setSottotitolo("La linea sta per chiudersi…");
          return;
        }
        if (sc.interrupted) fermaVoce();
        for (const p of sc.modelTurn?.parts || []) if (p.inlineData?.data) suona(p.inlineData.data, p.inlineData.mimeType || "");
        if (sc.inputTranscription?.text) {
          s.tIn += sc.inputTranscription.text;
          setSottotitolo("");
        }
        if (sc.outputTranscription?.text) {
          s.tOut += sc.outputTranscription.text;
          setSottotitolo(s.tOut.slice(-160));
        }
        if (sc.turnComplete) salvaTurno();
      };
      ws.onerror = () => {
        if (!s.chiuso) {
          setErrore("La linea è caduta.");
          setStato("errore");
        }
      };
      ws.onclose = (e) => {
        if (s.chiuso) return;
        // quota finita su questa linea: si prova subito la successiva
        if (!s.pronto && /exhaust|quota|RESOURCE|not found|not supported|unavailable/i.test(e.reason || "") && s.altri > 0) {
          s.escludi = [...s.escludi, s.model];
          chiudi();
          setSottotitolo("Linea occupata, provo un'altra linea…");
          setTimeout(() => avvia(true), 300);
          return;
        }
        setErrore(
          /exhaust|quota|RESOURCE/i.test(e.reason || "")
            ? "Alfred ha esaurito i minuti gratuiti di Google per ora. Riprovi più tardi, oppure attivi la fatturazione su Google AI Studio per chiamarlo senza limiti."
            : e.reason
              ? `Linea chiusa: ${e.reason}`
              : "La chiamata è terminata.",
        );
        setStato(e.code === 1000 ? "fine" : "errore");
        chiudi();
      };
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setErrore(/Permission|NotAllowed/i.test(msg) ? "Serve il permesso del microfono: consentilo nelle impostazioni e riprova." : msg);
      setStato("errore");
      chiudi();
    }
  };

  useEffect(() => {
    if (!open) return;
    avvia();
    return () => chiudi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !["linea", "ascolto", "parla"].includes(stato)) return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [open, stato === "chiamo" || stato === "errore" || stato === "fine"]);

  const toggleMuto = () => {
    r.current.muto = !r.current.muto;
    setMuto(r.current.muto);
  };
  const fine = () => {
    chiudi();
    onClose();
  };

  const parla = stato === "parla";
  const label =
    stato === "chiamo" ? "Chiamo Alfred…" : stato === "parla" ? "Alfred sta parlando" : stato === "errore" ? "Chiamata non riuscita" : stato === "fine" ? "Chiamata terminata" : muto ? "Microfono spento" : "La ascolto";
  const mm = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-hero text-herofg flex flex-col items-center px-6 pt-[calc(48px+env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]">
          <div className="text-[13px] uppercase tracking-[0.2em] text-gold/80">Habitus</div>
          <div className="font-display text-[34px] mt-2">Alfred</div>
          <div className="text-[14px] opacity-75 mt-1">{label}{["linea", "ascolto", "parla"].includes(stato) ? ` · ${mm}` : ""}</div>

          <div className="flex-1 grid place-items-center w-full">
            <div className="relative grid place-items-center">
              {/* anelli: pulsano quando parla Alfred o quando parli tu */}
              <motion.div className="absolute rounded-full border border-gold/40" style={{ width: 230, height: 230 }} animate={{ scale: parla ? [1, 1.12, 1] : 1 + Math.min(livello * 3, 0.15), opacity: parla ? [0.7, 0.2, 0.7] : 0.5 }} transition={parla ? { repeat: Infinity, duration: 1.4 } : { duration: 0.1 }} />
              <motion.div className="absolute rounded-full border border-gold/20" style={{ width: 290, height: 290 }} animate={{ scale: parla ? [1, 1.08, 1] : 1, opacity: parla ? [0.5, 0.1, 0.5] : 0.3 }} transition={parla ? { repeat: Infinity, duration: 1.8, delay: 0.2 } : { duration: 0.2 }} />
              <AlfredAvatar size={180} />
              {stato === "chiamo" && <Loader2 className="absolute -bottom-12 animate-spin text-gold" />}
            </div>
          </div>

          <div className="min-h-[72px] max-w-[440px] text-center text-[15px] leading-relaxed opacity-85 italic">{stato === "errore" ? errore : sottotitolo}</div>

          <div className="mt-6 flex items-center gap-8">
            {stato === "errore" || stato === "fine" ? (
              <>
                <button onClick={() => avvia()} className="h-16 px-6 rounded-full bg-gold text-hero font-semibold">
                  Richiama
                </button>
                <button onClick={onClose} className="h-16 px-6 rounded-full bg-white/10 font-semibold">
                  Chiudi
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleMuto} className={`h-16 w-16 rounded-full grid place-items-center ${muto ? "bg-white text-hero" : "bg-white/10"}`} aria-label={muto ? "Riaccendi il microfono" : "Spegni il microfono"}>
                  {muto ? <MicOff size={26} /> : <Mic size={26} />}
                </button>
                <button onClick={fine} className="h-[72px] w-[72px] rounded-full bg-[#d64545] text-white grid place-items-center shadow-dock" aria-label="Riaggancia">
                  <PhoneOff size={30} />
                </button>
              </>
            )}
          </div>
          <button onClick={toggleRiservata} className={`mt-5 h-10 px-4 rounded-full text-[13px] font-semibold flex items-center gap-2 ${riservata ? "bg-gold text-hero" : "bg-white/10"}`} aria-pressed={riservata}>
            {riservata ? <Lock size={15} /> : <LockOpen size={15} />} Chiamata riservata {riservata ? "attiva" : ""}
          </button>
          <div className="mt-2 text-[11.5px] opacity-60 text-center max-w-[320px]">{riservata ? "Niente di questa chiamata viene salvato nella chat né usato per la tua scheda." : "Quello che vi dite resta nella chat di Alfred."}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
