import { AlertTriangle, Camera, Check, ClipboardCopy, ExternalLink, Gift, Globe, Loader2, RefreshCw, Scissors, ShoppingBag, Sparkles, Tag, WashingMachine } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../lib/store";
import { ai, fn, Garment, Revisione, STAGIONI, stagioniDi, uploadImage } from "../lib/supabase";
import { GarmentImg, PrimaryButton, Sheet } from "./ui";

const VERDETTO = {
  tieni: { label: "Da tenere", cls: "bg-card text-muted" },
  rivedi: { label: "Da rivedere", cls: "bg-gold-tint text-gold" },
  vendi: { label: "Da vendere", cls: "bg-brand-soft text-gold" },
  regala: { label: "Da regalare", cls: "bg-danger-tint text-danger" },
} as const;
export const nomeStagione = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const copia = async (t: string, app: ReturnType<typeof useApp>) => {
  try {
    await navigator.clipboard.writeText(t);
    app.toast("Copiato");
  } catch {
    app.toast("Copia non riuscita");
  }
};

/* ------------------------- etichetta del capo ------------------------- */
export function EtichettaCard({ g }: { g: Garment }) {
  const app = useApp();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const e = g.etichetta;
  const leggi = async (f: File | undefined) => {
    if (!f || !app.uid) return;
    setBusy(true);
    try {
      const path = await uploadImage("garments", app.uid, f, "etichetta");
      await fn("armadio", "", { action: "etichetta", id: g.id, path });
      await app.reload();
      app.toast("Etichetta letta");
    } catch (er) {
      app.toast((er as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="rounded-[20px] bg-card p-4">
      <div className="flex items-center gap-2">
        <Tag size={17} className="text-gold" />
        <div className="font-semibold flex-1">Etichetta e cura</div>
        <button onClick={() => ref.current?.click()} disabled={busy} className="text-[13px] text-gold font-medium flex items-center gap-1">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {e ? "Rifotografa" : "Fotografa"}
        </button>
        <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={(ev) => leggi(ev.target.files?.[0])} />
      </div>
      {!e ? (
        <p className="text-[14px] text-muted mt-2">
          Fotografi l'etichetta interna: capirò il tessuto, in che stagione metterlo, quando e come indossarlo e come lavarlo.
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-[14px]">
          <div className="flex flex-wrap gap-1.5">
            {e.composizione && <span className="px-2.5 py-1 rounded-full bg-surface">{e.composizione}</span>}
            {e.peso && <span className="px-2.5 py-1 rounded-full bg-surface">Peso {e.peso}</span>}
            {e.made_in && <span className="px-2.5 py-1 rounded-full bg-surface">Made in {e.made_in}</span>}
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted mb-1">Stagioni</div>
            <div className="flex gap-1.5">
              {STAGIONI.map((s) => (
                <span key={s} className={`px-2.5 py-1 rounded-full text-[13px] ${stagioniDi(g).includes(s) ? "bg-brand text-brand-fg" : "bg-surface text-muted"}`}>
                  {nomeStagione(s)}
                </span>
              ))}
            </div>
            {e.temperature && <div className="text-muted mt-1">{e.temperature}</div>}
          </div>
          {(e.quando?.length || e.come) && (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted mb-1">Quando e come</div>
              {e.quando?.length ? <div>{e.quando.join(" · ")}</div> : null}
              {e.come && <p className="text-muted mt-0.5">{e.come}</p>}
            </div>
          )}
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted mb-1 flex items-center gap-1">
              <WashingMachine size={13} /> Lavaggio
            </div>
            {e.lavaggio && <p>{e.lavaggio}</p>}
            {e.simboli?.length ? (
              <ul className="mt-1.5 space-y-1">
                {e.simboli.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium shrink-0">{s.simbolo}</span>
                    <span className="text-muted">{s.significato}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {e.asciugatura && <p className="mt-1.5"><b>Asciugatura:</b> {e.asciugatura}</p>}
            {e.stiro && <p><b>Stiro:</b> {e.stiro}</p>}
            {e.frequenza && <p><b>Quanto spesso:</b> {e.frequenza}</p>}
            {e.conservazione && <p><b>Come riporlo:</b> {e.conservazione}</p>}
            {e.da_evitare?.length ? <p className="text-danger mt-1">Da evitare: {e.da_evitare.join("; ")}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- trovalo online --------------------------- */
export function OnlineCard({ g }: { g: Garment }) {
  const app = useApp();
  const [busy, setBusy] = useState<"" | "trova" | "foto">("");
  const o = g.online;
  const trova = async () => {
    setBusy("trova");
    try {
      await fn("armadio", "", { action: "trova", id: g.id });
      await app.reload();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy("");
  };
  const usaFoto = async () => {
    setBusy("foto");
    try {
      await fn("armadio", "", { action: "usa_foto", id: g.id });
      await ai({ action: "recut", id: g.id }).catch(() => null);
      await app.reload();
      app.toast("Foto ufficiale impostata");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy("");
  };
  return (
    <div className="rounded-[20px] bg-card p-4">
      <div className="flex items-center gap-2">
        <Globe size={17} className="text-gold" />
        <div className="font-semibold flex-1">Il modello online</div>
        <button onClick={trova} disabled={!!busy} className="text-[13px] text-gold font-medium flex items-center gap-1">
          {busy === "trova" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {o ? "Cerca di nuovo" : "Cercalo"}
        </button>
      </div>
      {!o ? (
        <p className="text-[14px] text-muted mt-2">Cerco il prodotto esatto sui siti ufficiali: la foto da catalogo, il prezzo e la scheda.</p>
      ) : (
        <div className="mt-3 flex gap-3">
          {o.immagine && <img src={o.immagine} referrerPolicy="no-referrer" className="h-24 w-20 rounded-xl object-cover bg-surface shrink-0" />}
          <div className="flex-1 min-w-0 text-[14px]">
            <div className="font-semibold leading-tight">{o.nome || "Non trovato con certezza"}</div>
            <div className="text-muted">
              {[o.marca, o.prezzo, o.certezza && `certezza ${o.certezza}`].filter(Boolean).join(" · ")}
            </div>
            {o.descrizione && <p className="text-muted mt-1 line-clamp-3">{o.descrizione}</p>}
            {o.nota && <p className="text-muted mt-1 italic">{o.nota}</p>}
            <div className="flex gap-3 mt-2">
              {o.link && (
                <a href={o.link} target="_blank" className="text-gold font-medium flex items-center gap-1">
                  Apri <ExternalLink size={13} />
                </a>
              )}
              {o.immagine && (
                <button onClick={usaFoto} disabled={!!busy} className="text-gold font-medium flex items-center gap-1">
                  {busy === "foto" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Usa questa foto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- stato del capo --------------------------- */
export function ValutazioneBadge({ g }: { g: Garment }) {
  const v = g.valutazione;
  if (!v || v.verdetto === "tieni") return null;
  const m = VERDETTO[v.verdetto];
  return (
    <div className={`rounded-2xl px-3.5 py-2.5 text-[14px] flex gap-2 ${m.cls}`}>
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>
        <b>{m.label}.</b> {v.motivo}
      </div>
    </div>
  );
}

/* ---------------------------- revisione ---------------------------- */
export function RevisioneCard({ onOpen }: { onOpen: () => void }) {
  const app = useApp();
  const r = app.profile?.armadio_revisione;
  const n = r?.capi.filter((c) => c.verdetto !== "tieni").length || 0;
  const giorni = r ? Math.max(0, Math.floor((Date.now() - new Date(r.data).getTime()) / 86400000)) : null;
  if (!app.garments.length) return null;
  return (
    <button onClick={onOpen} className="mt-4 w-full text-left rounded-[20px] bg-surface shadow-soft p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-2xl bg-gold-tint text-gold grid place-items-center shrink-0">
        <Scissors size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">Revisione dell'armadio</div>
        <div className="text-[13px] text-muted">
          {r ? `${giorni === 0 ? "Oggi" : `${giorni} giorni fa`} · ${n ? `${n} capi da sistemare` : "tutto in ordine"} · prossima tra ${Math.max(0, 15 - (giorni || 0))} giorni` : "Alfred controlla ogni 15 giorni cosa tenere, vendere o regalare"}
        </div>
      </div>
      {n > 0 && <span className="h-6 min-w-6 px-1.5 rounded-full bg-brand text-brand-fg text-[12px] font-semibold grid place-items-center">{n}</span>}
    </button>
  );
}

export function RevisioneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const r = app.profile?.armadio_revisione as Revisione | null | undefined;
  const byId = new Map(app.garments.map((g) => [g.id, g]));
  const avvia = async () => {
    setBusy(true);
    try {
      await fn("armadio", "", { action: "revisione" });
      await app.reload();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  const segna = async (id: string, stato: "venduto" | "regalato" | "in_vendita" | "attivo") => {
    const { supabase } = await import("../lib/supabase");
    await supabase.from("garments").update({ stato, ...(stato === "attivo" ? { valutazione: null } : {}) }).eq("id", id);
    await app.reload();
    app.toast(stato === "venduto" ? "Segnato come venduto" : stato === "regalato" ? "Segnato come regalato" : stato === "in_vendita" ? "Segnato come in vendita" : "Lo tiene");
  };
  const capi = (r?.capi || []).filter((c) => c.verdetto !== "tieni");
  return (
    <Sheet open={open} onClose={onClose} title="Revisione dell'armadio" full>
      {busy ? (
        <div className="py-16 flex flex-col items-center text-center text-muted gap-3">
          <Loader2 className="animate-spin text-gold" />
          <p className="text-[14px] max-w-[280px]">Alfred sta esaminando ogni capo e cercando sostituti e prezzi dell'usato. Ci vuole un paio di minuti.</p>
        </div>
      ) : !r ? (
        <div className="py-10 text-center">
          <p className="text-muted text-[15px]">Ogni 15 giorni Alfred ricontrolla l'armadio: cosa non le sta più, cosa è fuori moda o fuori dal suo stile, cosa vendere su Vinted (con annuncio e prezzo) e cosa regalare. E le trova il sostituto.</p>
          <PrimaryButton className="mt-6 mx-auto" onClick={avvia}>
            <Sparkles size={18} /> Fai ora la prima revisione
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-5 pb-6">
          <p className="text-[15px]">{r.sintesi}</p>
          {Object.keys(r.stagioni || {}).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {STAGIONI.map((s) =>
                r.stagioni[s] ? (
                  <div key={s} className="rounded-2xl bg-card p-3 text-[13px]">
                    <div className="font-semibold mb-0.5">{nomeStagione(s)}</div>
                    <div className="text-muted">{r.stagioni[s]}</div>
                  </div>
                ) : null,
              )}
            </div>
          )}
          {r.mancano?.length > 0 && (
            <div className="rounded-2xl bg-gold-tint p-3.5 text-[14px]">
              <div className="font-semibold text-gold mb-1">Cosa manca</div>
              <ol className="list-decimal pl-5 space-y-0.5">{r.mancano.map((m, i) => <li key={i}>{m}</li>)}</ol>
            </div>
          )}
          {capi.length === 0 && <p className="text-muted text-center py-4">Nessun capo da togliere. Tutto in ordine, Signore.</p>}
          {capi.map((c) => {
            const g = byId.get(c.id);
            const m = VERDETTO[c.verdetto];
            return (
              <div key={c.id} className="rounded-[22px] bg-surface shadow-soft p-4 space-y-3">
                <div className="flex gap-3">
                  {g && (
                    <div className="h-20 w-16 rounded-xl bg-card p-1.5 shrink-0">
                      <GarmentImg g={g} className="w-full h-full" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold leading-tight">{g?.nome || c.nome || "Capo"}</div>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${m.cls}`}>{m.label}</span>
                    <p className="text-[14px] text-muted mt-1.5">{c.motivo}</p>
                  </div>
                </div>
                {c.errore && <p className="text-[13px] text-muted">Ricerca non riuscita: {c.errore}</p>}
                {c.cosa_fare && <p className="text-[14px]"><b>Cosa fare:</b> {c.cosa_fare}</p>}
                {c.vinted && (
                  <div className="rounded-2xl bg-card p-3.5 text-[14px] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={15} className="text-gold" />
                      <div className="font-semibold flex-1">Annuncio Vinted</div>
                      <div className="font-semibold">{c.vinted.prezzo}</div>
                    </div>
                    {c.vinted.prezzo_minimo && <div className="text-[13px] text-muted">Non scenda sotto {c.vinted.prezzo_minimo}. {c.vinted.simili}</div>}
                    <button onClick={() => copia(c.vinted!.titolo, app)} className="w-full text-left rounded-xl bg-surface px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted flex items-center gap-1">Titolo <ClipboardCopy size={11} /></div>
                      {c.vinted.titolo}
                    </button>
                    <button onClick={() => copia(c.vinted!.descrizione, app)} className="w-full text-left rounded-xl bg-surface px-3 py-2 whitespace-pre-line">
                      <div className="text-[11px] uppercase tracking-wide text-muted flex items-center gap-1">Descrizione <ClipboardCopy size={11} /></div>
                      {c.vinted.descrizione}
                    </button>
                    <div className="text-[13px] text-muted">
                      {[c.vinted.categoria, c.vinted.condizione].filter(Boolean).join(" · ")}
                      {c.vinted.consigli ? ` — ${c.vinted.consigli}` : ""}
                    </div>
                  </div>
                )}
                {c.sostituto && (
                  <div className="text-[14px]">
                    <div className="font-semibold">Il sostituto</div>
                    <p className="text-muted">{c.sostituto.cosa}. {c.sostituto.perche}</p>
                    <div className="mt-2 space-y-1.5">
                      {c.sostituto.opzioni.map((o, i) => (
                        <a
                          key={i}
                          href={o.link || `https://www.google.com/search?q=${encodeURIComponent(o.ricerca || `${o.nome} ${o.marca || ""}`)}`}
                          target="_blank"
                          className="flex items-center gap-2 rounded-xl bg-card px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{o.nome}{o.marca ? ` – ${o.marca}` : ""}</div>
                            <div className="text-[12.5px] text-muted truncate">{[o.tipo, o.dove].filter(Boolean).join(" · ")}</div>
                          </div>
                          <div className="font-semibold shrink-0">{o.prezzo}</div>
                          <ExternalLink size={14} className="text-gold shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {c.verdetto === "vendi" && g?.stato !== "in_vendita" && (
                    <button onClick={() => segna(c.id, "in_vendita")} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium">Messo in vendita</button>
                  )}
                  <button onClick={() => segna(c.id, "venduto")} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium flex items-center gap-1">
                    <Check size={14} /> Venduto
                  </button>
                  <button onClick={() => segna(c.id, "regalato")} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium flex items-center gap-1">
                    <Gift size={14} /> Regalato
                  </button>
                  <button onClick={() => segna(c.id, "attivo")} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium text-muted">Lo tengo</button>
                </div>
              </div>
            );
          })}
          <p className="text-[12.5px] text-muted text-center">Ultima revisione {new Date(r.data).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} · si ripete da sola ogni 15 giorni</p>
          <button onClick={avvia} className="w-full h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2">
            <RefreshCw size={15} /> Rifai la revisione adesso
          </button>
        </div>
      )}
    </Sheet>
  );
}
