import { ImagePlus, RotateCcw } from "lucide-react";
import { useRef } from "react";
import { useApp } from "../lib/store";
import { supabase, uploadImage } from "../lib/supabase";
import { AlfredAvatar } from "./AlfredIcon";

const VOCI = [
  { id: "Charon", desc: "Profonda e pacata" },
  { id: "Orus", desc: "Ferma, autorevole" },
  { id: "Algenib", desc: "Roca, vissuta" },
  { id: "Iapetus", desc: "Limpida, misurata" },
  { id: "Schedar", desc: "Calma, equilibrata" },
  { id: "Enceladus", desc: "Morbida, sussurrata" },
];

/** Alfred su misura: il volto (un'immagine scelta da te, privata) e la voce per le chiamate. */
export function AlfredSettings() {
  const app = useApp();
  const ref = useRef<HTMLInputElement>(null);
  const voce = app.profile?.alfred_voce || "Charon";
  const upload = async (f?: File) => {
    if (!f) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = await uploadImage("avatars", u.user!.id, f, "alfred");
      await app.setProfile({ alfred_foto: path });
      app.toast("Il nuovo volto di Alfred è pronto");
    } catch (e) {
      app.toast((e as Error).message);
    }
  };
  return (
    <div className="rounded-[22px] bg-surface shadow-soft p-5">
      <div className="flex items-center gap-4">
        <AlfredAvatar size={64} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[22px] leading-tight">Alfred</div>
          <div className="text-[13px] text-muted">Il suo maggiordomo: in chat e al telefono</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button onClick={() => ref.current?.click()} className="h-10 px-4 rounded-full bg-card text-[13.5px] font-semibold flex items-center gap-1.5">
          <ImagePlus size={15} /> Cambia volto
        </button>
        {app.profile?.alfred_foto && (
          <button onClick={() => app.setProfile({ alfred_foto: null })} className="h-10 px-4 rounded-full bg-card text-[13.5px] font-semibold flex items-center gap-1.5">
            <RotateCcw size={15} /> Icona originale
          </button>
        )}
      </div>
      <div className="mt-5 text-[13px] font-semibold">Voce al telefono</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {VOCI.map((v) => (
          <button key={v.id} onClick={() => app.setProfile({ alfred_voce: v.id })} className={`rounded-[14px] px-3 py-2.5 text-left ${voce === v.id ? "bg-brand text-brand-fg" : "bg-card"}`}>
            <div className="text-[14px] font-semibold">{v.id}</div>
            <div className={`text-[12px] ${voce === v.id ? "opacity-80" : "text-muted"}`}>{v.desc}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[12px] text-muted">Parla sempre in italiano con un lieve accento inglese. Provala con il telefono nella chat di Alfred.</div>
    </div>
  );
}
