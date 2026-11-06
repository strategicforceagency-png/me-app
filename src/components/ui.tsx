import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Garment, garmentPath, transparentUrl, useSignedUrl } from "../lib/supabase";

export function Sheet({
  open,
  onClose,
  children,
  title,
  eyebrow,
  full,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  full?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = o;
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full max-w-[430px] bg-surface rounded-t-[28px] shadow-2xl flex flex-col ${
              full ? "h-[92dvh]" : "max-h-[92dvh]"
            }`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            <div className="pt-2.5 pb-1 flex justify-center cursor-grab">
              <div className="h-1.5 w-10 rounded-full bg-ink/15" />
            </div>
            {(title || eyebrow) && (
              <div className="px-5 pt-2 pb-3 flex items-start justify-between">
                <div>
                  {eyebrow && <div className="text-[13px] text-muted">{eyebrow}</div>}
                  {title && <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>}
                </div>
                <button onClick={onClose} className="p-2 -mr-2 text-muted" aria-label="Chiudi">
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[14px] font-medium border transition ${
        active ? "bg-brand text-brand-fg border-gold" : "bg-surface text-ink border-line"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-12 px-6 rounded-full bg-brand text-brand-fg font-semibold shadow-pill active:scale-[.98] transition disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-[13px] text-muted mb-1.5">{label}</div>
      {children}
    </label>
  );
}
export const inputCls =
  "w-full h-12 px-4 rounded-2xl bg-card border border-transparent focus:border-gold focus:bg-surface outline-none text-[16px]";

export function GarmentImg({ g, className = "" }: { g: Garment; className?: string }) {
  const path = garmentPath(g);
  const url = useSignedUrl("garments", path);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (!url || !path) return;
    transparentUrl(path, url).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [url, path]);
  if (!src) return <div className={`shimmer rounded-xl ${className}`} />;
  return <img src={src} alt={g.nome} draggable={false} className={`object-contain select-none pointer-events-none ${className}`} />;
}

export function Toast({ msg }: { msg: string | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-ink text-bg text-[14px] font-medium shadow-lg w-max max-w-[88vw] text-center"
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
