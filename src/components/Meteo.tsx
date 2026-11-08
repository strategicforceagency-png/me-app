import { ArrowRight, ChevronDown, CloudRain, Loader2, MapPin, RefreshCw, Sun, Umbrella } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../lib/store";
import { fn, MeteoOggi, SLOT_OF } from "../lib/supabase";

const oggiStr = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());

/** Posizione del telefono; se negata, la funzione usa l'ultima nota o la città del profilo. */
function posizione(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => res(null),
      { maximumAge: 30 * 60000, timeout: 8000, enableHighAccuracy: false },
    );
  });
}

export function MeteoCard() {
  const app = useApp();
  const oggi = oggiStr();
  const planned = app.outfits.find((o) => o.giorno === oggi) || null;
  const cached = (() => {
    const m = planned?.meteo;
    if (m && m.giorno === oggi && Date.now() - new Date(m.data).getTime() < 3 * 3600000) return m;
    try {
      const c = JSON.parse(sessionStorage.getItem("habitus-meteo") || "null") as MeteoOggi | null;
      if (c && c.giorno === oggi && Date.now() - new Date(c.data).getTime() < 3 * 3600000 && c.outfit_id === (planned?.id || null)) return c;
    } catch {
      /* niente */
    }
    return null;
  })();
  const [m, setM] = useState<MeteoOggi | null>(cached);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const byId = new Map(app.garments.map((g) => [g.id, g]));

  const carica = async () => {
    setBusy(true);
    try {
      const pos = await posizione();
      const r = await fn<MeteoOggi>("armadio", "", { action: "meteo", ...(pos || {}) });
      setM(r);
      try {
        sessionStorage.setItem("habitus-meteo", JSON.stringify(r));
      } catch {
        /* niente */
      }
    } catch (e) {
      app.toast((e as Error).message);
    }
    setBusy(false);
  };
  useEffect(() => {
    if (!m && app.garments.length) carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planned?.id, app.garments.length]);

  /** mette nell'editor l'outfit di oggi già corretto (o la proposta) */
  const applica = () => {
    if (!m) return;
    let ids: string[] = planned ? planned.outfit_items.map((i) => i.garment_id) : m.proposta;
    for (const c of m.modifiche) {
      if (c.togli) ids = ids.filter((x) => x !== c.togli);
      if (c.metti && !ids.includes(c.metti)) ids.push(c.metti);
    }
    const gs = ids.map((id) => byId.get(id)).filter(Boolean);
    app.setDraft({
      top: gs.filter((g) => SLOT_OF[g!.categoria] === "top").map((g) => g!.id),
      bottom: gs.find((g) => SLOT_OF[g!.categoria] === "bottom")?.id ?? null,
      scarpe: gs.find((g) => SLOT_OF[g!.categoria] === "scarpe")?.id ?? null,
    });
    app.toast("Outfit aggiornato nell'editor");
  };

  if (!app.garments.length) return null;
  const pioggia = m && m.meteo.ore_pioggia.length > 0;
  const tono = !m ? "" : m.verdetto === "da_cambiare" ? "bg-danger-tint" : m.verdetto === "piccoli_ritocchi" ? "bg-gold-tint" : "bg-card";
  return (
    <div className={`mx-5 mt-3 rounded-[20px] ${tono || "bg-card"} p-3.5`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 text-left">
        <div className="h-10 w-10 rounded-2xl bg-surface grid place-items-center text-gold shrink-0">
          {busy && !m ? <Loader2 size={18} className="animate-spin" /> : pioggia ? <CloudRain size={19} /> : <Sun size={19} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold flex items-center gap-1.5">
            {m ? (
              <>
                {m.meteo.min}°–{m.meteo.max}° {m.luogo && <span className="text-muted font-normal flex items-center gap-0.5"><MapPin size={11} />{m.luogo}</span>}
              </>
            ) : (
              "Meteo di oggi"
            )}
          </div>
          <div className="text-[13px] text-muted line-clamp-1">
            {!m ? (busy ? "Guardo il cielo…" : "Tocchi per controllare") : planned ? `${planned.nome}: ${m.verdetto === "va_bene" ? "va bene così" : m.verdetto === "piccoli_ritocchi" ? "un piccolo ritocco" : "da cambiare"}` : m.sintesi}
          </div>
        </div>
        <ChevronDown size={18} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && m && (
        <div className="mt-3 space-y-2.5 text-[14px]">
          <p>{m.messaggio}</p>
          {m.modifiche.length > 0 && (
            <ul className="space-y-1">
              {m.modifiche.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5 flex-wrap">
                  {c.togli && <span className="line-through text-muted">{byId.get(c.togli)?.nome}</span>}
                  {c.togli && c.metti && <ArrowRight size={13} className="text-muted" />}
                  {c.metti && <b>{byId.get(c.metti)?.nome}</b>}
                  <span className="text-muted">— {c.perche}</span>
                </li>
              ))}
            </ul>
          )}
          {!planned && m.proposta.length > 0 && (
            <div className="text-muted">Proposta: {m.proposta.map((id) => byId.get(id)?.nome).filter(Boolean).join(", ")}</div>
          )}
          {m.accessori.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted">
              <Umbrella size={14} /> {m.accessori.join(" · ")}
            </div>
          )}
          {m.strati && <div className="text-muted">{m.strati}</div>}
          <div className="flex gap-1 overflow-x-auto no-scrollbar text-[12px] text-center pt-1">
            {m.meteo.ore.map((o) => (
              <div key={o.ora} className="shrink-0 w-11 rounded-xl bg-surface py-1.5">
                <div className="text-muted">{o.ora.slice(0, 2)}</div>
                <div className="font-semibold">{o.temp}°</div>
                <div className={o.pioggia_prob >= 40 ? "text-gold" : "text-muted"}>{o.pioggia_prob}%</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            {(m.modifiche.length > 0 || (!planned && m.proposta.length > 0)) && (
              <button onClick={applica} className="flex-1 h-10 rounded-full bg-brand text-brand-fg text-[13px] font-semibold">
                {planned ? "Applica le modifiche" : "Prova la proposta"}
              </button>
            )}
            <button onClick={carica} disabled={busy} className="h-10 px-4 rounded-full bg-surface text-[13px] font-medium flex items-center gap-1.5">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Ricontrolla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
