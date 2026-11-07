import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isIOS, isStandalone } from "../lib/push";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIP | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as BIP;
});

const KEY = "habitus-install-dismissed";

/** Invito a installare Habitus come app (si vede solo se è aperta nel browser). */
export function InstallCard() {
  const [hidden, setHidden] = useState(() => {
    try {
      return isStandalone() || Date.now() - Number(localStorage.getItem(KEY) || 0) < 14 * 86400000;
    } catch {
      return isStandalone();
    }
  });
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  useEffect(() => {
    const f = (e: Event) => {
      e.preventDefault();
      deferred = e as BIP;
      setCanPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", f);
    window.addEventListener("appinstalled", () => setHidden(true));
    return () => window.removeEventListener("beforeinstallprompt", f);
  }, []);
  if (hidden) return null;
  const ios = isIOS();
  const safari = ios && !/crios|fxios|edgios/i.test(navigator.userAgent);
  if (!ios && !canPrompt) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* */
    }
    setHidden(true);
  };

  return (
    <div className="mt-4 rounded-[22px] bg-hero text-herofg p-5 relative">
      <button onClick={dismiss} className="absolute top-3 right-3 h-8 w-8 grid place-items-center opacity-60" aria-label="Chiudi">
        <X size={16} />
      </button>
      <div className="flex items-center gap-3">
        <img src="./habitus-180.png?v=4" className="h-12 w-12 rounded-[12px]" alt="" />
        <div className="pr-6">
          <div className="font-semibold text-[15.5px]">Installa Habitus come app</div>
          <div className="text-[13px] opacity-75">Si apre a schermo intero, funziona anche senza rete e riceve i promemoria.</div>
        </div>
      </div>
      {ios ? (
        safari ? (
          <ol className="mt-4 space-y-2 text-[13.5px]">
            <li className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-gold text-ongold grid place-items-center text-[12px] font-bold">1</span> Tocca <Share size={15} className="text-gold" /> <b>Condividi</b> nella barra di Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-gold text-ongold grid place-items-center text-[12px] font-bold">2</span> Scegli <SquarePlus size={15} className="text-gold" /> <b>Aggiungi alla schermata Home</b>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-gold text-ongold grid place-items-center text-[12px] font-bold">3</span> Apri Habitus dall'icona verde e ottone
            </li>
          </ol>
        ) : (
          <div className="mt-3 text-[13.5px]">Apri questa pagina in <b>Safari</b>: su iPhone solo Safari installa le app web.</div>
        )
      ) : (
        <button
          onClick={async () => {
            await deferred?.prompt();
            const r = await deferred?.userChoice;
            if (r?.outcome === "accepted") setHidden(true);
            deferred = null;
          }}
          className="mt-4 h-10 px-5 rounded-full bg-gold text-ongold text-[13.5px] font-semibold flex items-center gap-2"
        >
          <Download size={15} /> Installa
        </button>
      )}
    </div>
  );
}
