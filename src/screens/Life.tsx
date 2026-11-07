import { CalendarPlus, Check, ChevronRight, Copy, ExternalLink, Gift, Heart, Lightbulb, Loader2, MapPin, Plus, Search, Sparkles, Star, Trash2, UtensilsCrossed, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { inputCls, Sheet } from "../components/ui";
import { useApp } from "../lib/store";
import { fn, supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* tipi e dati                                                         */
/* ------------------------------------------------------------------ */
export type PDate = { tipo: string; data: string; nota?: string };
export type Person = {
  id: string;
  nome: string;
  relazione: string;
  date: PDate[];
  gusti: string | null;
  non_piace: string | null;
  taglie: string | null;
  idee: { testo: string; data: string }[];
  note: string | null;
  pensierino_ogni: number | null;
  ultimo_pensierino: string | null;
  serata_ogni: number | null;
  ultima_serata: string | null;
  created_at: string;
};
type GiftRow = { id: string; person_id: string | null; occasione: string | null; titolo: string; descrizione: string | null; prezzo: string | null; link: string | null; stato: "idea" | "scelto" | "regalato"; data: string | null; created_at: string };
type Outing = { id: string; person_id: string | null; tipo: string; titolo: string; luogo: Place; data: string | null; ora: string | null; stato: "idea" | "prenotato" | "fatto"; note: string | null; created_at: string };
type Idea = { titolo: string; categoria?: string; perche?: string; prezzo?: string; dove?: string; link?: string | null; ricerca?: string; tocco?: string };
type Place = { nome: string; tipo?: string; zona?: string; indirizzo?: string | null; prezzo?: string; voto?: string | null; perche?: string; punti_forti?: string[]; punti_deboli?: string[]; atmosfera?: string; dress_code?: string; prenotazione?: string; link?: string | null; ricerca?: string; itinerario?: { giorno: string; piano: string }[]; tocco?: string };
type Fonte = { titolo: string; url: string };

const RELAZIONI = ["Partner", "Moglie", "Fidanzata", "Mamma", "Papà", "Sorella", "Fratello", "Amica", "Amico", "Collega", "Altro"];
const TIPI_DATA = ["Compleanno", "Anniversario", "Onomastico", "Primo appuntamento", "Altro"];
const OCCASIONI = ["Compleanno", "Anniversario", "San Valentino", "Natale", "Onomastico", "Festa della mamma", "Un traguardo", "Per farmi perdonare", "Senza motivo"];
const BUDGET_REGALO = ["Fino a 30 €", "30-80 €", "80-150 €", "150-300 €", "Oltre 300 €"];
const TIPI_USCITA = ["Serata a casa", "Cena romantica", "Aperitivo", "Pranzo", "Brunch", "Esperienza", "Weekend fuori", "Viaggio"];
const BUDGET_USCITA = ["Contenuto", "Medio", "Alto", "Senza limiti"];

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

/** Prossima occorrenza di una data (ignora l'anno). */
export function nextOccurrence(d: string) {
  const mmdd = d.slice(-5);
  if (!/^\d{2}-\d{2}$/.test(mmdd)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(`${now.getFullYear()}-${mmdd}T00:00:00`);
  if (next < today) next = new Date(`${now.getFullYear() + 1}-${mmdd}T00:00:00`);
  const days = Math.round((next.getTime() - today.getTime()) / 86400000);
  const year = /^\d{4}/.test(d) ? +d.slice(0, 4) : null;
  return { date: next, days, anni: year ? next.getFullYear() - year : null };
}
export function upcoming(people: Person[], within = 400) {
  return people
    .flatMap((p) => p.date.map((d) => ({ p, d, n: nextOccurrence(d.data) })))
    .filter((x) => x.n && x.n.days <= within)
    .sort((a, b) => a.n!.days - b.n!.days);
}
const when = (days: number) => (days === 0 ? "oggi" : days === 1 ? "domani" : `tra ${days} giorni`);

/* piccolo canale per passare la persona/occasione tra le schermate */
let preset: { person?: string; occasione?: string; tipo?: string } = {};

export function usePeople() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("people").select("*").order("created_at");
    setPeople((data as Person[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { people, reload: load };
}

/* ------------------------------------------------------------------ */
/* componenti comuni                                                   */
/* ------------------------------------------------------------------ */
const Title = ({ t, sub }: { t: string; sub: string }) => (
  <>
    <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">{t}</h1>
    <p className="text-[14.5px] text-muted mt-2 leading-relaxed">{sub}</p>
  </>
);
const H = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between mt-8 mb-3">
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {children}
    </h2>
    {right}
  </div>
);
function Chips({ opts, value, onChange, small }: { opts: string[]; value?: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`${small ? "h-8 px-3 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]"} rounded-full font-medium transition ${value === o ? "bg-brand text-brand-fg" : "bg-card"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
const Label = ({ children }: { children: ReactNode }) => <div className="text-[13px] font-semibold mb-1.5 mt-4">{children}</div>;
function Fonti({ fonti }: { fonti: Fonte[] }) {
  if (!fonti.length) return null;
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted mb-1.5">Fonti consultate</div>
      <div className="flex flex-wrap gap-1.5">
        {fonti.map((f) => (
          <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11.5px] text-muted hover:text-gold">
            <ExternalLink size={11} /> {f.titolo}
          </a>
        ))}
      </div>
    </div>
  );
}
const LinkBtn = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium inline-flex items-center gap-1.5">
    {children}
  </a>
);

/* ------------------------------------------------------------------ */
/* PERSONE                                                             */
/* ------------------------------------------------------------------ */
function PersonSheet({ person, onClose, onSaved }: { person: Partial<Person> | null; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const [p, setP] = useState<Partial<Person>>({});
  const [idea, setIdea] = useState("");
  useEffect(() => setP(person ? { date: [], idee: [], relazione: "Partner", ...person } : {}), [person]);
  if (!person) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const set = (x: Partial<Person>) => setP((v) => ({ ...v, ...x }));
  const save = async () => {
    if (!p.nome?.trim()) return app.toast("Scrivi il nome");
    const row = { nome: p.nome.trim(), relazione: p.relazione || "Partner", date: (p.date || []).filter((d) => d.data), gusti: p.gusti || null, non_piace: p.non_piace || null, taglie: p.taglie || null, idee: p.idee || [], note: p.note || null, pensierino_ogni: p.pensierino_ogni || null, ultimo_pensierino: p.ultimo_pensierino || null, serata_ogni: p.serata_ogni || null, ultima_serata: p.ultima_serata || null };
    if (p.id) await supabase.from("people").update(row).eq("id", p.id);
    else await supabase.from("people").insert(row);
    onSaved();
    onClose();
  };
  const del = async () => {
    if (!p.id) return;
    await supabase.from("people").delete().eq("id", p.id);
    onSaved();
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={p.id ? p.nome : "Nuova persona"} full>
      <div className="pb-8">
        <input placeholder="Nome" value={p.nome || ""} onChange={(e) => set({ nome: e.target.value })} className={inputCls} />
        <Label>Chi è per te</Label>
        <Chips small opts={RELAZIONI} value={p.relazione} onChange={(v) => set({ relazione: v })} />

        <Label>Date importanti</Label>
        <div className="space-y-2">
          {(p.date || []).map((d, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={d.tipo} onChange={(e) => set({ date: p.date!.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)) })} className="h-11 px-3 rounded-[12px] bg-card text-[14.5px] flex-1">
                {TIPI_DATA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input type="date" value={d.data} onChange={(e) => set({ date: p.date!.map((x, j) => (j === i ? { ...x, data: e.target.value } : x)) })} className="h-11 px-3 rounded-[12px] bg-card text-[14.5px]" />
              <button onClick={() => set({ date: p.date!.filter((_, j) => j !== i) })} className="h-9 w-9 grid place-items-center text-muted" aria-label="Togli">
                <X size={16} />
              </button>
            </div>
          ))}
          <button onClick={() => set({ date: [...(p.date || []), { tipo: (p.date || []).length ? "Anniversario" : "Compleanno", data: "" }] })} className="text-[13.5px] text-gold font-semibold flex items-center gap-1">
            <Plus size={15} /> Aggiungi una data
          </button>
        </div>

        <Label>Gusti e passioni</Label>
        <textarea value={p.gusti || ""} onChange={(e) => set({ gusti: e.target.value })} placeholder="Es. ama la cucina giapponese, i profumi agrumati, legge gialli, adora il mare d'inverno…" className="w-full min-h-[80px] p-3 rounded-[14px] bg-card text-[15px] outline-none" />
        <Label>Cosa non le piace</Label>
        <input value={p.non_piace || ""} onChange={(e) => set({ non_piace: e.target.value })} placeholder="Es. fiori recisi, oro giallo, sorprese in pubblico" className={inputCls} />
        <Label>Taglie e misure</Label>
        <input value={p.taglie || ""} onChange={(e) => set({ taglie: e.target.value })} placeholder="Es. S, scarpe 38, anello 13" className={inputCls} />

        <Label>Idee annotate</Label>
        <div className="text-[12.5px] text-muted -mt-1 mb-2">Quando dice "che bello…", annotalo qui: il consigliere dei regali ne terrà conto.</div>
        <div className="space-y-1.5">
          {(p.idee || []).map((x, i) => (
            <div key={i} className="flex items-center gap-2 rounded-[12px] bg-card px-3 py-2 text-[14px]">
              <Lightbulb size={14} className="text-gold shrink-0" />
              <span className="flex-1">{x.testo}</span>
              <button onClick={() => set({ idee: p.idee!.filter((_, j) => j !== i) })} className="text-muted" aria-label="Togli">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Nuova idea" className={inputCls} />
            <button
              onClick={() => {
                if (!idea.trim()) return;
                set({ idee: [...(p.idee || []), { testo: idea.trim(), data: todayISO() }] });
                setIdea("");
              }}
              className="h-12 w-12 rounded-[14px] bg-card grid place-items-center shrink-0"
              aria-label="Aggiungi idea"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <Label>Un pensierino senza motivo</Label>
        <Chips small opts={["Mai", "Ogni 2 settimane", "Ogni 3 settimane", "Ogni mese", "Ogni 6 settimane"]} value={{ 14: "Ogni 2 settimane", 21: "Ogni 3 settimane", 30: "Ogni mese", 45: "Ogni 6 settimane" }[p.pensierino_ogni || 0] || "Mai"} onChange={(v) => set({ pensierino_ogni: ({ "Ogni 2 settimane": 14, "Ogni 3 settimane": 21, "Ogni mese": 30, "Ogni 6 settimane": 45 } as Record<string, number>)[v] || null })} />
        <div className="text-[12px] text-muted mt-1.5">Ti arriva un promemoria quando è passato questo tempo dall'ultimo pensierino.</div>

        <Label>Una serata a casa, solo voi due</Label>
        <Chips small opts={["Mai", "Ogni settimana", "Ogni 2 settimane", "Ogni mese"]} value={{ 7: "Ogni settimana", 14: "Ogni 2 settimane", 30: "Ogni mese" }[p.serata_ogni || 0] || "Mai"} onChange={(v) => set({ serata_ogni: ({ "Ogni settimana": 7, "Ogni 2 settimane": 14, "Ogni mese": 30 } as Record<string, number>)[v] || null })} />
        <div className="text-[12px] text-muted mt-1.5">Un promemoria con tre idee per una serata semplice e fatta con cura, anche con un bimbo piccolo in casa.</div>

        <Label>Note</Label>
        <textarea value={p.note || ""} onChange={(e) => set({ note: e.target.value })} className="w-full min-h-[70px] p-3 rounded-[14px] bg-card text-[15px] outline-none" />

        <div className="mt-6 flex gap-2">
          <button onClick={save} className="flex-1 h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2">
            <Check size={17} /> Salva
          </button>
          {p.id && (
            <button onClick={del} className="h-12 px-5 rounded-full bg-danger-tint text-danger font-medium">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

export function PeopleScreen() {
  const app = useApp();
  const { people, reload } = usePeople();
  const [edit, setEdit] = useState<Partial<Person> | null>(null);
  const next = useMemo(() => upcoming(people || [], 120), [people]);
  const pensierino = async (p: Person) => {
    await supabase.from("people").update({ ultimo_pensierino: todayISO() }).eq("id", p.id);
    app.toast(`Annotato: pensierino per ${p.nome}`);
    reload();
  };
  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <Title t="Le tue persone" sub="Un gentleman ricorda. Date importanti, gusti e piccole idee delle persone che contano: Habitus te le ricorda al momento giusto." />

      {next.length > 0 && (
        <>
          <H>In arrivo</H>
          <div className="space-y-2.5">
            {next.slice(0, 6).map(({ p, d, n }) => (
              <div key={p.id + d.tipo + d.data} className={`rounded-[20px] p-4 flex items-center gap-3 ${n!.days <= 7 ? "bg-hero text-herofg" : "bg-surface shadow-soft"}`}>
                <div className="text-center w-14 shrink-0">
                  <div className="font-display text-[26px] leading-none">{n!.date.getDate()}</div>
                  <div className="text-[11px] uppercase tracking-wide opacity-70">{n!.date.toLocaleDateString("it-IT", { month: "short" })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px]">
                    {d.tipo} di {p.nome}
                  </div>
                  <div className={`text-[12.5px] ${n!.days <= 7 ? "opacity-75" : "text-muted"}`}>
                    {when(n!.days)}
                    {n!.anni ? ` · ${n!.anni} ${d.tipo === "Compleanno" ? "anni" : "anni insieme"}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => {
                    preset = { person: p.id, occasione: OCCASIONI.includes(d.tipo) ? d.tipo : "Compleanno" };
                    app.setTab("regali");
                  }}
                  className={`h-9 px-3.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5 shrink-0 ${n!.days <= 7 ? "bg-gold text-ongold" : "bg-card"}`}
                >
                  <Gift size={14} /> Idee
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <H
        right={
          <button onClick={() => setEdit({})} className="text-[13px] text-gold font-semibold flex items-center gap-1">
            <Plus size={14} /> Aggiungi
          </button>
        }
      >
        Persone
      </H>
      {people && people.length === 0 && (
        <button onClick={() => setEdit({ relazione: "Partner" })} className="w-full rounded-[22px] bg-surface shadow-soft p-6 text-center">
          <Heart size={26} className="mx-auto text-gold" />
          <div className="font-semibold text-[16px] mt-2">Inizia da lei</div>
          <div className="text-[13.5px] text-muted mt-1">Nome, compleanno, anniversario e cosa le piace. Al resto pensa Habitus.</div>
        </button>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {(people || []).map((p) => {
          const n = upcoming([p])[0];
          const due = p.pensierino_ogni ? Math.round((Date.now() - Date.parse((p.ultimo_pensierino || p.created_at.slice(0, 10)) + "T00:00:00")) / 86400000) >= p.pensierino_ogni : false;
          return (
            <div key={p.id} className="rounded-[20px] bg-surface shadow-soft p-4">
              <button onClick={() => setEdit(p)} className="w-full text-left flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gold-tint grid place-items-center font-display text-[20px] text-gold shrink-0">{p.nome[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15.5px]">{p.nome}</div>
                  <div className="text-[12.5px] text-muted">
                    {p.relazione}
                    {n ? ` · ${n.d.tipo.toLowerCase()} ${when(n.n!.days)}` : ""}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    preset = { person: p.id };
                    app.setTab("regali");
                  }}
                  className="h-8 px-3 rounded-full bg-card text-[12.5px] font-medium flex items-center gap-1"
                >
                  <Gift size={13} /> Regalo
                </button>
                <button
                  onClick={() => {
                    preset = { person: p.id };
                    app.setTab("uscite");
                  }}
                  className="h-8 px-3 rounded-full bg-card text-[12.5px] font-medium flex items-center gap-1"
                >
                  <UtensilsCrossed size={13} /> Uscita
                </button>
                <button
                  onClick={() => {
                    preset = { person: p.id, tipo: "Serata a casa" };
                    app.setTab("uscite");
                  }}
                  className="h-8 px-3 rounded-full bg-card text-[12.5px] font-medium flex items-center gap-1"
                >
                  <Sparkles size={13} /> Serata a casa
                </button>
                <button onClick={() => pensierino(p)} className={`h-8 px-3 rounded-full text-[12.5px] font-medium flex items-center gap-1 ${due ? "bg-gold text-ongold" : "bg-card"}`}>
                  <Heart size={13} /> {due ? "Tempo di un pensierino" : "Pensierino fatto"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <PersonSheet person={edit} onClose={() => setEdit(null)} onSaved={reload} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* REGALI                                                              */
/* ------------------------------------------------------------------ */
export function GiftsScreen() {
  const app = useApp();
  const { people } = usePeople();
  const [who, setWho] = useState<string | undefined>(preset.person);
  const [occ, setOcc] = useState<string>(preset.occasione || "Senza motivo");
  const [budget, setBudget] = useState("30-80 €");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ idee: Idea[]; biglietto: string; consiglio: string; fonti: Fonte[] } | null>(null);
  const [saved, setSaved] = useState<GiftRow[]>([]);
  useEffect(() => {
    preset = {};
  }, []);
  useEffect(() => {
    if (!who && people?.length) setWho(people[0].id);
  }, [people, who]);
  const loadSaved = useCallback(async () => {
    const { data } = await supabase.from("gifts").select("*").order("created_at", { ascending: false });
    setSaved((data as GiftRow[]) || []);
  }, []);
  useEffect(() => {
    loadSaved();
  }, [loadSaved]);
  const person = people?.find((p) => p.id === who);

  const ask = async () => {
    if (!who) return app.toast("Aggiungi prima una persona in Persone");
    setBusy(true);
    setRes(null);
    try {
      setRes(await fn("lifestyle", "", { action: "regali", person_id: who, occasione: occ, budget, note }));
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  const keep = async (i: Idea, stato: GiftRow["stato"]) => {
    await supabase.from("gifts").insert({ person_id: who, occasione: occ, titolo: i.titolo, descrizione: [i.perche, i.tocco && `Tocco: ${i.tocco}`].filter(Boolean).join("\n"), prezzo: i.prezzo || null, link: i.link || google(i.ricerca || i.titolo), stato, data: stato === "idea" ? null : todayISO() });
    if (stato !== "idea" && person && occ === "Senza motivo") await supabase.from("people").update({ ultimo_pensierino: todayISO() }).eq("id", person.id);
    app.toast(stato === "idea" ? "Idea salvata" : "Segnato come regalo scelto");
    loadSaved();
  };

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <Title t="Regali da gentleman" sub="Scegli per chi e per cosa: cerco idee vere, adatte ai suoi gusti e al budget, con il tocco che fa la differenza." />

      <div className="mt-5 rounded-[24px] bg-surface shadow-soft p-5">
        <Label>Per chi</Label>
        {people && people.length === 0 ? (
          <button onClick={() => app.setTab("persone")} className="text-[14px] text-gold font-semibold">
            Aggiungi prima una persona →
          </button>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(people || []).map((p) => (
              <button key={p.id} onClick={() => setWho(p.id)} className={`h-9 px-3.5 rounded-full text-[13.5px] font-medium ${who === p.id ? "bg-brand text-brand-fg" : "bg-card"}`}>
                {p.nome}
              </button>
            ))}
          </div>
        )}
        <Label>Per quale occasione</Label>
        <Chips small opts={OCCASIONI} value={occ} onChange={setOcc} />
        <Label>Budget</Label>
        <Chips small opts={BUDGET_REGALO} value={budget} onChange={setBudget} />
        <Label>Qualcosa da sapere</Label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facoltativo: es. vorrei un'esperienza, deve arrivare entro venerdì" className={inputCls} />
        <button onClick={ask} disabled={busy} className="mt-5 w-full h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />} {busy ? "Cerco tra negozi, artigiani ed esperienze…" : "Trova le idee"}
        </button>
      </div>

      {res && (
        <>
          <H>Le idee per {person?.nome}</H>
          <div className="space-y-3">
            {res.idee.map((i, k) => (
              <div key={k} className="rounded-[20px] bg-surface shadow-soft p-5">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {i.categoria && <div className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">{i.categoria}</div>}
                    <div className="text-[17px] font-semibold leading-snug mt-0.5">{i.titolo}</div>
                  </div>
                  {i.prezzo && <span className="rounded-full bg-gold-tint px-3 py-1 text-[12.5px] font-semibold shrink-0">{i.prezzo}</span>}
                </div>
                {i.perche && <p className="text-[14px] leading-relaxed mt-2">{i.perche}</p>}
                {i.dove && <div className="text-[12.5px] text-muted mt-1.5">Dove: {i.dove}</div>}
                {i.tocco && (
                  <div className="mt-3 rounded-[12px] bg-card p-3 text-[13.5px] flex gap-2">
                    <Sparkles size={15} className="text-gold shrink-0 mt-0.5" /> {i.tocco}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {i.link && (
                    <LinkBtn href={i.link}>
                      <ExternalLink size={13} /> Apri
                    </LinkBtn>
                  )}
                  <LinkBtn href={google(i.ricerca || i.titolo)}>
                    <Search size={13} /> Cerca
                  </LinkBtn>
                  <button onClick={() => keep(i, "idea")} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium inline-flex items-center gap-1.5">
                    <Star size={13} /> Salva
                  </button>
                  <button onClick={() => keep(i, "scelto")} className="h-9 px-3.5 rounded-full bg-brand text-brand-fg text-[13px] font-semibold inline-flex items-center gap-1.5">
                    <Check size={13} /> Scelgo questo
                  </button>
                </div>
              </div>
            ))}
          </div>
          {res.biglietto && (
            <div className="mt-4 rounded-[20px] bg-hero text-herofg p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gold font-bold">Il biglietto, scritto a mano</div>
              <p className="font-display text-[19px] leading-relaxed mt-2 whitespace-pre-wrap">{res.biglietto}</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(res.biglietto);
                  app.toast("Copiato");
                }}
                className="mt-3 text-[12.5px] text-gold flex items-center gap-1"
              >
                <Copy size={13} /> Copia
              </button>
            </div>
          )}
          {res.consiglio && <div className="mt-3 rounded-[16px] bg-card p-4 text-[14px]"><b>Galateo:</b> {res.consiglio}</div>}
          <Fonti fonti={res.fonti} />
        </>
      )}

      {saved.length > 0 && (
        <>
          <H>Idee salvate e regali fatti</H>
          <div className="rounded-[20px] bg-surface shadow-soft divide-y divide-line">
            {saved.map((g) => {
              const p = people?.find((x) => x.id === g.person_id);
              return (
                <div key={g.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${g.stato === "idea" ? "bg-line" : "bg-gold"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium truncate">{g.titolo}</div>
                    <div className="text-[12px] text-muted">
                      {p?.nome || "—"} · {g.occasione}
                      {g.stato !== "idea" && g.data ? ` · ${g.stato} il ${new Date(g.data).toLocaleDateString("it-IT")}` : " · idea"}
                    </div>
                  </div>
                  {g.link && (
                    <a href={g.link} target="_blank" rel="noreferrer" className="h-8 w-8 grid place-items-center text-muted" aria-label="Apri">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {g.stato === "idea" && (
                    <button onClick={() => supabase.from("gifts").update({ stato: "scelto", data: todayISO() }).eq("id", g.id).then(loadSaved)} className="h-8 px-2.5 rounded-full bg-card text-[12px] font-medium">
                      Scelto
                    </button>
                  )}
                  {g.stato === "scelto" && (
                    <button onClick={() => supabase.from("gifts").update({ stato: "regalato", data: todayISO() }).eq("id", g.id).then(loadSaved)} className="h-8 px-2.5 rounded-full bg-card text-[12px] font-medium">
                      Regalato
                    </button>
                  )}
                  <button onClick={() => supabase.from("gifts").delete().eq("id", g.id).then(loadSaved)} className="h-8 w-8 grid place-items-center text-muted" aria-label="Elimina">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* USCITE                                                              */
/* ------------------------------------------------------------------ */
function ics(o: Outing) {
  const d = (o.data || todayISO()).replace(/-/g, "");
  const [h, m] = (o.ora || "20:30").split(":");
  const start = `${d}T${h.padStart(2, "0")}${(m || "00").padStart(2, "0")}00`;
  const endH = String(Math.min(23, +h + 3)).padStart(2, "0");
  const esc = (s: string) => s.replace(/[,;\\]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Habitus//IT",
    "BEGIN:VEVENT",
    `UID:${o.id}@habitus`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Rome:${start}`,
    `DTEND;TZID=Europe/Rome:${d}T${endH}${(m || "00").padStart(2, "0")}00`,
    `SUMMARY:${esc(o.titolo)}`,
    `LOCATION:${esc([o.luogo.nome, o.luogo.indirizzo || o.luogo.zona].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc([o.luogo.dress_code && `Dress code: ${o.luogo.dress_code}`, o.luogo.tocco, o.note].filter(Boolean).join("\n"))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(o.titolo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  a.download = `${o.titolo.replace(/[^\w\s-]/g, "").slice(0, 40) || "uscita"}.ics`;
  a.click();
}

function PlaceCard({ p, rank, onSave }: { p: Place; rank: number; onSave: () => void }) {
  return (
    <div className={`rounded-[22px] p-5 ${rank === 0 ? "bg-surface shadow-soft ring-1 ring-gold/50" : "bg-surface shadow-soft"}`}>
      {rank === 0 && <div className="text-[10.5px] uppercase tracking-[0.14em] text-gold font-bold mb-1">La scelta migliore</div>}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold leading-snug">{p.nome}</div>
          <div className="text-[12.5px] text-muted">{[p.tipo, p.zona].filter(Boolean).join(" · ")}</div>
        </div>
        {p.prezzo && <span className="rounded-full bg-gold-tint px-3 py-1 text-[12px] font-semibold shrink-0 max-w-[45%] text-right">{p.prezzo}</span>}
      </div>
      {p.voto && (
        <div className="mt-2 text-[13px] flex items-center gap-1.5">
          <Star size={13} className="text-gold fill-current" /> {p.voto}
        </div>
      )}
      {p.perche && <p className="text-[14px] leading-relaxed mt-2">{p.perche}</p>}
      {(p.punti_forti?.length || p.punti_deboli?.length) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {!!p.punti_forti?.length && (
            <div className="rounded-[12px] bg-card p-3">
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted mb-1">Le recensioni lodano</div>
              {p.punti_forti.map((x) => (
                <div key={x} className="text-[13px] flex gap-1.5">
                  <Check size={13} className="text-gold shrink-0 mt-0.5" /> {x}
                </div>
              ))}
            </div>
          )}
          {!!p.punti_deboli?.length && (
            <div className="rounded-[12px] bg-card p-3">
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted mb-1">E criticano</div>
              {p.punti_deboli.map((x) => (
                <div key={x} className="text-[13px] flex gap-1.5">
                  <X size={13} className="text-danger shrink-0 mt-0.5" /> {x}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-3 space-y-1 text-[13px]">
        {p.atmosfera && (
          <div>
            <b>Atmosfera:</b> {p.atmosfera}
          </div>
        )}
        {p.dress_code && (
          <div>
            <b>Dress code:</b> {p.dress_code}
          </div>
        )}
        {p.prenotazione && (
          <div>
            <b>Prenotazione:</b> {p.prenotazione}
          </div>
        )}
      </div>
      {!!p.itinerario?.length && (
        <div className="mt-3 space-y-1.5">
          {p.itinerario.map((g) => (
            <div key={g.giorno} className="rounded-[12px] bg-card p-3 text-[13px]">
              <b>{g.giorno}:</b> {g.piano}
            </div>
          ))}
        </div>
      )}
      {p.tocco && (
        <div className="mt-3 rounded-[12px] bg-gold-tint p-3 text-[13.5px] flex gap-2">
          <Sparkles size={15} className="text-gold shrink-0 mt-0.5" /> {p.tocco}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.link && (
          <LinkBtn href={p.link}>
            <ExternalLink size={13} /> Sito
          </LinkBtn>
        )}
        <LinkBtn href={maps([p.nome, p.indirizzo || p.zona].filter(Boolean).join(", "))}>
          <MapPin size={13} /> Mappa
        </LinkBtn>
        <LinkBtn href={google(p.ricerca || p.nome)}>
          <Search size={13} /> Recensioni
        </LinkBtn>
        <button onClick={onSave} className="h-9 px-3.5 rounded-full bg-brand text-brand-fg text-[13px] font-semibold inline-flex items-center gap-1.5">
          <Plus size={13} /> Salva
        </button>
      </div>
    </div>
  );
}

function OutingSheet({ o, onClose, onSaved }: { o: Outing | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Outing | null>(o);
  useEffect(() => setV(o), [o]);
  if (!v) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const save = async (extra: Partial<Outing> = {}) => {
    const n = { ...v, ...extra };
    await supabase.from("outings").update({ data: n.data || null, ora: n.ora || null, stato: n.stato, note: n.note || null, titolo: n.titolo }).eq("id", v.id);
    onSaved();
    return n;
  };
  return (
    <Sheet open onClose={onClose} eyebrow={v.tipo} title={v.luogo.nome || v.titolo} full>
      <div className="pb-8">
        <PlaceCard p={v.luogo} rank={1} onSave={() => {}} />
        <Label>Quando</Label>
        <div className="flex gap-2">
          <input type="date" value={v.data || ""} onChange={(e) => setV({ ...v, data: e.target.value })} className={inputCls} />
          <input type="time" value={v.ora || ""} onChange={(e) => setV({ ...v, ora: e.target.value })} className={`${inputCls} max-w-[130px]`} />
        </div>
        <Label>Stato</Label>
        <Chips small opts={["idea", "prenotato", "fatto"]} value={v.stato} onChange={(s) => setV({ ...v, stato: s as Outing["stato"] })} />
        <Label>Note</Label>
        <textarea value={v.note || ""} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="Es. tavolo vicino alla finestra, prenotato a nome Sarracino" className="w-full min-h-[70px] p-3 rounded-[14px] bg-card text-[15px] outline-none" />
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await save();
              onClose();
            }}
            className="flex-1 h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2"
          >
            <Check size={17} /> Salva
          </button>
          <button
            onClick={async () => {
              const n = await save();
              ics(n);
            }}
            disabled={!v.data}
            className="h-12 px-4 rounded-full bg-card font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <CalendarPlus size={17} /> Calendario
          </button>
          <button
            onClick={async () => {
              await supabase.from("outings").delete().eq("id", v.id);
              onSaved();
              onClose();
            }}
            className="h-12 w-12 rounded-full bg-danger-tint text-danger grid place-items-center"
            aria-label="Elimina"
          >
            <Trash2 size={16} />
          </button>
        </div>
        {!v.data && <div className="text-[12px] text-muted mt-2">Imposta una data per aggiungerla al calendario.</div>}
      </div>
    </Sheet>
  );
}

type Serata = { titolo: string; idea?: string; menu?: { piatto: string; come: string; tempo?: string }[]; spesa?: string[]; atmosfera?: string; musica?: string; dopo?: string; conversazione?: string[]; tocco?: string; tempi?: string };

function SerataCard({ s, onDone, onSave }: { s: Serata; onDone: () => void; onSave: () => void }) {
  return (
    <div className="rounded-[22px] bg-surface shadow-soft p-5">
      <div className="text-[18px] font-semibold leading-snug">{s.titolo}</div>
      {s.idea && <p className="text-[14px] leading-relaxed mt-1.5">{s.idea}</p>}
      {!!s.menu?.length && (
        <div className="mt-3 space-y-2">
          {s.menu.map((m) => (
            <div key={m.piatto} className="rounded-[12px] bg-card p-3">
              <div className="text-[14px] font-semibold flex justify-between gap-2">
                <span>{m.piatto}</span>
                {m.tempo && <span className="text-[12px] text-muted font-normal">{m.tempo}</span>}
              </div>
              <div className="text-[13px] leading-relaxed mt-0.5">{m.come}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed">
        {!!s.spesa?.length && (
          <div>
            <b>Spesa:</b> {s.spesa.join(", ")}
          </div>
        )}
        {s.tempi && (
          <div>
            <b>Tempi:</b> {s.tempi}
          </div>
        )}
        {s.atmosfera && (
          <div>
            <b>Atmosfera:</b> {s.atmosfera}
          </div>
        )}
        {s.musica && (
          <div>
            <b>Musica:</b> {s.musica}
          </div>
        )}
        {s.dopo && (
          <div>
            <b>Dopo cena:</b> {s.dopo}
          </div>
        )}
      </div>
      {!!s.conversazione?.length && (
        <div className="mt-3 rounded-[12px] bg-card p-3 text-[13px]">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted mb-1">Spunti di conversazione</div>
          {s.conversazione.map((c) => (
            <div key={c}>· {c}</div>
          ))}
        </div>
      )}
      {s.tocco && (
        <div className="mt-3 rounded-[12px] bg-gold-tint p-3 text-[13.5px] flex gap-2">
          <Sparkles size={15} className="text-gold shrink-0 mt-0.5" /> {s.tocco}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button onClick={onSave} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium inline-flex items-center gap-1.5">
          <Star size={13} /> Salva
        </button>
        <button onClick={onDone} className="h-9 px-3.5 rounded-full bg-brand text-brand-fg text-[13px] font-semibold inline-flex items-center gap-1.5">
          <Heart size={13} /> L'abbiamo fatta
        </button>
      </div>
    </div>
  );
}

export function OutingsScreen() {
  const app = useApp();
  const { people } = usePeople();
  const [tipo, setTipo] = useState(preset.tipo || "Cena romantica");
  const [bimbo, setBimbo] = useState(true);
  const [prep, setPrep] = useState("30 minuti");
  const [serate, setSerate] = useState<Serata[] | null>(null);
  const [who, setWho] = useState<string | undefined>(preset.person);
  const [dove, setDove] = useState(app.profile?.citta || "Napoli");
  const [quando, setQuando] = useState("");
  const [budget, setBudget] = useState("Medio");
  const [pref, setPref] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ proposte: Place[]; nota: string; fonti: Fonte[] } | null>(null);
  const [list, setList] = useState<Outing[]>([]);
  const [open, setOpen] = useState<Outing | null>(null);
  useEffect(() => {
    preset = {};
  }, []);
  const load = useCallback(async () => {
    const { data } = await supabase.from("outings").select("*").order("data", { ascending: true, nullsFirst: false });
    setList((data as Outing[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const isSerata = tipo === "Serata a casa";
  const askSerata = async () => {
    setBusy(true);
    setSerate(null);
    try {
      const r = await fn<{ serate: Serata[] }>("lifestyle", "", { action: "serata", person_id: who, preferenze: pref, tempo: prep, contesto: bimbo ? undefined : "senza vincoli di orario particolari, si può fare con calma" });
      setSerate(r.serate);
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  const serataFatta = async (s: Serata) => {
    if (who) await supabase.from("people").update({ ultima_serata: todayISO() }).eq("id", who);
    await supabase.from("outings").insert({ tipo, titolo: `Serata a casa: ${s.titolo}`, luogo: { nome: s.titolo, perche: s.idea, tocco: s.tocco }, person_id: who || null, stato: "fatto", data: todayISO() });
    app.toast("Bravo. Annotata.");
    load();
  };
  const salvaSerata = async (s: Serata) => {
    await supabase.from("outings").insert({ tipo, titolo: `Serata a casa: ${s.titolo}`, luogo: { nome: s.titolo, perche: s.idea, atmosfera: s.atmosfera, tocco: s.tocco, itinerario: (s.menu || []).map((m) => ({ giorno: m.piatto, piano: m.come })) }, person_id: who || null, stato: "idea" });
    app.toast("Salvata tra le tue idee");
    load();
  };
  const ask = async () => {
    if (isSerata) return askSerata();
    setBusy(true);
    setRes(null);
    if (dove && !app.profile?.citta) app.setProfile({ citta: dove });
    try {
      setRes(await fn("lifestyle", "", { action: "uscite", tipo, dove, quando, budget, preferenze: pref, person_id: who }));
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  const keep = async (p: Place) => {
    const { data } = await supabase.from("outings").insert({ tipo, titolo: `${tipo}: ${p.nome}`, luogo: p, person_id: who || null, stato: "idea" }).select().single();
    app.toast("Salvato nelle tue uscite");
    load();
    if (data) setOpen(data as Outing);
  };
  const future = list.filter((o) => o.stato !== "fatto");
  const done = list.filter((o) => o.stato === "fatto");

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <Title t="Uscite e serate" sub="Una serata a casa fatta bene, una cena, un weekend: cerco i posti, leggo le recensioni al posto tuo e ti presento solo i migliori." />

      <div className="mt-5 rounded-[24px] bg-surface shadow-soft p-5">
        <Label>Cosa vuoi organizzare</Label>
        <Chips small opts={TIPI_USCITA} value={tipo} onChange={setTipo} />
        {!!people?.length && (
          <>
            <Label>Con chi</Label>
            <div className="flex flex-wrap gap-1.5">
              {people.map((p) => (
                <button key={p.id} onClick={() => setWho(who === p.id ? undefined : p.id)} className={`h-8 px-3 rounded-full text-[12.5px] font-medium ${who === p.id ? "bg-brand text-brand-fg" : "bg-card"}`}>
                  {p.nome}
                </button>
              ))}
            </div>
          </>
        )}
        {isSerata ? (
          <>
            <Label>Tempo per prepararla</Label>
            <Chips small opts={["15 minuti", "30 minuti", "1 ora"]} value={prep} onChange={setPrep} />
            <button onClick={() => setBimbo(!bimbo)} className="mt-4 flex items-center gap-3 text-left">
              <span className={`h-6 w-10 rounded-full relative transition shrink-0 ${bimbo ? "bg-brand" : "bg-line"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${bimbo ? "left-[18px]" : "left-0.5"}`} />
              </span>
              <span className="text-[14px]">Bimbo piccolo in casa: dopo la nanna, niente di stancante</span>
            </button>
          </>
        ) : (
          <>
        <Label>Dove</Label>
        <input value={dove} onChange={(e) => setDove(e.target.value)} placeholder={/viaggio|weekend/i.test(tipo) ? "Es. Costiera amalfitana, Toscana, Parigi, entro 3 ore da Napoli" : "Città o quartiere, es. Chiaia, Posillipo"} className={inputCls} />
        <Label>Quando</Label>
        <input value={quando} onChange={(e) => setQuando(e.target.value)} placeholder="Es. sabato sera, il 14 febbraio, un weekend di marzo" className={inputCls} />
        <Label>Budget</Label>
        <Chips small opts={BUDGET_USCITA} value={budget} onChange={setBudget} />
          </>
        )}
        <Label>Preferenze</Label>
        <input value={pref} onChange={(e) => setPref(e.target.value)} placeholder="Es. pesce, vista mare, tranquillo, niente locali rumorosi" className={inputCls} />
        <button onClick={ask} disabled={busy} className="mt-5 w-full h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />} {busy ? (isSerata ? "Preparo tre idee…" : "Cerco e leggo le recensioni…") : isSerata ? "Tre idee per la serata" : "Trova i posti migliori"}
        </button>
      </div>

      {isSerata && serate && (
        <>
          <H>Tre idee per voi</H>
          <div className="space-y-3">
            {serate.map((x) => (
              <SerataCard key={x.titolo} s={x} onDone={() => serataFatta(x)} onSave={() => salvaSerata(x)} />
            ))}
          </div>
        </>
      )}
      {!isSerata && res && (
        <>
          <H>Le mie proposte</H>
          <div className="space-y-3">
            {res.proposte.map((p, i) => (
              <PlaceCard key={p.nome + i} p={p} rank={i} onSave={() => keep(p)} />
            ))}
          </div>
          {res.nota && <div className="mt-3 rounded-[16px] bg-card p-4 text-[14px]">{res.nota}</div>}
          <Fonti fonti={res.fonti} />
        </>
      )}

      {future.length > 0 && (
        <>
          <H>In programma e idee</H>
          <div className="space-y-2.5">
            {future.map((o) => (
              <button key={o.id} onClick={() => setOpen(o)} className="w-full text-left rounded-[18px] bg-surface shadow-soft p-4 flex items-center gap-3">
                <div className="text-center w-12 shrink-0">
                  {o.data ? (
                    <>
                      <div className="font-display text-[22px] leading-none">{new Date(o.data).getDate()}</div>
                      <div className="text-[10.5px] uppercase text-muted">{new Date(o.data).toLocaleDateString("it-IT", { month: "short" })}</div>
                    </>
                  ) : (
                    <Star size={18} className="mx-auto text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px] truncate">{o.luogo.nome || o.titolo}</div>
                  <div className="text-[12.5px] text-muted">
                    {o.tipo} · {o.stato}
                    {o.ora ? ` · ${o.ora}` : ""}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            ))}
          </div>
        </>
      )}
      {done.length > 0 && (
        <>
          <H>Fatte</H>
          <div className="rounded-[18px] bg-surface shadow-soft divide-y divide-line">
            {done.map((o) => (
              <button key={o.id} onClick={() => setOpen(o)} className="w-full text-left px-4 py-3 text-[14px] flex justify-between">
                <span>{o.luogo.nome || o.titolo}</span>
                <span className="text-muted text-[12.5px]">{o.data ? new Date(o.data).toLocaleDateString("it-IT") : ""}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <OutingSheet o={open} onClose={() => setOpen(null)} onSaved={load} />
    </div>
  );
}

/** In Oggi: la prossima ricorrenza entro 14 giorni. */
export function NextDateBadge() {
  const app = useApp();
  const { people } = usePeople();
  const n = upcoming(people || [], 14)[0];
  if (!n) return null;
  return (
    <button
      onClick={() => {
        preset = { person: n.p.id, occasione: OCCASIONI.includes(n.d.tipo) ? n.d.tipo : undefined };
        app.setTab("regali");
      }}
      className="mt-3 w-full text-left rounded-[22px] bg-surface shadow-soft p-5 flex items-center gap-4"
    >
      <Gift size={24} className="text-gold shrink-0" />
      <div className="flex-1">
        <div className="font-semibold text-[15.5px]">
          {n.d.tipo} di {n.p.nome} {when(n.n!.days)}
        </div>
        <div className="text-[13px] text-muted">Hai già pensato al regalo? Tocca per le idee.</div>
      </div>
      <ChevronRight size={18} className="text-muted" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* LETTERE E MESSAGGI                                                  */
/* ------------------------------------------------------------------ */
const TIPI_LETTERA = ["Biglietto per un regalo", "Lettera d'amore", "Auguri", "Ringraziamento", "Scuse", "Messaggio dopo un primo appuntamento", "Invito a uscire", "Condoglianze", "Messaggio importante"];
const TONI = ["Elegante", "Affettuoso", "Romantico", "Sobrio", "Con un tocco di ironia"];
const LUNGHEZZE = ["Due righe", "Breve", "Una lettera vera"];
type Letter = { id: string; person_id: string | null; tipo: string; testo: string; created_at: string };

export function LettersScreen() {
  const app = useApp();
  const { people } = usePeople();
  const [tipo, setTipo] = useState(TIPI_LETTERA[0]);
  const [who, setWho] = useState<string | undefined>();
  const [altro, setAltro] = useState("");
  const [tono, setTono] = useState("Elegante");
  const [len, setLen] = useState("Breve");
  const [testo, setTesto] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ versioni: { titolo: string; testo: string }[]; consiglio: string } | null>(null);
  const [saved, setSaved] = useState<Letter[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("letters").select("*").order("created_at", { ascending: false }).limit(30);
    setSaved((data as Letter[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const ask = async () => {
    if (!testo.trim()) return app.toast("Scrivi, anche in modo grezzo, cosa vuoi dire");
    setBusy(true);
    setRes(null);
    try {
      setRes(await fn("lifestyle", "", { action: "lettera", tipo, tono, lunghezza: len, contenuto: testo, person_id: who, destinatario: who ? undefined : altro }));
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  const keep = async (t: string) => {
    await supabase.from("letters").insert({ tipo, testo: t, person_id: who || null });
    app.toast("Salvata");
    load();
  };
  const share = async (t: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: t });
      } catch {
        /* annullato */
      }
    } else {
      await navigator.clipboard?.writeText(t);
      app.toast("Copiato");
    }
  };

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[860px]">
      <Title t="Lettere e messaggi" sub="Le parole giuste, nel tuo modo di dirle. Scrivi cosa vuoi dire anche in modo grezzo: il Maestro ti propone tre versioni da gentleman." />

      <div className="mt-5 rounded-[24px] bg-surface shadow-soft p-5">
        <Label>Cosa devi scrivere</Label>
        <Chips small opts={TIPI_LETTERA} value={tipo} onChange={setTipo} />
        <Label>Per chi</Label>
        <div className="flex flex-wrap gap-1.5">
          {(people || []).map((p) => (
            <button key={p.id} onClick={() => setWho(who === p.id ? undefined : p.id)} className={`h-8 px-3 rounded-full text-[12.5px] font-medium ${who === p.id ? "bg-brand text-brand-fg" : "bg-card"}`}>
              {p.nome}
            </button>
          ))}
        </div>
        {!who && <input value={altro} onChange={(e) => setAltro(e.target.value)} placeholder="Oppure scrivi chi è (es. la ragazza conosciuta sabato, il suocero)" className={`${inputCls} mt-2`} />}
        <Label>Tono</Label>
        <Chips small opts={TONI} value={tono} onChange={setTono} />
        <Label>Lunghezza</Label>
        <Chips small opts={LUNGHEZZE} value={len} onChange={setLen} />
        <Label>Cosa vuoi dire</Label>
        <textarea value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. grazie per la serata, mi sono divertito, vorrei rivederla ma senza sembrare insistente" className="w-full min-h-[110px] p-3.5 rounded-[16px] bg-card text-[15.5px] outline-none focus:ring-1 focus:ring-gold" />
        <button onClick={ask} disabled={busy} className="mt-4 w-full h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} {busy ? "Scrivo…" : "Proponi tre versioni"}
        </button>
      </div>

      {res && (
        <>
          <H>Tre versioni</H>
          <div className="space-y-3">
            {res.versioni.map((v) => (
              <div key={v.titolo} className="rounded-[22px] bg-surface shadow-soft p-5">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-gold font-bold">{v.titolo}</div>
                <p className="font-display text-[19px] leading-relaxed mt-2 whitespace-pre-wrap">{v.testo}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(v.testo);
                      app.toast("Copiato");
                    }}
                    className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} /> Copia
                  </button>
                  <button onClick={() => share(v.testo)} className="h-9 px-3.5 rounded-full bg-card text-[13px] font-medium inline-flex items-center gap-1.5">
                    <ExternalLink size={13} /> Invia
                  </button>
                  <button onClick={() => keep(v.testo)} className="h-9 px-3.5 rounded-full bg-brand text-brand-fg text-[13px] font-semibold inline-flex items-center gap-1.5">
                    <Star size={13} /> Salva
                  </button>
                </div>
              </div>
            ))}
          </div>
          {res.consiglio && (
            <div className="mt-3 rounded-[16px] bg-card p-4 text-[14px]">
              <b>Galateo:</b> {res.consiglio}
            </div>
          )}
        </>
      )}

      {saved.length > 0 && (
        <>
          <H>Salvate</H>
          <div className="space-y-2.5">
            {saved.map((l) => (
              <div key={l.id} className="rounded-[18px] bg-surface shadow-soft p-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold flex-1">
                    {l.tipo}
                    {l.person_id && people?.find((p) => p.id === l.person_id) ? ` · ${people.find((p) => p.id === l.person_id)!.nome}` : ""}
                  </span>
                  <button onClick={() => share(l.testo)} className="h-8 w-8 grid place-items-center text-muted" aria-label="Invia">
                    <ExternalLink size={14} />
                  </button>
                  <button onClick={() => supabase.from("letters").delete().eq("id", l.id).then(load)} className="h-8 w-8 grid place-items-center text-muted" aria-label="Elimina">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-[14.5px] leading-relaxed mt-1 whitespace-pre-wrap">{l.testo}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
