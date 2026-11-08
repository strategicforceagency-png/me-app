import { Camera, Check, Palette as Palette2Icon, Copy, ExternalLink, Glasses, Loader2, RefreshCw, Scissors, ShieldAlert, Shirt, Sparkles, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AlfredAvatar } from "../components/AlfredIcon";
import { inputCls } from "../components/ui";
import { useApp } from "../lib/store";
import { fn, supabase, uploadImage, useSignedUrl } from "../lib/supabase";

type Taglio = {
  nome: string;
  nome_inglese?: string;
  perche: string;
  lati?: string;
  sopra?: string;
  nuca?: string;
  riga?: string;
  manutenzione?: string;
  prodotto?: string;
  styling?: string;
  formalita?: string;
  ricerca?: string;
  per_il_barbiere?: string;
};
type Analisi = {
  qualita_foto?: string;
  forma: { tipo: string; alternativa?: string | null; perche: string; proporzioni?: Record<string, string> };
  capelli?: { tipo?: string; densita?: string; attaccatura?: string; note?: string };
  tagli: Taglio[];
  da_evitare?: { cosa: string; perche: string }[];
  barba?: { consiglio?: string; crescita?: string; stili?: Barba[]; forma?: string; contorni?: string; manutenzione?: string };
  palette?: Palette;
  montature?: { forme?: string[]; evitare?: string[]; perche?: string };
  colletti?: { camicia?: string; nodo?: string; perche?: string; cappelli?: string };
  sopracciglia?: string | null;
  riassunto?: string;
};
type Barba = { nome: string; perche?: string; lunghezza?: string; forma?: string; contorni?: string; baffi?: string; manutenzione?: string; prodotti?: string; per_il_barbiere?: string; ricerca?: string };
type Colore = { nome: string; hex: string; uso?: string; perche?: string };
export type Palette = {
  sottotono?: string;
  contrasto?: string;
  stagione?: string;
  perche?: string;
  affidabilita?: string;
  colori?: Colore[];
  neutri?: Colore[];
  evitare?: Colore[];
  metalli?: string;
  consigli?: Record<string, string>;
};
type Row = { id: string; foto: string[]; preferenze: Record<string, string>; analisi: Analisi | null; scelto: number | null; scelto_barba: number | null; created_at: string };

const SLOT = [
  { label: "Di fronte", hint: "obbligatoria" },
  { label: "Di profilo", hint: "consigliata" },
  { label: "Tre quarti", hint: "facoltativa" },
];
const PREF: { id: string; label: string; opts: string[] }[] = [
  { id: "capelli", label: "I tuoi capelli", opts: ["Lisci", "Mossi", "Ricci", "Non so"] },
  { id: "tempo", label: "Tempo al mattino per i capelli", opts: ["1 minuto", "5 minuti", "10 minuti o più"] },
  { id: "barba", label: "Barba", opts: ["Rasato", "Barba corta", "Barba lunga", "Decidi tu"] },
  { id: "lavoro", label: "Contesto di lavoro", opts: ["Formale", "Smart casual", "Libero"] },
];

const H = ({ children, icon }: { children: ReactNode; icon?: ReactNode }) => (
  <h2 className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted flex items-center gap-2">
    {icon || <span className="h-1.5 w-1.5 rounded-full bg-gold" />} {children}
  </h2>
);
const Chips = ({ opts, value, onChange }: { opts: string[]; value?: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {opts.map((o) => (
      <button key={o} onClick={() => onChange(value === o ? "" : o)} className={`h-9 px-3.5 rounded-full text-[13.5px] font-medium transition ${value === o ? "bg-brand text-brand-fg" : "bg-card"}`}>
        {o}
      </button>
    ))}
  </div>
);
const Fact = ({ k, v }: { k: string; v?: string | null }) =>
  v ? (
    <div className="rounded-[12px] bg-card px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">{k}</div>
      <div className="text-[14px] leading-snug mt-0.5">{v}</div>
    </div>
  ) : null;

function Thumb({ path, className = "" }: { path: string; className?: string }) {
  const url = useSignedUrl("fisionomia", path);
  return url ? <img src={url} alt="" className={`object-cover ${className}`} /> : <div className={`bg-card ${className}`} />;
}

export function FaceScreen() {
  const app = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [nuova, setNuova] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("fisionomia").select("*").order("created_at", { ascending: false }).limit(20);
    setRows((data as Row[]) || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const done = (rows || []).filter((r) => r.analisi);
  const cur = done.find((r) => r.id === view) || done[0];

  return (
    <div className="px-5 lg:px-10 pb-32 max-w-[860px]">
      <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Fisionomia</h1>
      <p className="text-[14.5px] text-muted mt-2 leading-relaxed">Una foto del viso e capisco forma e proporzioni: il taglio di capelli e la barba che ti valorizzano, con la frase pronta per il barbiere, la tua armocromia, le montature e i colletti.</p>

      {rows === null ? (
        <div className="grid place-items-center py-16 text-muted">
          <Loader2 className="animate-spin" />
        </div>
      ) : !cur || nuova ? (
        <NewAnalysis
          onCancel={cur ? () => setNuova(false) : undefined}
          onDone={async (id) => {
            await Promise.all([load(), app.reload()]);
            setView(id);
            setNuova(false);
            app.toast("Analisi pronta");
          }}
        />
      ) : (
        <>
          <Result
            row={cur}
            onChooseBeard={async (i) => {
              await supabase.from("fisionomia").update({ scelto_barba: i }).eq("id", cur.id);
              setRows((rs) => (rs || []).map((r) => (r.id === cur.id ? { ...r, scelto_barba: i } : r)));
              app.toast("Barba scelta: Alfred ne terrà conto");
            }}
            onChoose={async (i) => {
              await supabase.from("fisionomia").update({ scelto: i }).eq("id", cur.id);
              setRows((rs) => (rs || []).map((r) => (r.id === cur.id ? { ...r, scelto: i } : r)));
              app.toast("Taglio scelto: Alfred ne terrà conto");
            }}
          />
          <div className="mt-8 flex flex-wrap gap-2">
            <button onClick={() => setNuova(true)} className="h-11 px-5 rounded-full bg-brand text-brand-fg text-[14px] font-semibold flex items-center gap-2">
              <RefreshCw size={16} /> Nuova analisi
            </button>
          </div>
          {done.length > 1 && (
            <>
              <H>Analisi precedenti</H>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {done.map((r) => (
                  <button key={r.id} onClick={() => setView(r.id)} className={`shrink-0 w-[110px] text-left rounded-[14px] overflow-hidden bg-card ${r.id === cur.id ? "ring-2 ring-gold" : ""}`}>
                    <Thumb path={r.foto[0]} className="h-[110px] w-full" />
                    <div className="px-2.5 py-2">
                      <div className="text-[12.5px] font-semibold capitalize">{r.analisi?.forma.tipo}</div>
                      <div className="text-[11px] text-muted">{new Date(r.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "2-digit" })}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function NewAnalysis({ onDone, onCancel }: { onDone: (id: string) => void; onCancel?: () => void }) {
  const app = useApp();
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [pref, setPref] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const go = async () => {
    if (!files[0]) return app.toast("Serve almeno la foto di fronte");
    setBusy("Carico le foto…");
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const paths: string[] = [];
      for (const f of files) if (f) paths.push(await uploadImage("fisionomia", uid, f, "viso"));
      const { data: row, error } = await supabase.from("fisionomia").insert({ foto: paths, preferenze: pref }).select("id").single();
      if (error) throw error;
      setBusy("Studio forma e proporzioni…");
      await fn("fisionomia", "", { id: row.id });
      onDone(row.id);
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <>
      <H>Le foto</H>
      <div className="grid grid-cols-3 gap-2.5">
        {SLOT.map((s, i) => {
          const f = files[i];
          return (
            <div key={s.label} className="relative">
              <input
                ref={refs[i]}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFiles((x) => x.map((y, j) => (j === i ? file : y)));
                }}
              />
              <button onClick={() => refs[i].current?.click()} className={`w-full aspect-[3/4] rounded-[16px] overflow-hidden grid place-items-center ${f ? "" : "bg-card border border-dashed border-line"}`}>
                {f ? (
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-muted">
                    <Camera size={22} />
                    <span className="text-[12.5px] font-semibold text-ink">{s.label}</span>
                    <span className="text-[11px]">{s.hint}</span>
                  </span>
                )}
              </button>
              {f && (
                <button onClick={() => setFiles((x) => x.map((y, j) => (j === i ? null : y)))} className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 text-white grid place-items-center" aria-label="Togli">
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-[16px] bg-card p-3.5 text-[13px] text-muted leading-relaxed">
        <b className="text-ink">Per un'analisi precisa:</b> luce naturale davanti a te, niente occhiali né cappello, capelli asciutti come li porti di solito, telefono all'altezza degli occhi e a un braccio di distanza, viso e collo interi nell'inquadratura.
      </div>

      <H>Qualche dettaglio</H>
      <div className="space-y-4">
        {PREF.map((p) => (
          <div key={p.id}>
            <div className="text-[13px] font-semibold mb-1.5">{p.label}</div>
            <Chips opts={p.opts} value={pref[p.id]} onChange={(v) => setPref((x) => ({ ...x, [p.id]: v }))} />
          </div>
        ))}
        <input value={pref.note || ""} onChange={(e) => setPref((x) => ({ ...x, note: e.target.value }))} placeholder="Altro? (es. non voglio la riga, ho un vortice sulla nuca)" autoComplete="off" className={inputCls} />
      </div>

      <div className="mt-6 flex gap-2">
        <button onClick={go} disabled={!!busy} className="flex-1 h-12 rounded-full bg-brand text-brand-fg text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} {busy || "Analizza il mio viso"}
        </button>
        {onCancel && !busy && (
          <button onClick={onCancel} className="h-12 px-5 rounded-full bg-card text-[14px] font-semibold">
            Annulla
          </button>
        )}
      </div>
      <p className="mt-3 text-[12px] text-muted">Le foto restano private nel tuo spazio e servono solo a questa analisi.</p>
    </>
  );
}

function Result({ row, onChoose, onChooseBeard }: { row: Row; onChoose: (i: number) => void; onChooseBeard: (i: number) => void }) {
  const app = useApp();
  const a = row.analisi!;
  const [tab, setTab] = useState(row.scelto ?? 0);
  useEffect(() => setTab(row.scelto ?? 0), [row.id, row.scelto]);
  const t = a.tagli[tab];
  const barbe = a.barba?.stili || [];
  const [btab, setBtab] = useState(row.scelto_barba ?? 0);
  useEffect(() => setBtab(row.scelto_barba ?? 0), [row.id, row.scelto_barba]);
  const bt = barbe[btab];
  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      app.toast("Copiato: mostralo al barbiere");
    } catch {
      app.toast("Non riesco a copiare");
    }
  };
  return (
    <>
      <div className="mt-6 rounded-[22px] bg-hero text-herofg p-5 flex gap-4">
        <Thumb path={row.foto[0]} className="h-[120px] w-[96px] rounded-[14px] shrink-0" />
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Forma del viso</div>
          <div className="font-display text-[30px] leading-tight capitalize mt-1">{a.forma.tipo}</div>
          {a.forma.alternativa && <div className="text-[12.5px] opacity-70">con tratti {a.forma.alternativa}</div>}
          <p className="text-[13.5px] opacity-85 mt-2 leading-relaxed">{a.forma.perche}</p>
        </div>
      </div>
      {a.forma.proporzioni && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {Object.entries(a.forma.proporzioni).map(([k, v]) => (
            <Fact key={k} k={k} v={v} />
          ))}
        </div>
      )}
      {a.riassunto && (
        <div className="mt-4 flex gap-3 rounded-[18px] bg-surface shadow-soft p-4">
          <AlfredAvatar size={36} className="shrink-0" />
          <p className="text-[14.5px] leading-relaxed italic">{a.riassunto}</p>
        </div>
      )}
      {a.qualita_foto && !/^ok\b/i.test(a.qualita_foto) && <div className="mt-3 text-[12.5px] text-muted">📷 {a.qualita_foto}</div>}

      <H icon={<Scissors size={13} className="text-gold" />}>Il taglio per te</H>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {a.tagli.map((x, i) => (
          <button key={i} onClick={() => setTab(i)} className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5 ${tab === i ? "bg-brand text-brand-fg" : "bg-card"}`}>
            {row.scelto === i && <Check size={13} />} {x.nome}
          </button>
        ))}
      </div>
      {t && (
        <div className="mt-3 rounded-[20px] bg-surface shadow-soft p-4">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="font-display text-[22px] leading-tight">{t.nome}</div>
              {t.nome_inglese && <div className="text-[12.5px] text-muted">{t.nome_inglese}</div>}
            </div>
            {tab === 0 && <span className="text-[11px] font-bold uppercase tracking-[.08em] text-gold bg-gold/15 rounded-full px-2.5 py-1">Il più adatto</span>}
          </div>
          <p className="text-[14px] leading-relaxed mt-2">{t.perche}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Fact k="Lati" v={t.lati} />
            <Fact k="Sopra" v={t.sopra} />
            <Fact k="Nuca" v={t.nuca} />
            <Fact k="Riga" v={t.riga} />
            <Fact k="Ogni" v={t.manutenzione} />
            <Fact k="Prodotto" v={t.prodotto} />
          </div>
          {t.styling && (
            <div className="mt-2">
              <Fact k="Al mattino" v={t.styling} />
            </div>
          )}
          {t.formalita && <div className="mt-2 text-[12.5px] text-muted">Occasioni: {t.formalita}</div>}
          {t.per_il_barbiere && (
            <div className="mt-3 rounded-[14px] border border-gold/40 bg-gold/5 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[.1em] text-gold">Da leggere al barbiere</div>
              <p className="text-[14px] leading-relaxed mt-1">{t.per_il_barbiere}</p>
              <button onClick={() => copy(t.per_il_barbiere!)} className="mt-2 text-[12.5px] font-semibold text-gold flex items-center gap-1">
                <Copy size={13} /> Copia
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {row.scelto !== tab && (
              <button onClick={() => onChoose(tab)} className="h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold flex items-center gap-1.5">
                <Check size={15} /> Scelgo questo
              </button>
            )}
            <a href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(t.ricerca || `${t.nome_inglese || t.nome} men haircut`)}`} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full bg-card text-[13.5px] font-semibold flex items-center gap-1.5">
              <ExternalLink size={14} /> Foto di riferimento
            </a>
          </div>
        </div>
      )}

      {a.barba && (
        <>
          <H icon={<Scissors size={13} className="text-gold" />}>La barba per te</H>
          {a.barba.consiglio && <p className="text-[14.5px] leading-relaxed mb-1">{a.barba.consiglio}</p>}
          {a.barba.crescita && <p className="text-[12.5px] text-muted mb-3">{a.barba.crescita}</p>}
          {barbe.length > 0 ? (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {barbe.map((x, i) => (
                  <button key={i} onClick={() => setBtab(i)} className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5 ${btab === i ? "bg-brand text-brand-fg" : "bg-card"}`}>
                    {row.scelto_barba === i && <Check size={13} />} {x.nome}
                  </button>
                ))}
              </div>
              {bt && (
                <div className="mt-3 rounded-[20px] bg-surface shadow-soft p-4">
                  <div className="flex items-start gap-2">
                    <div className="font-display text-[22px] leading-tight flex-1">{bt.nome}</div>
                    {btab === 0 && <span className="text-[11px] font-bold uppercase tracking-[.08em] text-gold bg-gold/15 rounded-full px-2.5 py-1">La più adatta</span>}
                  </div>
                  {bt.perche && <p className="text-[14px] leading-relaxed mt-2">{bt.perche}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Fact k="Lunghezza" v={bt.lunghezza} />
                    <Fact k="Forma" v={bt.forma} />
                    <Fact k="Contorni" v={bt.contorni} />
                    <Fact k="Baffi" v={bt.baffi} />
                    <Fact k="Manutenzione" v={bt.manutenzione} />
                    <Fact k="Prodotti" v={bt.prodotti} />
                  </div>
                  {bt.per_il_barbiere && (
                    <div className="mt-3 rounded-[14px] border border-gold/40 bg-gold/5 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[.1em] text-gold">Da leggere al barbiere</div>
                      <p className="text-[14px] leading-relaxed mt-1">{bt.per_il_barbiere}</p>
                      <button onClick={() => copy(bt.per_il_barbiere!)} className="mt-2 text-[12.5px] font-semibold text-gold flex items-center gap-1">
                        <Copy size={13} /> Copia
                      </button>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.scelto_barba !== btab && (
                      <button onClick={() => onChooseBeard(btab)} className="h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold flex items-center gap-1.5">
                        <Check size={15} /> Scelgo questa
                      </button>
                    )}
                    <a href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(bt.ricerca || `${bt.nome} beard style men`)}`} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full bg-card text-[13.5px] font-semibold flex items-center gap-1.5">
                      <ExternalLink size={14} /> Foto di riferimento
                    </a>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[18px] bg-surface shadow-soft p-4 space-y-2">
              <Fact k="Forma" v={a.barba.forma} />
              <Fact k="Contorni" v={a.barba.contorni} />
              <Fact k="Manutenzione" v={a.barba.manutenzione} />
            </div>
          )}
        </>
      )}

      {a.palette?.colori?.length ? <PaletteView p={a.palette} /> : null}

      {!!a.da_evitare?.length && (
        <>
          <H icon={<ShieldAlert size={13} className="text-gold" />}>Da evitare</H>
          <div className="space-y-2">
            {a.da_evitare.map((x, i) => (
              <div key={i} className="rounded-[14px] bg-card px-3.5 py-2.5">
                <div className="text-[14px] font-semibold">{x.cosa}</div>
                <div className="text-[13px] text-muted">{x.perche}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {a.capelli && (
        <>
          <H>I tuoi capelli</H>
          <div className="grid grid-cols-2 gap-2">
            <Fact k="Tipo" v={a.capelli.tipo} />
            <Fact k="Densità" v={a.capelli.densita} />
            <Fact k="Attaccatura" v={a.capelli.attaccatura} />
            <Fact k="Note" v={a.capelli.note} />
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        {a.montature && (
          <div>
            <H icon={<Glasses size={13} className="text-gold" />}>Montature</H>
            <div className="rounded-[18px] bg-surface shadow-soft p-4">
              <div className="flex flex-wrap gap-1.5">
                {(a.montature.forme || []).map((f) => (
                  <span key={f} className="rounded-full bg-gold/15 px-3 py-1 text-[13px]">
                    {f}
                  </span>
                ))}
              </div>
              {!!a.montature.evitare?.length && <div className="mt-2 text-[13px] text-muted">Evita: {a.montature.evitare.join(", ")}</div>}
              {a.montature.perche && <p className="mt-2 text-[13.5px] leading-relaxed">{a.montature.perche}</p>}
            </div>
          </div>
        )}
        {a.colletti && (
          <div>
            <H icon={<Shirt size={13} className="text-gold" />}>Colletti e nodi</H>
            <div className="rounded-[18px] bg-surface shadow-soft p-4 space-y-2">
              <Fact k="Camicia" v={a.colletti.camicia} />
              <Fact k="Nodo" v={a.colletti.nodo} />
              <Fact k="Cappelli" v={a.colletti.cappelli} />
              {a.colletti.perche && <p className="text-[13.5px] leading-relaxed">{a.colletti.perche}</p>}
            </div>
          </div>
        )}
      </div>
      {a.sopracciglia && <div className="mt-4 text-[13.5px] text-muted leading-relaxed">✦ {a.sopracciglia}</div>}
    </>
  );
}

const Swatch = ({ c, small }: { c: Colore; small?: boolean }) => (
  <div className={small ? "w-[64px]" : "w-[78px]"}>
    <div className={`${small ? "h-11" : "h-14"} rounded-[12px] ring-1 ring-black/10`} style={{ background: /^#[0-9a-f]{3,8}$/i.test(c.hex) ? c.hex : "#888" }} />
    <div className="text-[11.5px] font-medium leading-tight mt-1">{c.nome}</div>
    {c.uso && !small && <div className="text-[10.5px] text-muted leading-tight">{c.uso}</div>}
  </div>
);

/** L'armocromia personale: stagione, colori, neutri, da evitare, metalli e come usarla nel guardaroba. */
export function PaletteView({ p }: { p: Palette }) {
  return (
    <>
      <H icon={<Palette2Icon size={13} className="text-gold" />}>La tua armocromia</H>
      <div className="rounded-[20px] bg-surface shadow-soft p-4">
        <div className="font-display text-[24px] leading-tight">{p.stagione || "La tua stagione"}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {p.sottotono && <span className="rounded-full bg-card px-3 py-1 text-[12.5px]">Sottotono {p.sottotono}</span>}
          {p.contrasto && <span className="rounded-full bg-card px-3 py-1 text-[12.5px]">Contrasto {p.contrasto}</span>}
          {p.metalli && <span className="rounded-full bg-card px-3 py-1 text-[12.5px]">{p.metalli}</span>}
        </div>
        {p.perche && <p className="text-[14px] leading-relaxed mt-3">{p.perche}</p>}

        {!!p.neutri?.length && (
          <>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Neutri di base · completi, pantaloni, cappotti</div>
            <div className="mt-2 flex flex-wrap gap-2.5">{p.neutri.map((c) => <Swatch key={c.nome + c.hex} c={c} />)}</div>
          </>
        )}
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-[.08em] text-muted">I tuoi colori · camicie, cravatte, maglieria</div>
        <div className="mt-2 flex flex-wrap gap-2.5">{(p.colori || []).map((c) => <Swatch key={c.nome + c.hex} c={c} />)}</div>
        {!!p.evitare?.length && (
          <>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Da tenere lontano dal viso</div>
            <div className="mt-2 flex flex-wrap gap-2.5">{p.evitare.map((c) => <Swatch key={c.nome + c.hex} c={c} small />)}</div>
          </>
        )}
        {p.consigli && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-2">
            {Object.entries(p.consigli)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Fact key={k} k={k.replace("_", " e ")} v={v} />
              ))}
          </div>
        )}
        {p.affidabilita && <div className="mt-3 text-[12px] text-muted">📷 {p.affidabilita}</div>}
        <div className="mt-3 text-[12px] text-muted">La tua armocromia guida da ora la guida di stile, gli abbinamenti e i consigli di Alfred.</div>
      </div>
    </>
  );
}

/** Striscia compatta della palette, per Stile e Armadio. */
export function PaletteStrip() {
  const app = useApp();
  const p = app.profile?.palette as Palette | null | undefined;
  return (
    <button onClick={() => app.setTab("fisionomia")} className="w-full text-left rounded-[18px] bg-surface shadow-soft p-3.5 flex items-center gap-3">
      {p?.colori?.length ? (
        <>
          <div className="flex -space-x-1.5 shrink-0">
            {[...(p.neutri || []).slice(0, 2), ...p.colori.slice(0, 5)].map((c, i) => (
              <span key={i} className="h-7 w-7 rounded-full ring-2 ring-surface" style={{ background: c.hex }} />
            ))}
          </div>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-semibold truncate">Armocromia · {p.stagione}</span>
            <span className="block text-[12px] text-muted truncate">Guida colori di abiti e abbinamenti</span>
          </span>
        </>
      ) : (
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-semibold">Scopri la tua armocromia</span>
          <span className="block text-[12px] text-muted">Una foto del viso in Fisionomia: i colori da indossare diventano su misura</span>
        </span>
      )}
      <ExternalLink size={14} className="text-muted shrink-0" />
    </button>
  );
}
