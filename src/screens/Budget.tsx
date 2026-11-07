import { Check, Hammer, Phone, Plus, Scissors, ShoppingBag, Trash2, Wallet } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { GarmentImg, inputCls, Sheet } from "../components/ui";
import { Path } from "../gentleman/types";
import { useApp } from "../lib/store";
import { Budget, CATEGORIE, Garment, supabase } from "../lib/supabase";

type Purchase = { id: string; day: string; nome: string; categoria: string | null; tipo: string; prezzo: number; negozio: string | null };
type Wish = { id: string; nome: string; categoria: string | null; priorita: string; prezzo_stimato: number | null; motivo: string | null; comprato: boolean };
type Artisan = { id: string; tipo: string; nome: string; indirizzo: string | null; telefono: string | null; note: string | null };

const TIPI_SPESA = ["Acquisto", "Sarto", "Calzolaio", "Lavanderia", "Cura e prodotti"];
const TIPI_ARTIGIANO = ["Sarto", "Camiciaio", "Calzolaio", "Barbiere", "Lavanderia", "Altro"];
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = (s: string | null | undefined) => {
  const n = parseFloat(String(s ?? "").replace(/[^\d,.]/g, "").replace(",", "."));
  return isFinite(n) ? n : null;
};

/* Strategie per fascia di budget: principi consolidati di guardaroba (capsule, palette neutra, sarto, costo per utilizzo). */
const STRATEGIE: { id: string; nome: string; da: number; a: number; intro: string; regole: string[]; si: string[]; no: string[] }[] = [
  {
    id: "essenziale",
    nome: "Pochi soldi, molta testa",
    da: 0,
    a: 100,
    intro: "Con un budget stretto l'eleganza non si compra: si costruisce con la logica. Pochi capi che si abbinano tutti tra loro, sistemati dal sarto, tenuti benissimo.",
    regole: [
      "Palette chiusa: blu navy, grigio, bianco, azzurro, marrone. Tutto si abbina con tutto, quindi ogni capo nuovo moltiplica gli outfit.",
      "Prima la vestibilità, poi il marchio: un capo da catena fatto stringere dal sarto (10–20 €) sembra di un'altra categoria.",
      "Leggi l'etichetta: fibre naturali (lana, cotone, lino) e cuciture dritte e fitte. Evita il poliestere su giacche e pantaloni eleganti.",
      "Un capo alla volta, in ordine di priorità: meglio un mese senza acquisti che un acquisto sbagliato.",
      "Calcola il costo per utilizzo: 60 € per una camicia messa 50 volte valgono più di 20 € per una messa due volte.",
    ],
    si: ["T-shirt, polo e maglie in cotone o merino dalle catene", "Camicie oxford bianche e azzurre", "Chino blu e beige", "Usato e vintage per giacche e cappotti in lana", "Saldi e outlet per le scarpe in pelle"],
    no: ["Giacche strutturate economiche in sintetico", "Scarpe in similpelle o con suola incollata sottile", "Capi di tendenza che durano una stagione", "Colori e fantasie che si abbinano a un solo capo"],
  },
  {
    id: "intermedio",
    nome: "Qualità dove conta",
    da: 100,
    a: 300,
    intro: "Il budget permette di salire di livello sui capi che si vedono e durano: giacca, cappotto, scarpe. Sul resto si continua a risparmiare con criterio.",
    regole: [
      "Spendi di più su ciò che usi di più e che dura anni: scarpe, giacca blu, cappotto.",
      "Il su misura industriale (made to measure) costa poco più della confezione e veste molto meglio.",
      "Metti da parte una quota ogni mese per un acquisto importante ogni 3–4 mesi.",
      "Continua a far sistemare tutto dal sarto: è la differenza tra «vestito bene» e «vestito su misura».",
      "Cura e manutenzione (calzolaio, lavanderia, forme per scarpe) fanno durare il doppio quello che compri.",
    ],
    si: ["Una giacca blu in lana da sartoria industriale o made to measure", "Scarpe Goodyear risuolabili", "Un cappotto in lana di buona composizione", "Camicie con collo e polsi ben costruiti"],
    no: ["Inseguire i marchi invece dei materiali", "Comprare tanti capi medi invece di pochi buoni"],
  },
  {
    id: "sartoriale",
    nome: "La via sartoriale",
    da: 300,
    a: Infinity,
    intro: "Con questo budget la strada del gentleman è quella dell'artigiano: un abito su misura, il camiciaio, il calzolaio di fiducia. Si compra meno, si sceglie di più.",
    regole: [
      "Costruisci il rapporto con un sarto: il primo abito serve a lui per conoscerti, dal secondo in poi è davvero tuo.",
      "Prima i capi versatili (abito blu, abito grigio, giacca spezzata), poi quelli speciali.",
      "Tessuti adatti al clima: lane fresche e leggere per l'estate del Sud, flanelle e tweed per l'inverno.",
      "Tieni un registro di misure, tessuti e preferenze: il sarto lavora meglio e tu compri con criterio.",
    ],
    si: ["Abito su misura", "Camicie dal camiciaio", "Scarpe di manifattura con forme", "Cravatte e accessori artigianali"],
    no: ["Comprare d'impulso perché «tanto me lo posso permettere»", "Capi troppo particolari come primo acquisto"],
  },
];

const Box = ({ title, icon, children, right }: { title: string; icon?: ReactNode; children: ReactNode; right?: ReactNode }) => (
  <section className="mt-6">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
        {icon || <span className="h-1.5 w-1.5 rounded-full bg-gold" />} {title}
      </h2>
      {right}
    </div>
    {children}
  </section>
);

export function BudgetScreen() {
  const app = useApp();
  const budget: Budget = app.profile?.budget || { mensile: 0 };
  const path = (app.profile?.path as Path | null) ?? null;
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [wish, setWish] = useState<Wish[]>([]);
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [sheet, setSheet] = useState<"" | "spesa" | "desiderio" | "artigiano" | "budget">("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [uses, setUses] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const year = new Date().getFullYear();
    const [p, w, a] = await Promise.all([
      supabase.from("purchases").select("*").gte("day", `${year}-01-01`).order("day", { ascending: false }),
      supabase.from("wishlist").select("*").order("created_at"),
      supabase.from("artisans").select("*").order("tipo"),
    ]);
    setPurchases((p.data as Purchase[]) || []);
    setWish((w.data as Wish[]) || []);
    setArtisans((a.data as Artisan[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const month = new Date().toISOString().slice(0, 7);
  const spentMonth = purchases.filter((p) => p.day.startsWith(month)).reduce((s, p) => s + Number(p.prezzo), 0);
  const spentYear = purchases.reduce((s, p) => s + Number(p.prezzo), 0);
  const left = budget.mensile - spentMonth;
  const strat = STRATEGIE.find((s) => budget.mensile >= s.da && budget.mensile < s.a) || STRATEGIE[0];
  const openWish = wish.filter((w) => !w.comprato);
  const wishTotal = openWish.reduce((s, w) => s + Number(w.prezzo_stimato || 0), 0);

  /* combinazioni possibili con i capi che hai */
  const combo = useMemo(() => {
    const c = (cats: string[]) => app.garments.filter((g) => cats.includes(g.categoria)).length;
    const base = { sopra: c(["Maglie", "Camicie", "Felpe e Maglioni", "Canotte"]), giacche: c(["Giacche e Cappotti"]), sotto: c(["Pantaloni"]), scarpe: c(["Scarpe"]) };
    const calc = (b: typeof base) => b.sopra * (b.giacche + 1) * b.sotto * b.scarpe;
    const total = calc(base);
    const options = (
      [
        ["sopra", "una maglia o camicia"],
        ["giacche", "una giacca"],
        ["sotto", "un pantalone"],
        ["scarpe", "un paio di scarpe"],
      ] as const
    ).map(([k, label]) => ({ label, gain: calc({ ...base, [k]: base[k] + 1 }) - total }));
    const best = options.sort((a, b) => b.gain - a.gain)[0];
    return { ...base, total, best };
  }, [app.garments]);

  /* costo per utilizzo */
  const priced = useMemo(
    () =>
      app.garments
        .map((g) => ({ g, prezzo: num(g.prezzo), utilizzi: uses[g.id] ?? (g as Garment & { utilizzi?: number }).utilizzi ?? 0 }))
        .filter((x) => x.prezzo)
        .map((x) => ({ ...x, cpw: x.prezzo! / Math.max(1, x.utilizzi) }))
        .sort((a, b) => b.cpw - a.cpw),
    [app.garments, uses],
  );
  const wore = async (g: Garment, n: number) => {
    setUses((u) => ({ ...u, [g.id]: n }));
    navigator.vibrate?.(10);
    await supabase.from("garments").update({ utilizzi: n }).eq("id", g.id);
  };

  const f = (k: string) => form[k] || "";
  const setF = (k: string, v: string) => setForm((x) => ({ ...x, [k]: v }));
  const close = () => {
    setSheet("");
    setForm({});
  };

  const save = async () => {
    if (sheet === "budget") {
      await app.setProfile({ budget: { ...budget, mensile: num(f("mensile")) || 0, approccio: (f("approccio") || budget.approccio) as Budget["approccio"] } });
    } else if (sheet === "spesa") {
      if (!f("nome") || num(f("prezzo")) == null) return app.toast("Nome e prezzo, per favore");
      await supabase.from("purchases").insert({ nome: f("nome"), tipo: f("tipo") || "Acquisto", prezzo: num(f("prezzo")), negozio: f("negozio") || null, categoria: f("categoria") || null, day: f("day") || undefined });
      if (f("wish")) await supabase.from("wishlist").update({ comprato: true }).eq("id", f("wish"));
    } else if (sheet === "desiderio") {
      if (!f("nome")) return;
      await supabase.from("wishlist").insert({ nome: f("nome"), categoria: f("categoria") || null, priorita: f("priorita") || "media", prezzo_stimato: num(f("prezzo")), motivo: f("motivo") || null });
    } else if (sheet === "artigiano") {
      if (!f("nome")) return;
      await supabase.from("artisans").insert({ tipo: f("tipo") || "Sarto", nome: f("nome"), indirizzo: f("indirizzo") || null, telefono: f("telefono") || null, note: f("note") || null });
    }
    close();
    load();
  };

  const importEssentials = async () => {
    const ess = path?.guardaroba?.essenziali || [];
    const have = new Set(wish.map((w) => w.nome.toLowerCase()));
    const rows = ess.filter((e) => !have.has(e.nome.toLowerCase())).map((e) => ({ nome: e.nome, priorita: e.priorita, prezzo_stimato: e.costo_stimato ?? num(e.budget), motivo: [e.dove, e.ricerca].filter(Boolean).join(" · ") || null }));
    if (!rows.length) return app.toast("Già tutti in lista");
    await supabase.from("wishlist").insert(rows);
    app.toast(`${rows.length} capi aggiunti`);
    load();
  };

  const chip = (opts: string[], k: string, def: string) => (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button key={o} onClick={() => setF(k, o)} className={`h-9 px-3.5 rounded-full text-[13px] font-medium ${(f(k) || def) === o ? "bg-brand text-brand-fg" : "bg-card"}`}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12 max-w-[980px]">
      <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Budget e acquisti</h1>
      <p className="text-[14.5px] text-muted mt-2">Il gentleman non spende di più: spende meglio. Qui decidi quanto, dove e in che ordine.</p>

      {/* Budget del mese */}
      <button
        onClick={() => {
          setForm({ mensile: String(budget.mensile || ""), approccio: budget.approccio || "" });
          setSheet("budget");
        }}
        className="mt-5 w-full text-left rounded-[24px] bg-hero text-herofg p-6"
      >
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">{new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</div>
          <Wallet size={18} className="text-gold" />
        </div>
        {budget.mensile ? (
          <>
            <div className="mt-2 flex items-end gap-3 flex-wrap">
              <div className="font-display text-[40px] font-semibold leading-none">{eur(Math.max(0, left))}</div>
              <div className="text-[13.5px] opacity-75 pb-1">{left >= 0 ? `rimasti su ${eur(budget.mensile)}` : `oltre il budget di ${eur(-left)}`}</div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${left < 0 ? "bg-burgundy" : "bg-gold"}`} style={{ width: `${Math.min(100, (spentMonth / budget.mensile) * 100)}%` }} />
            </div>
            <div className="text-[12px] opacity-60 mt-1.5">
              Speso questo mese {eur(spentMonth)} · nell'anno {eur(spentYear)} su {eur(budget.mensile * 12)}
            </div>
          </>
        ) : (
          <div className="mt-2">
            <div className="font-display text-[28px] font-semibold">Fissa il tuo budget mensile</div>
            <div className="text-[13.5px] opacity-75 mt-1">Comprese le spese dal sarto e dal calzolaio. Tocca per impostarlo.</div>
          </div>
        )}
      </button>

      {/* Strategia */}
      <Box title={`La tua strategia · ${strat.nome}`}>
        <div className="rounded-[22px] bg-surface shadow-soft p-5">
          <p className="text-[14.5px] leading-relaxed">{strat.intro}</p>
          {path?.guardaroba?.strategia && <p className="text-[14px] leading-relaxed mt-3 rounded-[14px] bg-gold-tint p-3.5">{path.guardaroba.strategia}</p>}
          <ol className="mt-4 space-y-2.5">
            {strat.regole.map((r, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                <span className="h-6 w-6 rounded-full bg-brand text-brand-fg grid place-items-center text-[12px] font-bold shrink-0">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-card p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold mb-1.5">Su cosa puntare</div>
              <ul className="space-y-1 text-[13.5px]">
                {strat.si.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[14px] bg-card p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-burgundy mb-1.5">Da evitare</div>
              <ul className="space-y-1 text-[13.5px]">
                {strat.no.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Box>

      {/* Combinazioni */}
      <Box title="Quanti outfit hai già">
        <div className="rounded-[22px] bg-surface shadow-soft p-5">
          {combo.total ? (
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-[40px] font-semibold leading-none">{combo.total.toLocaleString("it-IT")}</span>
                <span className="text-[13.5px] text-muted pb-1">combinazioni possibili</span>
              </div>
              <div className="text-[13px] text-muted mt-1">
                {combo.sopra} sopra · {combo.giacche} giacche · {combo.sotto} pantaloni · {combo.scarpe} scarpe
              </div>
              <div className="mt-3 rounded-[14px] bg-gold-tint p-3.5 text-[14px]">
                Il prossimo acquisto che rende di più: <b>{combo.best.label}</b>, +{combo.best.gain.toLocaleString("it-IT")} combinazioni. Sceglilo in un colore neutro, così si abbina davvero a tutto.
              </div>
            </>
          ) : (
            <div className="text-[14px] text-muted">Aggiungi all'armadio almeno un capo sopra, un pantalone e un paio di scarpe per calcolare le combinazioni.</div>
          )}
        </div>
      </Box>

      {/* Lista dei desideri */}
      <Box
        title="Piano acquisti"
        icon={<ShoppingBag size={13} className="text-gold" />}
        right={
          <button onClick={() => setSheet("desiderio")} className="text-[13px] text-gold font-semibold flex items-center gap-1">
            <Plus size={14} /> Aggiungi
          </button>
        }
      >
        <div className="rounded-[22px] bg-surface shadow-soft">
          {openWish.length === 0 ? (
            <div className="p-5 text-[14px] text-muted">
              Nessun capo in programma.
              {path?.guardaroba?.essenziali?.length ? (
                <button onClick={importEssentials} className="block mt-2 text-gold font-semibold">
                  Importa i capi essenziali del tuo percorso
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="divide-y divide-line">
                {[...openWish]
                  .sort((a, b) => ["alta", "media", "bassa"].indexOf(a.priorita) - ["alta", "media", "bassa"].indexOf(b.priorita))
                  .map((w) => (
                    <div key={w.id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${w.priorita === "alta" ? "bg-gold" : w.priorita === "media" ? "bg-gold/50" : "bg-line"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-medium">{w.nome}</div>
                        {w.motivo && <div className="text-[12px] text-muted truncate">{w.motivo}</div>}
                      </div>
                      {w.prezzo_stimato != null && <span className="text-[13px] text-muted">{eur(Number(w.prezzo_stimato))}</span>}
                      <button
                        onClick={() => {
                          setForm({ nome: w.nome, prezzo: w.prezzo_stimato ? String(w.prezzo_stimato) : "", wish: w.id, categoria: w.categoria || "" });
                          setSheet("spesa");
                        }}
                        className="h-8 px-3 rounded-full bg-card text-[12.5px] font-semibold"
                      >
                        Comprato
                      </button>
                      <button onClick={() => supabase.from("wishlist").delete().eq("id", w.id).then(load)} className="text-muted p-1" aria-label="Elimina">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="px-5 py-3 border-t border-line text-[13px] text-muted">
                Totale {eur(wishTotal)}
                {budget.mensile ? ` · circa ${Math.ceil(wishTotal / budget.mensile)} mesi di budget` : ""}
              </div>
            </>
          )}
        </div>
      </Box>

      {/* Spese */}
      <Box
        title="Spese dell'anno"
        right={
          <button onClick={() => setSheet("spesa")} className="text-[13px] text-gold font-semibold flex items-center gap-1">
            <Plus size={14} /> Registra
          </button>
        }
      >
        <div className="rounded-[22px] bg-surface shadow-soft divide-y divide-line">
          {purchases.length === 0 && <div className="p-5 text-[14px] text-muted">Registra acquisti e spese dal sarto o dal calzolaio: il budget si aggiorna da solo.</div>}
          {purchases.slice(0, 30).map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-3 text-[14px]">
              <span className="text-[12px] text-muted w-12 shrink-0">{new Date(p.day).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.nome}</div>
                <div className="text-[12px] text-muted">
                  {p.tipo}
                  {p.negozio ? ` · ${p.negozio}` : ""}
                </div>
              </div>
              <span className="font-semibold">{eur(Number(p.prezzo))}</span>
              <button onClick={() => supabase.from("purchases").delete().eq("id", p.id).then(load)} className="text-muted p-1" aria-label="Elimina">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </Box>

      {/* Costo per utilizzo */}
      <Box title="Costo per utilizzo">
        <div className="rounded-[22px] bg-surface shadow-soft">
          <div className="px-5 pt-4 text-[13px] text-muted">Prezzo diviso per le volte che lo indossi. Tocca + quando lo metti: più scende, meglio hai speso.</div>
          {priced.length === 0 ? (
            <div className="p-5 text-[14px] text-muted">Aggiungi il prezzo ai capi dell'armadio per vederlo qui.</div>
          ) : (
            <div className="divide-y divide-line mt-2">
              {priced.slice(0, 12).map(({ g, prezzo, utilizzi, cpw }) => (
                <div key={g.id} className="px-5 py-2.5 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-[10px] bg-card overflow-hidden shrink-0">
                    <GarmentImg g={g} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">{g.nome}</div>
                    <div className="text-[12px] text-muted">
                      {eur(prezzo!)} · {utilizzi} volte
                    </div>
                  </div>
                  <span className={`text-[13.5px] font-semibold ${cpw <= 5 ? "text-gold" : ""}`}>{eur(cpw)}</span>
                  <button onClick={() => wore(g, utilizzi + 1)} className="h-8 w-8 rounded-full bg-card grid place-items-center" aria-label="Indossato oggi">
                    <Plus size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Box>

      {/* Artigiani */}
      <Box
        title="I tuoi artigiani"
        icon={<Scissors size={13} className="text-gold" />}
        right={
          <button onClick={() => setSheet("artigiano")} className="text-[13px] text-gold font-semibold flex items-center gap-1">
            <Plus size={14} /> Aggiungi
          </button>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {artisans.length === 0 && (
            <div className="rounded-[22px] bg-surface shadow-soft p-5 text-[14px] text-muted sm:col-span-2">
              Sarto, camiciaio, calzolaio, barbiere: il gentleman ha i suoi artigiani di fiducia. Annotali qui con le tue misure e preferenze.
            </div>
          )}
          {artisans.map((a) => (
            <div key={a.id} className="rounded-[18px] bg-surface shadow-soft p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-gold-tint grid place-items-center shrink-0">
                  <Hammer size={16} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] uppercase tracking-[0.12em] text-gold font-bold">{a.tipo}</div>
                  <div className="text-[15px] font-semibold">{a.nome}</div>
                  {a.indirizzo && <div className="text-[12.5px] text-muted">{a.indirizzo}</div>}
                  {a.note && <div className="text-[12.5px] mt-1 whitespace-pre-wrap">{a.note}</div>}
                </div>
                <div className="flex flex-col gap-1">
                  {a.telefono && (
                    <a href={`tel:${a.telefono.replace(/\s/g, "")}`} className="h-8 w-8 rounded-full bg-card grid place-items-center" aria-label="Chiama">
                      <Phone size={14} />
                    </a>
                  )}
                  <button onClick={() => supabase.from("artisans").delete().eq("id", a.id).then(load)} className="h-8 w-8 grid place-items-center text-muted" aria-label="Elimina">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Box>

      <Sheet open={!!sheet} onClose={close} title={{ spesa: "Registra una spesa", desiderio: "Aggiungi al piano acquisti", artigiano: "Nuovo artigiano", budget: "Il tuo budget", "": "" }[sheet]}>
        <div className="space-y-3.5 pb-6">
          {sheet === "budget" && (
            <>
              <input inputMode="decimal" placeholder="Budget mensile in €" value={f("mensile")} onChange={(e) => setF("mensile", e.target.value)} className={inputCls} />
              <div className="text-[13px] text-muted">Approccio</div>
              {chip(["qualita", "mix", "quantita"], "approccio", budget.approccio || "mix")}
              <div className="text-[12px] text-muted">qualità = pochi capi buoni · mix = qualità dove conta · quantità = più capi a prezzo contenuto</div>
            </>
          )}
          {sheet === "spesa" && (
            <>
              {chip(TIPI_SPESA, "tipo", "Acquisto")}
              <input placeholder="Cosa (es. orlo pantaloni blu)" value={f("nome")} onChange={(e) => setF("nome", e.target.value)} className={inputCls} />
              <input inputMode="decimal" placeholder="Prezzo €" value={f("prezzo")} onChange={(e) => setF("prezzo", e.target.value)} className={inputCls} />
              <input placeholder="Negozio o artigiano (facoltativo)" value={f("negozio")} onChange={(e) => setF("negozio", e.target.value)} className={inputCls} />
              <input type="date" value={f("day") || new Date().toISOString().slice(0, 10)} onChange={(e) => setF("day", e.target.value)} className={inputCls} />
            </>
          )}
          {sheet === "desiderio" && (
            <>
              <input placeholder="Capo (es. giacca blu in lana)" value={f("nome")} onChange={(e) => setF("nome", e.target.value)} className={inputCls} />
              {chip(["alta", "media", "bassa"], "priorita", "media")}
              <select value={f("categoria")} onChange={(e) => setF("categoria", e.target.value)} className={inputCls}>
                <option value="">Categoria</option>
                {CATEGORIE.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input inputMode="decimal" placeholder="Prezzo stimato €" value={f("prezzo")} onChange={(e) => setF("prezzo", e.target.value)} className={inputCls} />
              <input placeholder="Perché / dove (es. usato, poi dal sarto)" value={f("motivo")} onChange={(e) => setF("motivo", e.target.value)} className={inputCls} />
            </>
          )}
          {sheet === "artigiano" && (
            <>
              {chip(TIPI_ARTIGIANO, "tipo", "Sarto")}
              <input placeholder="Nome" value={f("nome")} onChange={(e) => setF("nome", e.target.value)} className={inputCls} />
              <input placeholder="Indirizzo" value={f("indirizzo")} onChange={(e) => setF("indirizzo", e.target.value)} className={inputCls} />
              <input inputMode="tel" placeholder="Telefono" value={f("telefono")} onChange={(e) => setF("telefono", e.target.value)} className={inputCls} />
              <textarea placeholder="Note: misure, tessuti, preferenze, prezzi…" value={f("note")} onChange={(e) => setF("note", e.target.value)} className="w-full min-h-[90px] p-3 rounded-2xl bg-card text-[16px] outline-none" />
            </>
          )}
          <button onClick={save} className="w-full h-12 rounded-full bg-brand text-brand-fg font-semibold flex items-center justify-center gap-2">
            <Check size={17} /> Salva
          </button>
        </div>
      </Sheet>
    </div>
  );
}
