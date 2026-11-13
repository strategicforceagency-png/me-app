import { Briefcase, Camera, Check, ExternalLink, Loader2, Plus, RefreshCw, Sparkles, SprayCan, Star, Trash2, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AlfredAvatar } from "../components/AlfredIcon";
import { inputCls } from "../components/ui";
import { useApp } from "../lib/store";
import { fn, supabase, uploadImage, useSignedUrl } from "../lib/supabase";

type Fonte = { titolo: string; url: string };
type Item = {
  id: string;
  tipo: "profumo" | "pelle";
  categoria: string | null;
  nome: string;
  marca: string | null;
  colore: string | null;
  stato: "mio" | "desidero" | "provato" | "scoperta";
  voto: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dettagli: any;
  foto: string | null;
  ultima_cura: string | null;
  created_at: string;
};

const STATI: { id: Item["stato"]; label: string }[] = [
  { id: "mio", label: "I miei" },
  { id: "desidero", label: "Desidero" },
  { id: "provato", label: "Provati" },
  { id: "scoperta", label: "Da scoprire" },
];

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
const Chips = ({ opts, value, onChange, small }: { opts: { id: string; label: string }[]; value?: string | null; onChange: (v: string) => void; small?: boolean }) => (
  <div className="flex flex-wrap gap-1.5">
    {opts.map((o) => (
      <button key={o.id} onClick={() => onChange(o.id)} className={`${small ? "h-8 px-3 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]"} rounded-full font-medium transition ${value === o.id ? "bg-brand text-brand-fg" : "bg-card"}`}>
        {o.label}
      </button>
    ))}
  </div>
);
function Fonti({ fonti, senza }: { fonti?: Fonte[]; senza?: boolean }) {
  if (senza)
    return <div className="mt-3 rounded-2xl bg-gold-tint px-3.5 py-2.5 text-[12.5px] text-ink/80">Ricerca web non disponibile al momento (quota gratuita di Google esaurita): consigli dalle conoscenze dell'AI, verifichi prezzi e disponibilità.</div>;
  if (!fonti?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {fonti.map((f) => (
        <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="text-[11.5px] rounded-full bg-card px-2.5 py-1 text-muted hover:text-ink truncate max-w-[220px]">
          {f.titolo}
        </a>
      ))}
    </div>
  );
}
const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

function useCollezione(tipo: Item["tipo"]) {
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("collezione").select("*").eq("tipo", tipo).order("created_at", { ascending: false });
    setItems((data as Item[]) || []);
  }, [tipo]);
  useEffect(() => {
    load();
  }, [load]);
  return { items, setItems, load };
}

function Stars({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} su 5`}>
          <Star size={15} className={n <= (value || 0) ? "fill-gold text-gold" : "text-muted"} />
        </button>
      ))}
    </div>
  );
}
function Thumb({ path }: { path: string | null }) {
  const url = useSignedUrl("persone", path);
  return url ? <img src={url} alt="" className="h-14 w-14 rounded-[12px] object-cover shrink-0" /> : null;
}

/* ================================================================== */
/* PROFUMI                                                             */
/* ================================================================== */
const OCCASIONI = ["Ufficio", "Weekend", "Sera", "Appuntamento", "Cerimonia", "Sport"].map((x) => ({ id: x, label: x }));

export function FragrancesScreen() {
  const app = useApp();
  const { items, setItems, load } = useCollezione("profumo");
  const [filtro, setFiltro] = useState<Item["stato"]>("mio");
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [stato, setStato] = useState<Item["stato"]>("mio");
  const [foto, setFoto] = useState<File | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [occ, setOcc] = useState("Ufficio");
  const [oggi, setOggi] = useState<{ id: string; dosi: string; perche: string } | null>(null);
  const [busyOggi, setBusyOggi] = useState(false);
  const [busyAn, setBusyAn] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const an = app.profile?.profumi_analisi as any;

  const scheda = async (id: string) => {
    setBusyId(id);
    try {
      const r = await fn<{ dettagli: unknown }>("collezione", "", { action: "profumo", id });
      setItems((xs) => (xs || []).map((x) => (x.id === id ? { ...x, dettagli: r.dettagli } : x)));
      await load();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusyId(null);
  };
  const add = async (n = nome, m = marca, st = stato) => {
    if (!n.trim()) return app.toast("Scrivi il nome del profumo");
    setAdding(true);
    try {
      let path: string | null = null;
      if (foto) {
        const { data: u } = await supabase.auth.getUser();
        path = await uploadImage("persone", u.user!.id, foto, "profumo");
      }
      const { data, error } = await supabase.from("collezione").insert({ tipo: "profumo", nome: n.trim(), marca: m.trim() || null, stato: st, foto: path }).select().single();
      if (error) throw error;
      setNome("");
      setMarca("");
      setFoto(null);
      setFiltro(st);
      await load();
      scheda((data as Item).id);
    } catch (e) {
      app.toast((e as Error).message);
    }
    setAdding(false);
  };
  const upd = async (id: string, patch: Partial<Item>) => {
    setItems((xs) => (xs || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("collezione").update(patch).eq("id", id);
  };
  const del = async (id: string) => {
    setItems((xs) => (xs || []).filter((x) => x.id !== id));
    await supabase.from("collezione").delete().eq("id", id);
  };
  const scegli = async () => {
    setBusyOggi(true);
    try {
      setOggi(await fn("collezione", "", { action: "profumo_oggi", occasione: occ }));
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusyOggi(false);
  };
  const analizza = async () => {
    setBusyAn(true);
    try {
      const r = await fn("collezione", "", { action: "profumi_consigli" });
      await app.setProfile({ profumi_analisi: r });
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusyAn(false);
  };

  const mine = (items || []).filter((x) => x.stato === "mio");
  const shown = (items || []).filter((x) => x.stato === filtro);
  const scelto = mine.find((x) => x.id === oggi?.id);

  return (
    <div className="px-5 lg:px-10 pb-32 max-w-[860px]">
      <Title t="Profumi" sub="La tua collezione, il tuo profilo olfattivo e il profumo giusto per ogni giornata. Aggiungi un profumo: ne preparo la scheda con note, famiglia e quando indossarlo." />

      {mine.length > 0 && (
        <>
          <H>Oggi indosso</H>
          <div className="rounded-[20px] bg-surface shadow-soft p-4">
            <Chips small opts={OCCASIONI} value={occ} onChange={setOcc} />
            <button onClick={scegli} disabled={busyOggi} className="mt-3 h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold flex items-center gap-1.5">
              {busyOggi ? <Loader2 size={15} className="animate-spin" /> : <SprayCan size={15} />} Scegli per me
            </button>
            {oggi && (
              <div className="mt-4 flex gap-3">
                <AlfredAvatar size={36} className="shrink-0" />
                <div>
                  <div className="font-display text-[20px] leading-tight">{scelto?.nome || "—"}</div>
                  <div className="text-[13px] text-gold font-semibold mt-0.5">{oggi.dosi}</div>
                  <p className="text-[14px] leading-relaxed mt-1 italic">{oggi.perche}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <H>Aggiungi un profumo</H>
      <div className="rounded-[20px] bg-surface shadow-soft p-4 space-y-2.5">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (es. Vétiver)" autoComplete="off" className={inputCls} />
        <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Maison (es. Guerlain)" autoComplete="off" className={inputCls} />
        <Chips small opts={STATI.filter((s) => s.id !== "scoperta").map((s) => ({ id: s.id, label: s.id === "mio" ? "Lo possiedo" : s.id === "desidero" ? "Lo desidero" : "L'ho provato" }))} value={stato} onChange={(v) => setStato(v as Item["stato"])} />
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()} className="h-11 px-4 rounded-full bg-card text-[13.5px] font-semibold flex items-center gap-1.5">
            <Camera size={15} /> {foto ? "Foto pronta" : "Foto del flacone"}
          </button>
          <button onClick={() => add()} disabled={adding} className="flex-1 h-11 rounded-full bg-brand text-brand-fg text-[14px] font-semibold flex items-center justify-center gap-1.5">
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Aggiungi
          </button>
        </div>
      </div>

      <H>La collezione</H>
      <Chips opts={STATI.map((s) => ({ id: s.id, label: `${s.label} (${(items || []).filter((x) => x.stato === s.id).length})` }))} value={filtro} onChange={(v) => setFiltro(v as Item["stato"])} />
      <div className="mt-3 space-y-2.5">
        {items === null && <Loader2 className="animate-spin text-muted mx-auto" />}
        {items && !shown.length && <div className="rounded-[16px] bg-card p-4 text-[13.5px] text-muted">Ancora nessun profumo qui.</div>}
        {shown.map((x) => {
          const d = x.dettagli || {};
          return (
            <div key={x.id} className="rounded-[20px] bg-surface shadow-soft p-4">
              <div className="flex gap-3">
                <Thumb path={x.foto} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[20px] leading-tight">{x.nome}</div>
                  <div className="text-[13px] text-muted">
                    {[x.marca, d.anno, d.concentrazione].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-1.5">
                    <Stars value={x.voto} onChange={(n) => upd(x.id, { voto: n })} />
                  </div>
                </div>
                <button onClick={() => del(x.id)} className="h-8 w-8 grid place-items-center text-muted shrink-0" aria-label="Elimina">
                  <Trash2 size={15} />
                </button>
              </div>
              {busyId === x.id ? (
                <div className="mt-3 text-[13px] text-muted flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Preparo la scheda…
                </div>
              ) : d.famiglia ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-gold/15 px-3 py-1 text-[12.5px] font-medium">{d.famiglia}</span>
                    {(d.stagioni || []).map((s: string) => (
                      <span key={s} className="rounded-full bg-card px-2.5 py-1 text-[12px] capitalize">
                        {s}
                      </span>
                    ))}
                    {d.scia && <span className="rounded-full bg-card px-2.5 py-1 text-[12px]">scia {d.scia}</span>}
                  </div>
                  {d.carattere && <p className="mt-2 text-[14px] leading-relaxed">{d.carattere}</p>}
                  {d.note && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["testa", "cuore", "fondo"] as const).map((k) => (
                        <div key={k} className="rounded-[12px] bg-card px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-muted">{k}</div>
                          <div className="text-[12.5px] leading-snug mt-0.5">{(d.note[k] || []).join(", ") || "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-[12.5px] text-muted">
                    {[d.occasioni?.length ? `Per: ${d.occasioni.join(", ")}` : null, d.durata ? `Durata ${d.durata}` : null, d.dosi ? `Dosi: ${d.dosi}` : null, d.prezzo ? `Prezzo ${d.prezzo}` : null].filter(Boolean).join(" · ")}
                  </div>
                  {!!d.simili?.length && <div className="mt-1 text-[12.5px] text-muted">Simili: {d.simili.join(", ")}</div>}
                  {d.verifica && (
                    <div className="mt-3 rounded-[14px] bg-card p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">
                        Da {d.ispirazione?.fonte || "un'ispirazione"} · verificato sul web
                      </div>
                      {d.verifica.affermazione && (
                        <div className="text-[13px] mt-1">
                          «{d.verifica.affermazione}» —{" "}
                          <b className={d.verifica.esito === "confermata" ? "text-[rgb(var(--ok))]" : d.verifica.esito === "smentita" ? "text-danger" : ""}>{d.verifica.esito}</b>
                        </div>
                      )}
                      {d.verifica.giudizio && <p className="text-[13px] leading-relaxed mt-1 text-ink/85">{d.verifica.giudizio}</p>}
                    </div>
                  )}
                  {d.fonti?.length > 0 && <Fonti fonti={d.fonti} />}
                </>
              ) : (
                <button onClick={() => scheda(x.id)} className="mt-3 text-[13px] font-semibold text-gold flex items-center gap-1">
                  <Sparkles size={14} /> Prepara la scheda
                </button>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATI.filter((s) => s.id !== x.stato && s.id !== "scoperta").map((s) => (
                  <button key={s.id} onClick={() => upd(x.id, { stato: s.id })} className="h-8 px-3 rounded-full bg-card text-[12px] font-medium">
                    Sposta in {s.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <H right={<button onClick={analizza} disabled={busyAn} className="text-[13px] font-semibold text-gold flex items-center gap-1">{busyAn ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {an ? "Aggiorna" : "Analizza"}</button>}>Il tuo profilo olfattivo</H>
      {!an ? (
        <div className="rounded-[18px] bg-card p-4 text-[13.5px] text-muted leading-relaxed">Aggiungi i profumi che hai, che desideri o che hai provato, poi premi Analizza: capisco il tuo profilo, organizzo il tuo guardaroba olfattivo e cerco cosa provare.</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[20px] bg-surface shadow-soft p-4">
            <p className="text-[14.5px] leading-relaxed">{an.profilo}</p>
            {!!an.famiglie?.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {an.famiglie.map((f: string) => (
                  <span key={f} className="rounded-full bg-gold/15 px-3 py-1 text-[12.5px]">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          {!!an.guardaroba?.length && (
            <div className="grid grid-cols-2 gap-2">
              {an.guardaroba.map((g: { ruolo: string; profumo: string | null; nota: string }) => (
                <div key={g.ruolo} className="rounded-[16px] bg-card p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">{g.ruolo}</div>
                  <div className={`text-[14.5px] font-semibold mt-0.5 ${g.profumo ? "" : "text-muted"}`}>{g.profumo || "Da trovare"}</div>
                  <div className="text-[12.5px] text-muted leading-snug mt-0.5">{g.nota}</div>
                </div>
              ))}
            </div>
          )}
          {!!an.da_provare?.length && (
            <>
              <div className="text-[13px] font-semibold mt-2">Da provare</div>
              {an.da_provare.map((p: { nome: string; marca: string; perche: string; famiglia?: string; prezzo?: string; dove?: string; ricerca?: string; link?: string | null }) => (
                <div key={p.nome + p.marca} className="rounded-[18px] bg-surface shadow-soft p-4">
                  <div className="font-display text-[19px] leading-tight">{p.nome}</div>
                  <div className="text-[12.5px] text-muted">{[p.marca, p.famiglia, p.prezzo].filter(Boolean).join(" · ")}</div>
                  <p className="text-[13.5px] leading-relaxed mt-1.5">{p.perche}</p>
                  {p.dove && <div className="text-[12.5px] text-muted mt-1">Dove: {p.dove}</div>}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button onClick={() => add(p.nome, p.marca || "", "desidero")} className="h-9 px-3.5 rounded-full bg-brand text-brand-fg text-[12.5px] font-semibold flex items-center gap-1">
                      <Plus size={14} /> Desidero
                    </button>
                    <a href={p.link || google(p.ricerca || `${p.nome} ${p.marca}`)} target="_blank" rel="noreferrer" className="h-9 px-3.5 rounded-full bg-card text-[12.5px] font-semibold flex items-center gap-1">
                      <ExternalLink size={13} /> Cerca
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}
          {an.consiglio && (
            <div className="flex gap-3 rounded-[18px] bg-surface shadow-soft p-4">
              <AlfredAvatar size={32} className="shrink-0" />
              <p className="text-[14px] leading-relaxed italic">{an.consiglio}</p>
            </div>
          )}
          <Fonti fonti={an.fonti} senza={(an as { senza_ricerca?: boolean }).senza_ricerca} />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* PELLETTERIA                                                         */
/* ================================================================== */
const CATEGORIE = ["24 ore", "Cartella", "Porta documenti", "Zaino", "Borsone", "Cintura", "Portafoglio", "Porta carte", "Porta biglietti", "Portachiavi", "Altro"].map((x) => ({ id: x, label: x }));
const GIORNI_CURA = 120;
const daysSince = (d: string | null, fallback: string) => Math.floor((Date.now() - Date.parse(d || fallback)) / 86400000);

export function LeatherScreen() {
  const app = useApp();
  const { items, setItems, load } = useCollezione("pelle");
  const [cat, setCat] = useState("Cartella");
  const [nome, setNome] = useState("");
  const [colore, setColore] = useState("");
  const [marca, setMarca] = useState("");
  const [stato, setStato] = useState<Item["stato"]>("mio");
  const [adding, setAdding] = useState(false);
  const [busyAn, setBusyAn] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const an = app.profile?.pelle_analisi as any;

  const add = async (c = cat, n = nome, col = colore, m = marca, st = stato) => {
    if (!n.trim()) return app.toast("Scrivi un nome (es. Cartella in cuoio)");
    setAdding(true);
    const { error } = await supabase.from("collezione").insert({ tipo: "pelle", categoria: c, nome: n.trim(), colore: col.trim() || null, marca: m.trim() || null, stato: st });
    if (error) app.toast(error.message);
    else {
      setNome("");
      setColore("");
      setMarca("");
      await load();
    }
    setAdding(false);
  };
  const upd = async (id: string, patch: Partial<Item>) => {
    setItems((xs) => (xs || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("collezione").update(patch).eq("id", id);
  };
  const del = async (id: string) => {
    setItems((xs) => (xs || []).filter((x) => x.id !== id));
    await supabase.from("collezione").delete().eq("id", id);
  };
  const analizza = async () => {
    setBusyAn(true);
    try {
      const r = await fn("collezione", "", { action: "pelle_consigli" });
      await app.setProfile({ pelle_analisi: r });
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusyAn(false);
  };
  const today = new Date().toISOString().slice(0, 10);
  const mine = (items || []).filter((x) => x.stato === "mio");
  const wish = (items || []).filter((x) => x.stato === "desidero");

  return (
    <div className="px-5 lg:px-10 pb-32 max-w-[860px]">
      <Title t="Pelletteria" sub="Borse da lavoro, 24 ore, borsone, cinture e piccola pelletteria: cosa hai, cosa manca e quando nutrire la pelle." />

      <H>Aggiungi un pezzo</H>
      <div className="rounded-[20px] bg-surface shadow-soft p-4 space-y-2.5">
        <Chips small opts={CATEGORIE} value={cat} onChange={setCat} />
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (es. Cartella in cuoio testa di moro)" autoComplete="off" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input value={colore} onChange={(e) => setColore(e.target.value)} placeholder="Colore" autoComplete="off" className={inputCls} />
          <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca o artigiano" autoComplete="off" className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <Chips small opts={[{ id: "mio", label: "Ce l'ho" }, { id: "desidero", label: "Lo desidero" }]} value={stato} onChange={(v) => setStato(v as Item["stato"])} />
          <button onClick={() => add()} disabled={adding} className="ml-auto h-10 px-5 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold flex items-center gap-1.5">
            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Aggiungi
          </button>
        </div>
      </div>

      <H>I tuoi pezzi</H>
      <div className="space-y-2">
        {items === null && <Loader2 className="animate-spin text-muted mx-auto" />}
        {items && !mine.length && <div className="rounded-[16px] bg-card p-4 text-[13.5px] text-muted">Registra borse, cinture e portafogli che hai: ti ricordo quando nutrirli e capisco cosa manca.</div>}
        {mine.map((x) => {
          const gg = daysSince(x.ultima_cura, x.created_at);
          const due = gg >= GIORNI_CURA;
          return (
            <div key={x.id} className="rounded-[18px] bg-surface shadow-soft p-3.5 flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-gold/15 text-gold grid place-items-center shrink-0">
                <Briefcase size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold truncate">{x.nome}</div>
                <div className="text-[12.5px] text-muted truncate">{[x.categoria, x.colore, x.marca].filter(Boolean).join(" · ")}</div>
                <div className={`text-[12px] mt-0.5 ${due ? "text-[#d64545] font-semibold" : "text-muted"}`}>
                  {x.ultima_cura ? `Nutrita ${gg === 0 ? "oggi" : `${gg} giorni fa`}` : "Mai nutrita qui"}
                  {due ? " · da nutrire" : ""}
                </div>
              </div>
              <button onClick={() => upd(x.id, { ultima_cura: today })} className="h-9 px-3 rounded-full bg-card text-[12px] font-semibold flex items-center gap-1 shrink-0" title="Segna come nutrita oggi">
                <Check size={13} /> Curata
              </button>
              <button onClick={() => del(x.id)} className="h-8 w-8 grid place-items-center text-muted shrink-0" aria-label="Elimina">
                <X size={15} />
              </button>
            </div>
          );
        })}
        {!!wish.length && (
          <>
            <div className="text-[13px] font-semibold pt-2">Desideri</div>
            {wish.map((x) => (
              <div key={x.id} className="rounded-[16px] bg-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium truncate">{x.nome}</div>
                  <div className="text-[12px] text-muted">{[x.categoria, x.colore, x.marca].filter(Boolean).join(" · ")}</div>
                </div>
                <button onClick={() => upd(x.id, { stato: "mio" })} className="h-8 px-3 rounded-full bg-brand text-brand-fg text-[12px] font-semibold">
                  Comprato
                </button>
                <button onClick={() => del(x.id)} className="h-8 w-8 grid place-items-center text-muted" aria-label="Elimina">
                  <X size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <H right={<button onClick={analizza} disabled={busyAn} className="text-[13px] font-semibold text-gold flex items-center gap-1">{busyAn ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {an ? "Aggiorna" : "Analizza"}</button>}>Il consiglio</H>
      {!an ? (
        <div className="rounded-[18px] bg-card p-4 text-[13.5px] text-muted leading-relaxed">Premi Analizza: valuto il tuo set rispetto a quello di un gentleman, ti dico i colori di pelle e metalli adatti a te e cerco gli acquisti prioritari nel tuo budget.</div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[20px] bg-surface shadow-soft p-4">
            <p className="text-[14.5px] leading-relaxed">{an.valutazione}</p>
            {an.colori && <p className="text-[13.5px] text-muted leading-relaxed mt-2">{an.colori}</p>}
          </div>
          {!!an.set?.length && (
            <div className="rounded-[20px] bg-surface shadow-soft p-2">
              {an.set.map((s: { pezzo: string; ce_l_ha: boolean; nota: string }) => (
                <div key={s.pezzo} className="flex items-start gap-2.5 px-2.5 py-2">
                  <span className={`mt-0.5 h-5 w-5 rounded-full grid place-items-center shrink-0 ${s.ce_l_ha ? "bg-gold text-hero" : "bg-card text-muted"}`}>{s.ce_l_ha ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-muted" />}</span>
                  <div>
                    <div className="text-[14px] font-medium">{s.pezzo}</div>
                    {s.nota && <div className="text-[12.5px] text-muted leading-snug">{s.nota}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!!an.priorita?.length && (
            <>
              <div className="text-[13px] font-semibold mt-2">Da comprare, in ordine</div>
              {an.priorita.map((p: { nome: string; categoria?: string; perche: string; prezzo?: string; dove?: string; ricerca?: string; link?: string | null }) => (
                <div key={p.nome} className="rounded-[18px] bg-surface shadow-soft p-4">
                  <div className="font-display text-[19px] leading-tight">{p.nome}</div>
                  <div className="text-[12.5px] text-muted">{[p.categoria, p.prezzo, p.dove].filter(Boolean).join(" · ")}</div>
                  <p className="text-[13.5px] leading-relaxed mt-1.5">{p.perche}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button onClick={() => add(CATEGORIE.some((c) => c.id === p.categoria) ? p.categoria! : "Altro", p.nome, "", "", "desidero")} className="h-9 px-3.5 rounded-full bg-brand text-brand-fg text-[12.5px] font-semibold flex items-center gap-1">
                      <Plus size={14} /> Desidero
                    </button>
                    <a href={p.link || google(p.ricerca || p.nome)} target="_blank" rel="noreferrer" className="h-9 px-3.5 rounded-full bg-card text-[12.5px] font-semibold flex items-center gap-1">
                      <ExternalLink size={13} /> Cerca
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}
          {an.cura && <div className="rounded-[16px] bg-card p-3.5 text-[13.5px] leading-relaxed"><b>Cura: </b>{an.cura}</div>}
          {an.consiglio && (
            <div className="flex gap-3 rounded-[18px] bg-surface shadow-soft p-4">
              <AlfredAvatar size={32} className="shrink-0" />
              <p className="text-[14px] leading-relaxed italic">{an.consiglio}</p>
            </div>
          )}
          <Fonti fonti={an.fonti} senza={(an as { senza_ricerca?: boolean }).senza_ricerca} />
        </div>
      )}
    </div>
  );
}
