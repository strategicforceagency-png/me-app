/** Calcoli della sezione Salute: prontezza, debito di sonno, ora consigliata per andare a letto.
 *  La stessa logica è replicata nella funzione promemoria per le notifiche. */
export type Pt = { day: string; value: number; extra?: Record<string, number | string> | null };

export const SONNO_OBIETTIVO = 7.5;
export const PASSI_OBIETTIVO = 10000;
export const LUCE_OBIETTIVO_MIN = 30;
export const ESERCIZIO_OBIETTIVO = 30;

const median = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/** Ultimo valore e mediana dei 30 giorni precedenti (esclude l'ultimo). */
export function vsBase(rows: Pt[] | undefined) {
  if (!rows?.length) return null;
  const last = rows[rows.length - 1];
  const prev = rows.slice(-31, -1).map((r) => r.value);
  return { last, base: prev.length >= 5 ? median(prev) : NaN };
}

/** Prontezza 0-100 da sonno (40%), HRV (35%) e FC a riposo (25%) rispetto alla tua media. */
export function prontezza(sleep?: Pt[], hrv?: Pt[], rhr?: Pt[]) {
  const s = sleep?.[sleep.length - 1];
  const h = vsBase(hrv);
  const r = vsBase(rhr);
  const parts: { w: number; v: number }[] = [];
  if (s) parts.push({ w: 0.4, v: clamp((s.value / SONNO_OBIETTIVO) * 100) });
  if (h && isFinite(h.base)) parts.push({ w: 0.35, v: clamp(60 + ((h.last.value - h.base) / h.base) * 200) });
  if (r && isFinite(r.base)) parts.push({ w: 0.25, v: clamp(60 + (r.base - r.last.value) * 6) });
  if (!parts.length) return null;
  const tot = parts.reduce((a, p) => a + p.w, 0);
  return Math.round(parts.reduce((a, p) => a + p.v * p.w, 0) / tot);
}

export function consiglio(score: number, sleepH?: number, rhrDelta?: number) {
  if (score >= 70) return { titolo: "Pronto a spingere", testo: "Hai recuperato bene: giornata buona per un allenamento intenso o un impegno importante." };
  if (score >= 45) {
    const extra = sleepH != null && sleepH < 6 ? " Hai dormito poco: niente caffè dopo le 14 e stasera a letto prima." : "";
    return { titolo: "Giornata moderata", testo: `Allenati pure, ma senza cercare il massimo.${extra}` };
  }
  const why = rhrDelta != null && rhrDelta >= 5 ? "Battito a riposo più alto del solito: " : "";
  return { titolo: "Giornata di recupero", testo: `${why}meglio camminata, mobilità e acqua. Stasera a letto presto, niente alcol.` };
}

/** Debito di sonno degli ultimi 7 giorni rispetto all'obiettivo. */
export function debito(sleep?: Pt[]) {
  const w = (sleep || []).slice(-7);
  return w.reduce((a, r) => a + Math.max(0, SONNO_OBIETTIVO - r.value), 0);
}

const minOf = (iso: string) => {
  const m = /(\d{2}):(\d{2})/.exec(iso.slice(11));
  return m ? +m[1] * 60 + +m[2] : NaN;
};
export const hhmm = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/** Orari medi di addormentamento e risveglio (ultime 2 settimane) e ora consigliata per andare a letto. */
export function orari(sleep?: Pt[]) {
  const w = (sleep || []).slice(-14).filter((r) => r.extra?.start && r.extra?.end);
  if (w.length < 3) return null;
  const wake = median(w.map((r) => minOf(String(r.extra!.end))));
  // addormentamento: porta le ore dopo mezzanotte oltre 1440 per fare la media
  const bed = median(w.map((r) => { const m = minOf(String(r.extra!.start)); return m < 720 ? m + 1440 : m; }));
  let target = wake - SONNO_OBIETTIVO * 60 - 15; // 15 minuti per addormentarsi
  target = Math.round(target / 15) * 15;
  // tra le 22:30 e l'1:00
  const t = target < 720 ? target + 1440 : target;
  const clampT = Math.max(22.5 * 60, Math.min(25 * 60, t));
  return { sveglia: hhmm(wake), addormentamento: hhmm(bed), letto: hhmm(clampT), lettoMin: clampT % 1440 };
}

/** time_in_daylight arriva in ore (valori piccoli) o in minuti. */
export const luceMin = (v: number) => (v <= 24 ? v * 60 : v);
