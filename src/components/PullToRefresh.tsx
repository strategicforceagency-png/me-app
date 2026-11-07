import { Loader2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SOGLIA = 80; // pixel da tirare per aggiornare

/** Tira giù dall'inizio della pagina per aggiornare l'app (anche installata su iPhone, dove non c'è il gesto del browser). */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pulled = useRef(0);

  // dopo l'aggiornamento torna dove eri (i dati arrivano dopo: si riprova per qualche istante)
  useEffect(() => {
    let y = 0;
    try {
      y = Number(sessionStorage.getItem("habitus-scroll") || 0);
      sessionStorage.removeItem("habitus-scroll");
    } catch {
      return;
    }
    if (!y) return;
    let n = 0;
    const t = setInterval(() => {
      window.scrollTo(0, y);
      if (Math.abs(window.scrollY - y) < 4 || ++n > 20) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // dentro finestre, chat e menu fissi il gesto non vale; vale solo sulla pagina
    const blocked = (el: EventTarget | null) => {
      let n = el as HTMLElement | null;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (cs.position === "fixed") return true;
        if (n.scrollTop > 0 && /(auto|scroll)/.test(cs.overflowY)) return true;
        n = n.parentElement;
      }
      return false;
    };
    const onStart = (e: TouchEvent) => {
      if (busy || window.scrollY > 0 || e.touches.length !== 1 || blocked(e.target)) {
        start.current = null;
        return;
      }
      start.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pulled.current = 0;
        setPull(0);
        return;
      }
      const v = Math.min(140, dy * 0.5);
      pulled.current = v;
      setPull(v);
      if (v > 8 && e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (start.current == null) return;
      start.current = null;
      if (pulled.current >= SOGLIA) {
        setBusy(true);
        setPull(SOGLIA);
        navigator.vibrate?.(10);
        // ricarica: prende la versione più recente dell'app e i dati aggiornati
        try {
          sessionStorage.setItem("habitus-scroll", String(window.scrollY));
        } catch {
          /* niente */
        }
        setTimeout(() => window.location.reload(), 250);
      } else setPull(0);
      pulled.current = 0;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [busy]);

  if (!pull && !busy) return null;
  const ready = pull >= SOGLIA;
  return (
    <div className="fixed inset-x-0 z-[45] flex justify-center pointer-events-none lg:hidden" style={{ top: `calc(env(safe-area-inset-top) + ${Math.max(8, pull - 24)}px)`, transition: start.current == null ? "top .2s" : "none" }}>
      <div className={`h-10 w-10 rounded-full shadow-dock grid place-items-center ${ready ? "bg-brand text-brand-fg" : "bg-surface text-gold"}`}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <RotateCw size={18} style={{ transform: `rotate(${pull * 3}deg)` }} />}
      </div>
    </div>
  );
}
