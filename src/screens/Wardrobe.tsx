import { motion } from "framer-motion";
import { Camera, Check, ChevronRight, Globe, ImagePlus, Link2, Loader2, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip, Field, GarmentImg, inputCls, PrimaryButton, Sheet } from "../components/ui";
import { importFiles, importUrls } from "../lib/importer";
import { useApp } from "../lib/store";
import { ai, CATEGORIE, Garment, supabase } from "../lib/supabase";

export function Wardrobe() {
  const app = useApp();
  const [cat, setCat] = useState("Tutto");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<Garment | null>(null);

  const cats = useMemo(() => {
    const present = new Set(app.garments.map((g) => g.categoria));
    return ["Tutto", ...CATEGORIE.filter((c) => present.has(c))];
  }, [app.garments]);

  const list = app.garments.filter(
    (g) =>
      (cat === "Tutto" || g.categoria === cat) &&
      (!q || `${g.nome} ${g.colore ?? ""} ${g.brand ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="px-5 lg:px-10 pb-28 lg:pb-12">
      <header className="flex items-center justify-between pt-4">
        <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Il tuo armadio</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSearching((s) => !s)} className="h-10 w-10 grid place-items-center rounded-full text-ink" aria-label="Cerca">
            <Search size={22} />
          </button>
          <button
            onClick={() => app.setAddOpen(true)}
            className="h-11 w-11 max-lg:hidden grid place-items-center rounded-full bg-brand text-brand-fg shadow-pill active:scale-95 transition"
            aria-label="Aggiungi capo"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {searching && (
        <motion.input
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca nel tuo armadio"
          className={`${inputCls} mt-3`}
        />
      )}

      <div className="mt-4 -mx-5 px-5 lg:-mx-10 lg:px-10 flex gap-6 overflow-x-auto no-scrollbar border-b border-line">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`relative pb-2.5 whitespace-nowrap text-[15px] transition ${cat === c ? "text-gold font-semibold" : "text-muted"}`}
          >
            {c}
            {cat === c && <motion.div layoutId="catline" className="absolute left-0 right-0 -bottom-px h-[2px] bg-gold rounded" />}
          </button>
        ))}
      </div>

      {!app.loading && app.garments.length === 0 && app.pending.length === 0 ? (
        <EmptyWardrobe onAdd={() => app.setAddOpen(true)} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 mt-5 pb-6">
          {app.pending.map((p) => (
            <div key={p.id} className="rounded-[20px] bg-surface shadow-soft p-2.5">
              <div className="relative aspect-[4/5] rounded-2xl bg-card overflow-hidden">
                {p.previewUrl && <img src={p.previewUrl} className="w-full h-full object-cover opacity-40" />}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-2 text-gold">
                    <Sparkles className="animate-pulse" />
                    <span className="text-[12px] font-medium">Scontorno in corso…</span>
                  </div>
                </div>
              </div>
              <div className="pt-2.5 px-1 text-[15px] font-semibold text-muted">{p.label}</div>
            </div>
          ))}
          {list.map((g) => (
            <motion.button
              layout
              key={g.id}
              onClick={() => setDetail(g)}
              className="text-left rounded-[20px] bg-surface shadow-soft p-2.5 active:scale-[.98] transition"
            >
              <div className="aspect-[4/5] rounded-2xl bg-card p-3">
                <GarmentImg g={g} className="w-full h-full" />
              </div>
              <div className="pt-2.5 px-1">
                <div className="text-[15px] font-semibold leading-tight line-clamp-1">{g.nome}</div>
                <div className="text-[12.5px] text-muted mt-0.5">{g.categoria}</div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AddGarmentSheet open={app.addOpen} onClose={() => app.setAddOpen(false)} />
      <GarmentDetail g={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function EmptyWardrobe({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center px-6">
      <div className="h-24 w-24 rounded-[28px] bg-brand-soft grid place-items-center text-gold">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6a2 2 0 1 1 2-2" />
          <path d="M12 6v1.5L3 15a1.6 1.6 0 0 0 1 3h16a1.6 1.6 0 0 0 1-3l-9-7.5" />
        </svg>
      </div>
      <h2 className="mt-5 text-[22px] font-bold">Il tuo armadio è vuoto</h2>
      <p className="mt-2 text-muted text-[15px]">Fotografa un capo, scegline uno dalla galleria o cercalo sul web: l'AI lo scontorna e lo cataloga per te.</p>
      <PrimaryButton className="mt-6" onClick={onAdd}>
        <Plus size={18} /> Aggiungi il tuo primo capo
      </PrimaryButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function AddGarmentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [web, setWeb] = useState(false);
  const [link, setLink] = useState(false);

  const reset = () => {
    setFiles([]);
    setNome("");
    setCategoria("");
  };
  const close = () => {
    reset();
    onClose();
  };
  const pick = (fl: FileList | null) => fl && setFiles((f) => [...f, ...Array.from(fl)]);
  const save = () => {
    importFiles(app, files, { nome: files.length === 1 ? nome || undefined : undefined, categoria: categoria || undefined }, "foto");
    app.setTab("armadio");
    close();
  };

  return (
    <>
      <Sheet open={open && !web && !link} onClose={close} title="Aggiungi un capo">
        <div className="flex gap-2">
          <button onClick={() => setWeb(true)} className="flex-1 h-12 rounded-full bg-gold-tint text-gold font-semibold flex items-center justify-center gap-2">
            <Globe size={18} /> Cerca sul web
          </button>
          <PrimaryButton className="flex-1" onClick={() => cam.current?.click()}>
            <Camera size={18} /> Scatta foto
          </PrimaryButton>
        </div>
        <button onClick={() => setLink(true)} className="mt-3 w-full h-12 rounded-2xl bg-card flex items-center gap-3 px-4 text-[15px]">
          <Link2 size={18} className="text-gold" />
          <span className="flex-1 text-left">Incolla link di un prodotto</span>
          <ChevronRight size={18} className="text-muted" />
        </button>
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files)} />
        <input ref={gal} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />

        <div className="mt-5 text-[13px] text-muted mb-2">Seleziona dalla galleria:</div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => gal.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-line grid place-items-center text-muted">
            <ImagePlus />
          </button>
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-card">
              <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-brand text-brand-fg grid place-items-center">
                <Check size={13} strokeWidth={3} />
              </div>
              <button onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full bg-black/50 text-white grid place-items-center">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {files.length > 0 && (
          <div className="mt-5 space-y-4">
            {files.length === 1 && (
              <Field label="Nome del capo (facoltativo, ci pensa l'AI)">
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Maglia nera" />
              </Field>
            )}
            <div>
              <div className="text-[13px] text-muted mb-2">Categoria (facoltativa)</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIE.map((c) => (
                  <Chip key={c} active={categoria === c} onClick={() => setCategoria(categoria === c ? "" : c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <PrimaryButton className="w-full" onClick={save}>
              <Sparkles size={18} /> Aggiungi {files.length > 1 ? `${files.length} capi` : "all'armadio"}
            </PrimaryButton>
          </div>
        )}
        <div className="h-4" />
      </Sheet>
      <WebSearchSheet
        open={web}
        onClose={() => setWeb(false)}
        onDone={() => {
          setWeb(false);
          close();
        }}
      />
      <LinkSheet
        open={link}
        onClose={() => setLink(false)}
        onDone={() => {
          setLink(false);
          close();
        }}
      />
    </>
  );
}

type Result = { image: string; thumbnail: string; title: string; source: string };

export function WebSearchSheet({
  open,
  onClose,
  onDone,
  initialQuery,
  title = "Cerca su internet",
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  initialQuery?: string;
  title?: string;
}) {
  const app = useApp();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result[]>([]);
  const [sel, setSel] = useState<Result[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open && initialQuery) {
      setQ(initialQuery);
      setSel([]);
      search(undefined, initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  const search = async (e?: React.FormEvent, override?: string) => {
    e?.preventDefault();
    const query = (override ?? q).trim();
    if (!query) return;
    setLoading(true);
    setErr("");
    try {
      const r = await ai<{ results: Result[] }>({ action: "search", query });
      setRes(r.results);
      if (!r.results.length) setErr("Nessun risultato. Prova con altre parole o incolla il link del prodotto.");
    } catch (e) {
      setErr((e as Error).message);
    }
    setLoading(false);
  };
  const toggle = (r: Result) => setSel((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const add = () => {
    importUrls(app, sel.map((s) => s.image), {}, "web");
    setSel([]);
    setRes([]);
    setQ("");
    app.setTab("armadio");
    onDone();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <form onSubmit={search} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Es. giacca di jeans, felpa Carhartt verde…"
          className={`${inputCls} pl-11`}
          enterKeyHint="search"
        />
      </form>
      {loading && (
        <div className="py-16 grid place-items-center text-muted">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {err && !loading && <p className="text-muted text-[14px] mt-6 text-center">{err}</p>}
      <div className="grid grid-cols-2 gap-2.5 mt-4 pb-28">
        {res.map((r, i) => {
          const on = sel.includes(r);
          return (
            <button
              key={i}
              onClick={() => toggle(r)}
              className={`relative aspect-[4/5] rounded-2xl overflow-hidden bg-card border-2 transition ${on ? "border-gold" : "border-transparent"}`}
            >
              <img src={r.thumbnail || r.image} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              {on && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-brand text-brand-fg grid place-items-center">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {sel.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="text-[13px] font-semibold mb-2">Foto selezionate:</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
              {sel.map((s, i) => (
                <img key={i} src={s.thumbnail} referrerPolicy="no-referrer" className="h-14 w-14 rounded-xl object-cover shrink-0" />
              ))}
            </div>
            <button onClick={add} className="h-12 w-12 rounded-full bg-brand text-brand-fg grid place-items-center shadow-pill shrink-0" aria-label="Aggiungi">
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function LinkSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const app = useApp();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ nome: string; image: string; prezzo: string; brand: string } | null>(null);
  const [err, setErr] = useState("");

  const read = async () => {
    setLoading(true);
    setErr("");
    setInfo(null);
    try {
      const r = await ai({ action: "link", url: url.trim() });
      if (!r.image) setErr("Non trovo l'immagine del prodotto in questa pagina. Prova con la ricerca o fai uno screenshot.");
      else setInfo(r);
    } catch (e) {
      setErr((e as Error).message);
    }
    setLoading(false);
  };
  const add = () => {
    if (!info) return;
    importUrls(app, [info.image], { nome: info.nome?.slice(0, 60), prezzo: info.prezzo, brand: info.brand, source_url: url.trim() }, "link");
    setUrl("");
    setInfo(null);
    app.setTab("armadio");
    onDone();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Incolla link">
      <Field label="Link della pagina prodotto (Zara, Zalando, H&M…)">
        <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
      </Field>
      <PrimaryButton className="w-full mt-4" disabled={!url.startsWith("http") || loading} onClick={read}>
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Link2 size={18} />} Leggi prodotto
      </PrimaryButton>
      {err && <p className="text-muted text-[14px] mt-4">{err}</p>}
      {info && (
        <div className="mt-5 rounded-[20px] bg-card p-3 flex gap-3">
          <img src={info.image} referrerPolicy="no-referrer" className="h-28 w-24 rounded-xl object-cover bg-surface" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight line-clamp-3">{info.nome}</div>
            {info.brand && <div className="text-[13px] text-muted mt-1">{info.brand}</div>}
            {info.prezzo && <div className="text-[15px] font-semibold mt-1">{info.prezzo}</div>}
          </div>
        </div>
      )}
      {info && (
        <PrimaryButton className="w-full mt-4" onClick={add}>
          <Plus size={18} /> Aggiungi all'armadio
        </PrimaryButton>
      )}
      <div className="h-6" />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

function GarmentDetail({ g, onClose }: { g: Garment | null; onClose: () => void }) {
  const app = useApp();
  const [edit, setEdit] = useState<Partial<Garment>>({});
  const [busy, setBusy] = useState(false);
  const cur = g ? { ...g, ...edit } : null;

  const save = async () => {
    if (!g || !Object.keys(edit).length) return onClose();
    await supabase.from("garments").update(edit).eq("id", g.id);
    setEdit({});
    await app.reload();
    app.toast("Capo aggiornato");
    onClose();
  };
  const del = async () => {
    if (!g) return;
    await supabase.from("garments").delete().eq("id", g.id);
    setEdit({});
    await app.reload();
    app.toast("Capo eliminato");
    onClose();
  };
  const recut = async () => {
    if (!g) return;
    setBusy(true);
    try {
      await ai({ action: "recut", id: g.id });
      await app.reload();
      app.toast("Scontorno rifatto");
      onClose();
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Sheet
      open={!!g}
      onClose={() => {
        setEdit({});
        onClose();
      }}
      eyebrow={cur?.categoria}
      title={cur?.nome}
    >
      {cur && g && (
        <div className="space-y-4">
          <div className="aspect-[4/3] rounded-[22px] bg-card p-5">
            <GarmentImg g={g} className="w-full h-full" />
          </div>
          <div className="flex flex-wrap gap-2 text-[13px]">
            {[cur.colore, cur.stagione, cur.formalita, cur.brand, cur.prezzo].filter(Boolean).map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-card">
                {t}
              </span>
            ))}
          </div>
          <Field label="Nome">
            <input className={inputCls} value={cur.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
          </Field>
          <div>
            <div className="text-[13px] text-muted mb-2">Categoria</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIE.map((c) => (
                <Chip key={c} active={cur.categoria === c} onClick={() => setEdit({ ...edit, categoria: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Taglia">
              <input className={inputCls} value={cur.taglia ?? ""} onChange={(e) => setEdit({ ...edit, taglia: e.target.value })} placeholder="M, 48, 32…" />
            </Field>
            <Field label="Colore">
              <input className={inputCls} value={cur.colore ?? ""} onChange={(e) => setEdit({ ...edit, colore: e.target.value })} />
            </Field>
          </div>
          {cur.source_url && (
            <a href={cur.source_url} target="_blank" className="block text-gold text-[14px] truncate">
              Apri la pagina del prodotto →
            </a>
          )}
          <PrimaryButton className="w-full" onClick={save}>
            Salva
          </PrimaryButton>
          <div className="flex gap-2">
            <button onClick={recut} disabled={busy} className="flex-1 h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Rifai scontorno
            </button>
            <button onClick={del} className="flex-1 h-11 rounded-full bg-danger-tint text-danger text-[14px] font-medium flex items-center justify-center gap-2">
              <Trash2 size={16} /> Elimina
            </button>
          </div>
          <div className="h-2" />
        </div>
      )}
    </Sheet>
  );
}
