export type PillarId = "stile" | "portamento" | "linguaggio" | "fisico" | "salute" | "grooming" | "mente";
export const PILLARS: { id: PillarId; nome: string }[] = [
  { id: "stile", nome: "Stile" },
  { id: "portamento", nome: "Portamento e galateo" },
  { id: "linguaggio", nome: "Linguaggio e conversazione" },
  { id: "fisico", nome: "Fisico" },
  { id: "salute", nome: "Salute" },
  { id: "grooming", nome: "Grooming" },
  { id: "mente", nome: "Mente e cultura" },
];

export type Habit = { id: string; titolo: string; pilastro: PillarId; quando: string; dalla_settimana?: number; minimo?: string };
export type Trial = { id: string; settimana: number; pilastro: PillarId; titolo: string; dettaglio: string; criteri: string[] };
/** Abitudini attive nella settimana (si aggiungono gradualmente). */
export const activeHabits = (p: Path, week: number) => p.abitudini.filter((h) => (h.dalla_settimana || 1) <= week);

export type Exercise = { nome: string; serie: number; ripetizioni: string; recupero_s: number; note?: string };
export type Session = { giorno: string; nome: string; durata_min: number; riscaldamento?: string; esercizi: Exercise[]; defaticamento?: string };

export type Path = {
  archetipo: { nome: string; descrizione: string; motto: string; icone: string[] };
  ritratto: string;
  pilastri: { id: PillarId; punteggio: number; diagnosi: string; obiettivo: string; priorita: number }[];
  fasi: { nome: string; da: number; a: number; focus: string }[];
  settimane: { n: number; tema: string; missioni: { id: string; pilastro: PillarId; titolo: string; dettaglio: string; lezione?: string | null }[] }[];
  abitudini: Habit[];
  prove?: Trial[];
  adattamenti?: { settimana: number; nota: string; data: string }[];
  allenamento: { obiettivo: string; sessioni: Session[]; progressione: string; note: string };
  alimentazione: { obiettivo: string; principi: string[]; giornata_tipo: { pasto: string; esempio: string }[]; da_limitare: string[]; idratazione: string };
  guardaroba: { direzione: string; strategia?: string; essenziali: { nome: string; priorita: "alta" | "media" | "bassa"; ricerca: string; budget: string; costo_stimato?: number; dove?: string }[]; regole: string[] };
  generato_il?: string;
};

/** Settimana corrente del percorso (1–12) a partire dalla data di inizio. */
export function currentWeek(start: string | null | undefined) {
  if (!start) return 1;
  const days = Math.floor((Date.now() - new Date(start + "T00:00:00").getTime()) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(days / 7) + 1));
}
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
