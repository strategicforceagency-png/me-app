import { Camera, Download, Heart, Loader2, LogOut, Moon, Plus, Settings, Shirt, SlidersHorizontal, Sun, Trash2 } from "lucide-react";
import { RemindersCard } from "../components/Reminders";
import { PasskeysCard } from "../components/Passkeys";
import { SchedaCard, type SchedaData } from "../components/Scheda";
import { useTheme } from "../lib/theme";
import { useRef, useState } from "react";
import { DEFAULT_MEASURES, DressedMannequin, MannequinSvg, Measures } from "../components/Mannequin";
import { Field, inputCls, PrimaryButton, Sheet } from "../components/ui";
import { useApp } from "../lib/store";
import { fn, Outfit, supabase, uploadImage, useSignedUrl } from "../lib/supabase";

export function Profile() {
  const app = useApp();
  const p = app.profile;
  const photo = useSignedUrl("avatars", p?.avatar_photo_path);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [measOpen, setMeasOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const favs = app.outfits.filter((o) => o.preferito);

  const onPhoto = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const path = await uploadImage("avatars", app.uid, f, "avatar");
      await app.setProfile({ avatar_photo_path: path, avatar_mode: "foto" });
      app.toast("Foto aggiornata");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setUploading(false);
  };

  return (
    <div className="px-5 lg:px-10 pb-32 lg:pb-12 max-w-[900px]">
      <header className="pt-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-card shrink-0">
          {photo ? <img src={photo} className="w-full h-full object-cover object-top" /> : <MannequinSvg className="w-full h-[200%] -mt-1" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[32px] lg:text-[40px] font-semibold leading-tight truncate">Ciao {p?.nome || ""}</h1>
          <div className="text-[13px] text-muted">
            Hai {app.garments.length} capi e {favs.length} outfit preferiti
          </div>
        </div>
        <button onClick={() => setSetOpen(true)} className="h-10 w-10 grid place-items-center text-muted" aria-label="Impostazioni">
          <Settings size={22} />
        </button>
      </header>

      <div className="mt-5 flex items-center gap-2">
        <button onClick={() => app.setAddOpen(true)} className="flex-1 h-12 rounded-full text-gold font-semibold flex items-center justify-center gap-1.5">
          <Plus size={18} /> Aggiungi capo
        </button>
        <PrimaryButton className="flex-1" onClick={() => app.setTab("outfit")}>
          <Shirt size={18} /> Crea Outfit
        </PrimaryButton>
      </div>

      <h2 className="mt-7 mb-3 text-[17px] font-bold">Avatar</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => (p?.avatar_photo_path ? app.setProfile({ avatar_mode: "foto" }) : setTipsOpen(true))}
          className={`rounded-[20px] bg-surface p-2.5 text-left border-2 transition ${p?.avatar_mode === "foto" ? "border-gold" : "border-transparent shadow-soft"}`}
        >
          <div className="aspect-[3/4] rounded-2xl bg-card overflow-hidden grid place-items-center">
            {uploading ? (
              <Loader2 className="animate-spin text-muted" />
            ) : photo ? (
              <img src={photo} className="w-full h-full object-cover object-top" />
            ) : (
              <Camera className="text-muted" />
            )}
          </div>
          <div className="pt-2 px-1">
            <div className="text-[14px] font-semibold">La tua foto</div>
            <div className={`text-[12px] ${p?.avatar_mode === "foto" ? "text-gold" : "text-muted"}`}>
              {p?.avatar_mode === "foto" ? "In uso" : p?.avatar_photo_path ? "Tocca per selezionare" : "Carica una foto"}
            </div>
          </div>
        </button>
        <button
          onClick={() => app.setProfile({ avatar_mode: "manichino" })}
          className={`rounded-[20px] bg-surface p-2.5 text-left border-2 transition ${p?.avatar_mode !== "foto" ? "border-gold" : "border-transparent shadow-soft"}`}
        >
          <div className="aspect-[3/4] rounded-2xl bg-card grid place-items-center py-2">
            <MannequinSvg m={p ?? DEFAULT_MEASURES} className="h-full" />
          </div>
          <div className="pt-2 px-1">
            <div className="text-[14px] font-semibold">Manichino</div>
            <div className={`text-[12px] ${p?.avatar_mode !== "foto" ? "text-gold" : "text-muted"}`}>
              {p?.avatar_mode !== "foto" ? "In uso" : "Tocca per selezionare"}
            </div>
          </div>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => setTipsOpen(true)} className="h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2">
          <Camera size={16} /> Cambia foto
        </button>
        <button onClick={() => setMeasOpen(true)} className="h-11 rounded-full bg-card text-[14px] font-medium flex items-center justify-center gap-2">
          <SlidersHorizontal size={16} /> Personalizza misure
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />

      <h2 className="mt-8 mb-3 text-[17px] font-bold">I tuoi outfit preferiti</h2>
      {favs.length === 0 ? (
        <div className="rounded-[20px] bg-surface shadow-soft p-5 text-center text-muted text-[14px]">
          Crea un outfit e tocca il cuore per salvarlo qui.
        </div>
      ) : (
        <div className="-mx-5 px-5 lg:-mx-10 lg:px-10 flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {favs.map((o) => (
            <OutfitCard key={o.id} o={o} />
          ))}
        </div>
      )}

      <Sheet open={tipsOpen} onClose={() => setTipsOpen(false)} title="La tua foto">
        <p className="text-[15px] text-muted">Per una prova virtuale realistica:</p>
        <ul className="mt-3 space-y-2 text-[15px]">
          <li>📏 Figura intera, dalla testa ai piedi</li>
          <li>🧍 In piedi, frontale, braccia leggermente staccate</li>
          <li>👕 Abiti aderenti e semplici (es. t-shirt e pantaloncini)</li>
          <li>💡 Buona luce e sfondo neutro</li>
        </ul>
        <PrimaryButton
          className="w-full mt-5"
          onClick={() => {
            setTipsOpen(false);
            fileRef.current?.click();
          }}
        >
          <Camera size={18} /> Scegli foto
        </PrimaryButton>
        <div className="h-4" />
      </Sheet>
      <div className="mt-8 max-w-[720px]">
        <SchedaCard
          title="Cosa Habitus sa di te"
          scheda={(app.profile?.scheda as SchedaData) || {}}
          onChange={(sc) => app.setProfile({ scheda: sc })}
          onRefresh={async () => {
            const r = await fn<{ scheda: SchedaData }>("conoscenza", "", { action: "me" });
            await app.setProfile({ scheda: r.scheda });
          }}
          empty="Habitus impara a conoscerti da quello che scrivi ad Alfred, dai controlli settimanali, dall'armadio, dagli acquisti e dalle scelte che fai. Più lo usi, più i consigli diventano tuoi. Premi Aggiorna per costruire la prima versione."
          catHint="Aggiungi tu un dettaglio su di te"
        />
      </div>
      <AccountTools />
      <MeasuresSheet open={measOpen} onClose={() => setMeasOpen(false)} />
      <SettingsSheet open={setOpen} onClose={() => setSetOpen(false)} />
    </div>
  );
}

function OutfitCard({ o }: { o: Outfit }) {
  const app = useApp();
  const url = useSignedUrl("tryons", o.preview_path);
  const items = [...o.outfit_items].sort((a, b) => a.layer - b.layer);
  const g = (id: string) => app.garments.find((x) => x.id === id);
  const top = items.filter((i) => i.slot === "top").map((i) => g(i.garment_id)!).filter(Boolean);
  const bottom = g(items.find((i) => i.slot === "bottom")?.garment_id ?? "") ?? null;
  const scarpe = g(items.find((i) => i.slot === "scarpe")?.garment_id ?? "") ?? null;
  const [menu, setMenu] = useState(false);
  const open = () => {
    app.setDraft({ top: top.map((x) => x.id), bottom: bottom?.id ?? null, scarpe: scarpe?.id ?? null });
    app.setTab("outfit");
  };
  return (
    <div className="shrink-0 w-[150px]">
      <button onClick={open} onContextMenu={(e) => (e.preventDefault(), setMenu(true))} className="relative w-full h-[210px] rounded-[20px] bg-surface shadow-soft overflow-hidden grid place-items-center">
        {url ? <img src={url} className="h-full w-full object-cover object-top" /> : <DressedMannequin m={app.profile ?? undefined} top={top} bottom={bottom} scarpe={scarpe} className="h-[190px]" />}
        <Heart size={18} className="absolute top-2.5 right-2.5 text-gold fill-gold" />
      </button>
      <div className="mt-2 px-1 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold truncate">{o.nome}</div>
          <div className="text-[12px] text-muted">{o.stile}</div>
        </div>
        <button onClick={() => setMenu(true)} className="text-muted p-1" aria-label="Elimina">
          <Trash2 size={15} />
        </button>
      </div>
      <Sheet open={menu} onClose={() => setMenu(false)} title={o.nome}>
        <button
          onClick={async () => {
            await supabase.from("outfits").delete().eq("id", o.id);
            await app.reload();
            setMenu(false);
            app.toast("Outfit eliminato");
          }}
          className="w-full h-12 rounded-full bg-danger-tint text-danger font-semibold"
        >
          Elimina outfit
        </button>
        <div className="h-4" />
      </Sheet>
    </div>
  );
}

const SLIDERS: { k: keyof Measures; label: string; min: number; max: number; unit: string }[] = [
  { k: "altezza", label: "Altezza", min: 150, max: 205, unit: "cm" },
  { k: "peso", label: "Peso", min: 45, max: 140, unit: "kg" },
  { k: "spalle", label: "Spalle", min: 36, max: 60, unit: "cm" },
  { k: "petto", label: "Petto", min: 80, max: 135, unit: "cm" },
  { k: "vita", label: "Vita", min: 60, max: 125, unit: "cm" },
  { k: "fianchi", label: "Fianchi", min: 80, max: 130, unit: "cm" },
];

function MeasuresSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const base = app.profile ?? DEFAULT_MEASURES;
  const [m, setM] = useState<Measures | null>(null);
  const cur: Measures = m ?? {
    altezza: base.altezza,
    peso: base.peso,
    spalle: base.spalle,
    petto: base.petto,
    vita: base.vita,
    fianchi: base.fianchi,
    forma_corpo: base.forma_corpo,
  };
  const set = (k: keyof Measures, v: number) => setM({ ...cur, [k]: v });
  return (
    <Sheet
      open={open}
      onClose={() => {
        setM(null);
        onClose();
      }}
      eyebrow="Manichino"
      title="Personalizza le misure"
    >
      <div className="h-[230px] rounded-[22px] bg-card grid place-items-center py-3">
        <MannequinSvg m={cur} className="h-full" />
      </div>
      <div className="mt-5 space-y-5">
        <div>
          <div className="text-[14px] font-medium mb-2">Forma del corpo</div>
          <input type="range" min={0} max={100} value={cur.forma_corpo} onChange={(e) => set("forma_corpo", +e.target.value)} className="range" style={{ ["--p" as string]: `${cur.forma_corpo}%` }} />
          <div className="flex justify-between text-[12px] text-muted mt-1">
            <span>Femminile</span>
            <span>Maschile</span>
          </div>
        </div>
        {SLIDERS.map((s) => (
          <div key={s.k}>
            <div className="flex justify-between text-[14px] mb-2">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted">
                {cur[s.k]} {s.unit}
              </span>
            </div>
            <input type="range" min={s.min} max={s.max} value={cur[s.k]} onChange={(e) => set(s.k, +e.target.value)} className="range" style={{ ["--p" as string]: `${((cur[s.k] - s.min) / (s.max - s.min)) * 100}%` }} />
          </div>
        ))}
        <PrimaryButton
          className="w-full"
          onClick={async () => {
            await app.setProfile(cur);
            app.toast("Misure salvate");
            setM(null);
            onClose();
          }}
        >
          Salva misure
        </PrimaryButton>
      </div>
      <div className="h-4" />
    </Sheet>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const p = app.profile;
  const [nome, setNome] = useState(p?.nome ?? "");
  const [t, setT] = useState({ top: p?.taglia_top ?? "", pant: p?.taglia_pantaloni ?? "", sc: p?.taglia_scarpe ?? "" });
  return (
    <Sheet open={open} onClose={onClose} title="Impostazioni">
      <div className="space-y-4">
        <Field label="Il tuo nome">
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Taglia sopra">
            <input className={inputCls} value={t.top} onChange={(e) => setT({ ...t, top: e.target.value })} placeholder="M" />
          </Field>
          <Field label="Pantaloni">
            <input className={inputCls} value={t.pant} onChange={(e) => setT({ ...t, pant: e.target.value })} placeholder="48" />
          </Field>
          <Field label="Scarpe">
            <input className={inputCls} value={t.sc} onChange={(e) => setT({ ...t, sc: e.target.value })} placeholder="43" />
          </Field>
        </div>
        <PrimaryButton
          className="w-full"
          onClick={async () => {
            await app.setProfile({ nome, taglia_top: t.top, taglia_pantaloni: t.pant, taglia_scarpe: t.sc });
            app.toast("Salvato");
            onClose();
          }}
        >
          Salva
        </PrimaryButton>
        <button onClick={() => supabase.auth.signOut()} className="w-full h-12 rounded-full bg-card font-medium flex items-center justify-center gap-2">
          <LogOut size={18} /> Esci
        </button>
        <div className="text-center text-[12px] text-muted">{app.email}</div>
      </div>
      <div className="h-4" />
    </Sheet>
  );
}

const EXPORT_TABLES = ["profiles", "garments", "outfits", "outfit_items", "inspirations", "style_picks", "academy_progress", "path_checks", "path_reviews", "progress_entries", "progress_photos", "field_trials", "workout_logs", "language_logs", "health_metrics", "health_workouts", "purchases", "wishlist", "artisans"];

/** Promemoria, tema e copia dei dati: in fondo al profilo (sul telefono non c'è più il menu laterale). */
function AccountTools() {
  const app = useApp();
  const { theme, toggle } = useTheme();
  const [busy, setBusy] = useState(false);
  const exportData = async () => {
    setBusy(true);
    try {
      const out: Record<string, unknown> = { esportato_il: new Date().toISOString(), email: app.email };
      for (const t of EXPORT_TABLES) {
        const { data, error } = await supabase.from(t).select("*");
        out[t] = error ? { errore: error.message } : data;
      }
      const prof = (out.profiles as Record<string, unknown>[] | undefined)?.[0];
      if (prof) delete prof.ingest_token;
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `habitus-dati-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      app.toast("Copia dei dati scaricata");
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="mt-8 max-w-[720px] space-y-3">
      <PasskeysCard />
      <RemindersCard />
      <div className="rounded-[22px] bg-surface shadow-soft divide-y divide-line">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-5 py-4 text-left">
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          <span className="flex-1 text-[15px] font-medium">{theme === "dark" ? "Tema chiaro" : "Tema scuro"}</span>
        </button>
        <button onClick={exportData} disabled={busy} className="w-full flex items-center gap-3 px-5 py-4 text-left">
          {busy ? <Loader2 size={19} className="animate-spin" /> : <Download size={19} />}
          <span className="flex-1">
            <span className="block text-[15px] font-medium">Scarica una copia dei tuoi dati</span>
            <span className="block text-[12.5px] text-muted">Tutto il percorso, l'armadio, i progressi e i diari in un file. Le foto restano nell'archivio.</span>
          </span>
        </button>
        <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-5 py-4 text-left text-muted">
          <LogOut size={19} />
          <span className="flex-1 text-[15px] font-medium">Esci</span>
        </button>
      </div>
    </div>
  );
}
