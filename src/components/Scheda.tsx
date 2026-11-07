import { Loader2, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { useState } from "react";

export type Fatto = { id: string; testo: string; cat: string; fonte: "ai" | "tu"; data: string };
export type SchedaData = { ritratto?: string; fatti?: Fatto[]; scartati?: string[]; aggiornata?: string };

const NOMI: Record<string, string> = {
  moda: "Moda",
  gioielli: "Gioielli",
  profumi: "Profumi",
  fiori: "Fiori",
  cibo: "Cibo e vino",
  luoghi: "Luoghi",
  passioni: "Passioni",
  esperienze: "Esperienze",
  casa: "Casa",
  carattere: "Come ama essere trattata",
  evitare: "Da evitare",
  stile: "Stile",
  gusti: "Gusti",
  abitudini: "Abitudini",
  obiettivi: "Obiettivi",
  lavoro: "Lavoro",
  vita: "Vita",
  relazioni: "Relazioni",
  consigli: "Come vuole i consigli",
  altro: "Altro",
};

const quando = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  return days < 1 ? "oggi" : days === 1 ? "ieri" : `${days} giorni fa`;
};

/**
 * Scheda interna (di una persona o dell'utente): ritratto e fatti per categoria.
 * I fatti dell'AI si possono scartare (non tornano più), quelli aggiunti a mano sono certi.
 */
export function SchedaCard({
  scheda,
  onChange,
  onRefresh,
  title,
  empty,
  catHint,
}: {
  scheda: SchedaData;
  onChange: (s: SchedaData) => void;
  onRefresh?: () => Promise<void>;
  title: string;
  empty: string;
  catHint: string;
}) {
  const [busy, setBusy] = useState(false);
  const [nuovo, setNuovo] = useState("");
  const [tutto, setTutto] = useState(false);
  const fatti = scheda.fatti || [];
  const groups = fatti.reduce<Record<string, Fatto[]>>((acc, f) => ((acc[f.cat] = [...(acc[f.cat] || []), f]), acc), {});
  const cats = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  const shown = tutto ? cats : cats.slice(0, 3);

  const scarta = (f: Fatto) =>
    onChange({ ...scheda, fatti: fatti.filter((x) => x.id !== f.id), scartati: f.fonte === "ai" ? [...(scheda.scartati || []), f.testo].slice(-80) : scheda.scartati });
  const aggiungi = () => {
    const t = nuovo.trim();
    if (!t) return;
    onChange({ ...scheda, fatti: [{ id: Math.random().toString(36).slice(2, 10), testo: t, cat: "altro", fonte: "tu", data: new Date().toISOString().slice(0, 10) }, ...fatti] });
    setNuovo("");
  };
  const refresh = async () => {
    if (!onRefresh) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[18px] bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-gold shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold">{title}</div>
          {scheda.aggiornata && <div className="text-[11.5px] text-muted">Aggiornata {quando(scheda.aggiornata)}</div>}
        </div>
        {onRefresh && (
          <button onClick={refresh} disabled={busy} className="h-8 px-3 rounded-full bg-surface text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-60" aria-label="Aggiorna la scheda">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {busy ? "Aggiorno…" : "Aggiorna"}
          </button>
        )}
      </div>

      {scheda.ritratto ? <p className="mt-3 text-[14.5px] leading-relaxed">{scheda.ritratto}</p> : <p className="mt-3 text-[13.5px] text-muted leading-relaxed">{empty}</p>}

      {shown.map((c) => (
        <div key={c} className="mt-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-[.08em] text-muted mb-1.5">{NOMI[c] || c}</div>
          <div className="flex flex-wrap gap-1.5">
            {groups[c].map((f) => (
              <span key={f.id} className={`inline-flex items-center gap-1 rounded-full pl-3 pr-1.5 py-1 text-[13px] ${f.fonte === "tu" ? "bg-gold/15" : "bg-surface"}`}>
                {f.testo}
                <button onClick={() => scarta(f)} className="h-5 w-5 grid place-items-center text-muted" aria-label={f.fonte === "ai" ? "Non è vero, togli" : "Togli"} title={f.fonte === "ai" ? "Non è vero: non lo riproporrò" : "Togli"}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
      {cats.length > 3 && (
        <button onClick={() => setTutto(!tutto)} className="mt-3 text-[13px] font-semibold text-gold">
          {tutto ? "Mostra meno" : `Mostra tutto (${fatti.length})`}
        </button>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && aggiungi()}
          placeholder={catHint}
          autoComplete="off"
          className="flex-1 min-w-0 h-10 rounded-[12px] bg-surface px-3 text-[14px] outline-none placeholder:text-muted/70"
        />
        <button onClick={aggiungi} className="h-10 w-10 rounded-[12px] bg-surface grid place-items-center shrink-0" aria-label="Aggiungi">
          <Plus size={16} />
        </button>
      </div>
      <div className="mt-2 text-[11.5px] text-muted">Tocca la × su ciò che non è vero: non verrà riproposto. Quello che scrivi tu vale come certo.</div>
    </div>
  );
}
