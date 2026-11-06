import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Heart, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_MEASURES, DressedMannequin } from "../components/Mannequin";
import { Chip, Field, GarmentImg, inputCls, PrimaryButton, Sheet } from "../components/ui";
import { useApp } from "../lib/store";
import { ai, Garment, Slot, SLOT_LABEL, SLOT_OF, STILI, supabase, useSignedUrl } from "../lib/supabase";

export function OutfitBuilder() {
  const app = useApp();
  const bySlot = useMemo(() => {
    const m: Record<Slot, Garment[]> = { top: [], bottom: [], scarpe: [] };
    app.garments.forEach((g) => {
      const s = SLOT_OF[g.categoria];
      if (s) m[s].push(g);
    });
    return m;
  }, [app.garments]);
  const byId = useMemo(() => new Map(app.garments.map((g) => [g.id, g])), [app.garments]);

  const [top, setTop] = useState<string[]>([]);
  const [bottom, setBottom] = useState<string | null>(null);
  const [scarpe, setScarpe] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot>("top");
  const [saveOpen, setSaveOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [dir, setDir] = useState(0);

  // init / load draft
  useEffect(() => {
    if (app.draft) {
      setTop(app.draft.top.filter((id) => byId.has(id)));
      setBottom(app.draft.bottom && byId.has(app.draft.bottom) ? app.draft.bottom : null);
      setScarpe(app.draft.scarpe && byId.has(app.draft.scarpe) ? app.draft.scarpe : null);
      app.setDraft(null);
      return;
    }
    setTop((t) => (t.length ? t.filter((id) => byId.has(id)) : bySlot.top[0] ? [bySlot.top[0].id] : []));
    setBottom((b) => (b && byId.has(b) ? b : bySlot.bottom[0]?.id ?? null));
    setScarpe((s) => (s && byId.has(s) ? s : bySlot.scarpe[0]?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bySlot, app.draft]);

  const list = bySlot[slot];
  const currentId = slot === "top" ? top[top.length - 1] ?? null : slot === "bottom" ? bottom : scarpe;
  const idx = Math.max(0, list.findIndex((g) => g.id === currentId));
  const setCurrent = (id: string | null) => {
    if (slot === "top") setTop((t) => (t.length ? [...t.slice(0, -1), id!].filter(Boolean) : id ? [id] : []));
    else if (slot === "bottom") setBottom(id);
    else setScarpe(id);
  };
  const step = (d: number) => {
    if (!list.length) return;
    setDir(d);
    let n = (idx + d + list.length) % list.length;
    if (slot === "top") {
      const others = new Set(top.slice(0, -1));
      for (let k = 0; k < list.length && others.has(list[n].id); k++) n = (n + d + list.length) % list.length;
    }
    setCurrent(list[n].id);
  };
  const addLayer = () => {
    if (slot !== "top") return;
    const used = new Set(top);
    const next = list.find((g) => !used.has(g.id));
    if (!next) return app.toast("Non ci sono altri capi da sovrapporre");
    setTop((t) => [...t, next.id]);
    navigator.vibrate?.(15);
    app.toast(`Strato ${top.length + 1} aggiunto`);
  };

  // long-press detection
  const lp = useRef<number>();
  const moved = useRef(false);
  const onDown = () => {
    moved.current = false;
    lp.current = window.setTimeout(() => !moved.current && addLayer(), 550);
  };
  const cancelLp = () => window.clearTimeout(lp.current);
  const onDragEnd = (_: unknown, i: PanInfo) => {
    if (i.offset.x < -50) step(1);
    else if (i.offset.x > 50) step(-1);
  };

  const topG = top.map((id) => byId.get(id)!).filter(Boolean);
  const bottomG = bottom ? byId.get(bottom) ?? null : null;
  const scarpeG = scarpe ? byId.get(scarpe) ?? null : null;
  const prev = list.length > 1 ? list[(idx - 1 + list.length) % list.length] : null;
  const next = list.length > 1 ? list[(idx + 1) % list.length] : null;

  /* ---------- try-on (foto mode) ---------- */
  const photoMode = app.profile?.avatar_mode === "foto" && !!app.profile?.avatar_photo_path;
  const ids = [bottom, scarpe, ...top].filter(Boolean) as string[];
  const key = ids.join(",");
  const [tryPath, setTryPath] = useState<string | null>(null);
  const [tryKey, setTryKey] = useState("");
  const [tryLoading, setTryLoading] = useState(false);
  const [tryErr, setTryErr] = useState("");
  const tryUrl = useSignedUrl("tryons", tryPath);
  const photoUrl = useSignedUrl("avatars", app.profile?.avatar_photo_path);
  useEffect(() => {
    if (!photoMode || !ids.length || key === tryKey) return;
    setTryErr("");
    const t = window.setTimeout(async () => {
      setTryLoading(true);
      try {
        const r = await ai<{ image_path: string }>({ action: "tryon", garment_ids: ids });
        setTryPath(r.image_path);
        setTryKey(key);
      } catch (e) {
        setTryErr((e as Error).message);
      }
      setTryLoading(false);
    }, 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, photoMode]);

  const measures = app.profile ?? DEFAULT_MEASURES;
  const empty = !app.garments.length;

  return (
    <div className="min-h-[calc(100dvh-64px)] lg:min-h-[100dvh] flex flex-col overflow-hidden">
      <header className="px-5 pt-4 flex items-center justify-between">
        <h1 className="font-display text-[36px] lg:text-[44px] font-semibold leading-none">Crea il tuo outfit</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setPickOpen(true)} className="h-10 w-10 grid place-items-center" aria-label="Scegli capo">
            <Search size={22} />
          </button>
          <button onClick={() => !empty && setSaveOpen(true)} className="h-10 w-10 grid place-items-center" aria-label="Salva nei preferiti">
            <Heart size={22} />
          </button>
        </div>
      </header>

      {/* layers */}
      <div className="px-5 mt-3 flex gap-5 overflow-x-auto no-scrollbar min-h-[44px]">
        {topG.map((g, i) => (
          <button
            key={g.id + i}
            onClick={() => {
              setSlot("top");
              setTop((t) => [...t.slice(0, i), ...t.slice(i + 1), t[i]]);
            }}
            className={`shrink-0 text-left pb-1 border-b-2 ${i === topG.length - 1 && slot === "top" ? "border-gold" : "border-transparent"}`}
          >
            <div className="text-[11px] text-muted">Strato {i + 1}</div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[14px] ${i === topG.length - 1 && slot === "top" ? "text-gold font-semibold" : ""}`}>{g.nome}</span>
              {topG.length > 1 && (
                <X
                  size={15}
                  className="text-gold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTop((t) => t.filter((_, j) => j !== i));
                  }}
                />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* stage */}
      <div className="relative flex-1 flex items-center justify-center select-none" style={{ touchAction: "pan-y" }}>
        {empty ? (
          <div className="text-center px-10">
            <p className="text-muted">Aggiungi qualche capo al tuo armadio per iniziare a comporre outfit.</p>
            <PrimaryButton className="mt-4 mx-auto" onClick={() => app.setAddOpen(true)}>
              <Plus size={18} /> Aggiungi capo
            </PrimaryButton>
          </div>
        ) : (
          <>
            {/* side peeks */}
            {prev && (
              <button onClick={() => step(-1)} className="absolute left-[-46px] top-1/2 -translate-y-1/2 w-[92px] h-[160px] opacity-50 z-0">
                <GarmentImg g={prev} className="w-full h-full" />
              </button>
            )}
            {next && (
              <button onClick={() => step(1)} className="absolute right-[-46px] top-1/2 -translate-y-1/2 w-[92px] h-[160px] opacity-50 z-0">
                <GarmentImg g={next} className="w-full h-full" />
              </button>
            )}
            <motion.div
              className="relative z-10 h-[min(62dvh,560px)] aspect-[2/5] flex items-center justify-center cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragStart={() => {
                moved.current = true;
                cancelLp();
              }}
              onDragEnd={onDragEnd}
              onPointerDown={onDown}
              onPointerUp={cancelLp}
              onPointerLeave={cancelLp}
              onContextMenu={(e) => e.preventDefault()}
            >
              {photoMode ? (
                <div className="relative h-full aspect-[2/5]">
                  <div className="absolute inset-0 -mx-[60%] flex items-center justify-center">
                    {tryUrl && tryKey === key ? (
                      <motion.img key={tryUrl} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={tryUrl} className="h-full object-contain" draggable={false} />
                    ) : (
                      <div className="relative h-full">
                        {(tryUrl || photoUrl) && <img src={tryUrl || photoUrl!} className="h-full object-contain opacity-60" draggable={false} />}
                        <div className="absolute inset-0 shimmer-overlay" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="popLayout" custom={dir}>
                  <motion.div
                    key={key}
                    custom={dir}
                    initial={{ opacity: 0.4, x: dir * 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -dir * 30 }}
                    transition={{ duration: 0.22 }}
                    className="h-full"
                  >
                    <DressedMannequin m={measures} top={topG} bottom={bottomG} scarpe={scarpeG} className="h-full" />
                  </motion.div>
                </AnimatePresence>
              )}
            </motion.div>
            {photoMode && (tryLoading || tryErr) && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-2 rounded-full bg-surface shadow-soft text-[13px] flex items-center gap-2 max-w-[90%]">
                {tryLoading ? (
                  <>
                    <Sparkles size={15} className="text-gold animate-pulse" /> Ti sto vestendo…
                  </>
                ) : (
                  <span className="text-danger line-clamp-2">{tryErr}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* slot selector + hint */}
      {!empty && (
        <div className="px-5 pb-[calc(104px+env(safe-area-inset-bottom))] lg:pb-8">
          <div className="mx-auto w-fit p-1 rounded-full bg-card flex gap-1">
            {(Object.keys(SLOT_LABEL) as Slot[]).map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                disabled={!bySlot[s].length}
                className={`px-4 h-9 rounded-full text-[14px] font-medium transition disabled:opacity-30 ${slot === s ? "bg-surface shadow-soft text-ink" : "text-muted"}`}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="text-center text-[12.5px] text-muted mt-3">
            {slot === "top" ? "Scorri per cambiare · Tieni premuto per aggiungere uno strato" : "Scorri per cambiare capo"}
          </p>
        </div>
      )}

      <PickSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        items={list}
        title={`Scegli: ${SLOT_LABEL[slot]}`}
        onPick={(g) => {
          setCurrent(g.id);
          setPickOpen(false);
        }}
      />
      <SaveSheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        top={top}
        bottom={bottom}
        scarpe={scarpe}
        preview={photoMode && tryKey === key ? tryPath : null}
        previewNode={<DressedMannequin m={measures} top={topG} bottom={bottomG} scarpe={scarpeG} className="h-full" />}
        previewUrl={photoMode && tryKey === key ? tryUrl : null}
      />
    </div>
  );
}

function PickSheet({ open, onClose, items, onPick, title }: { open: boolean; onClose: () => void; items: Garment[]; onPick: (g: Garment) => void; title: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="grid grid-cols-3 gap-2.5 pb-6">
        {items.map((g) => (
          <button key={g.id} onClick={() => onPick(g)} className="rounded-2xl bg-card p-2">
            <div className="aspect-square">
              <GarmentImg g={g} className="w-full h-full" />
            </div>
            <div className="text-[12px] mt-1 line-clamp-1">{g.nome}</div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function SaveSheet(props: {
  open: boolean;
  onClose: () => void;
  top: string[];
  bottom: string | null;
  scarpe: string | null;
  preview: string | null;
  previewUrl: string | null;
  previewNode: React.ReactNode;
}) {
  const app = useApp();
  const [nome, setNome] = useState("");
  const [stile, setStile] = useState("Weekend");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { data: o, error } = await supabase
      .from("outfits")
      .insert({ user_id: app.uid, nome: nome || stile, stile, preferito: true, preview_path: props.preview })
      .select()
      .single();
    if (!error && o) {
      const items = [
        ...props.top.map((id, i) => ({ outfit_id: o.id, garment_id: id, slot: "top", layer: i + 1, user_id: app.uid })),
        ...(props.bottom ? [{ outfit_id: o.id, garment_id: props.bottom, slot: "bottom", layer: 1, user_id: app.uid }] : []),
        ...(props.scarpe ? [{ outfit_id: o.id, garment_id: props.scarpe, slot: "scarpe", layer: 1, user_id: app.uid }] : []),
      ];
      await supabase.from("outfit_items").insert(items);
      await app.reload();
      app.toast("Aggiunto ai preferiti");
      setNome("");
      props.onClose();
    } else app.toast(error?.message || "Errore");
    setBusy(false);
  };
  return (
    <Sheet open={props.open} onClose={props.onClose} eyebrow="Outfit" title="Salva nei tuoi preferiti">
      <div className="h-[260px] rounded-[22px] bg-card flex items-center justify-center overflow-hidden">
        {props.previewUrl ? <img src={props.previewUrl} className="h-full object-contain" /> : <div className="h-[240px]">{props.previewNode}</div>}
      </div>
      <div className="mt-4 space-y-4">
        <Field label="Nome dell'outfit">
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Weekend" />
        </Field>
        <div>
          <div className="text-[13px] text-muted mb-2">Stile dell'outfit</div>
          <div className="flex flex-wrap gap-2">
            {STILI.map((s) => (
              <Chip key={s} active={stile === s} onClick={() => setStile(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>
        <PrimaryButton className="w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />} Salva
        </PrimaryButton>
      </div>
      <div className="h-4" />
    </Sheet>
  );
}
