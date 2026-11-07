import { Fingerprint, Loader2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { passkeyError, passkeySupported } from "../lib/passkey";

type PK = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

function usePasskeys() {
  const [list, setList] = useState<PK[] | null>(null);
  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.passkey.list();
      setList(error ? [] : ((data as PK[]) || []));
    } catch {
      setList([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { list, load };
}

async function register(toast: (m: string) => void) {
  try {
    const { error } = await supabase.auth.registerPasskey();
    if (error) throw error;
    toast("Passkey attivata: dalla prossima volta entri con Face ID");
    return true;
  } catch (e) {
    const m = passkeyError(e);
    if (m) toast(m);
    return false;
  }
}

/** Gestione passkey nel profilo. */
export function PasskeysCard() {
  const app = useApp();
  const { list, load } = usePasskeys();
  const [busy, setBusy] = useState(false);
  if (!passkeySupported()) return null;
  return (
    <div className="rounded-[22px] bg-surface shadow-soft p-5">
      <div className="flex items-center gap-3">
        <Fingerprint size={20} className={list?.length ? "text-gold" : "text-muted"} />
        <div className="flex-1">
          <div className="font-semibold text-[16px]">Passkey</div>
          <div className="text-[12.5px] text-muted">{list?.length ? "Accedi con Face ID o Touch ID, senza password" : "Entra con Face ID o Touch ID invece della password"}</div>
        </div>
        <button
          onClick={async () => {
            setBusy(true);
            if (await register(app.toast)) load();
            setBusy(false);
          }}
          disabled={busy}
          className={`h-10 px-4 rounded-full text-[13.5px] font-semibold flex items-center gap-1.5 ${list?.length ? "bg-card" : "bg-brand text-brand-fg"}`}
        >
          {busy && <Loader2 size={14} className="animate-spin" />} {list?.length ? "Aggiungi" : "Attiva"}
        </button>
      </div>
      {!!list?.length && (
        <div className="mt-3 divide-y divide-line">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-medium truncate">{p.friendly_name || "Passkey"}</div>
                <div className="text-[12px] text-muted">
                  Creata il {new Date(p.created_at).toLocaleDateString("it-IT")}
                  {p.last_used_at ? ` · usata il ${new Date(p.last_used_at).toLocaleDateString("it-IT")}` : ""}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirmDelete(app.toast)) return;
                  await supabase.auth.passkey.delete({ passkeyId: p.id });
                  load();
                }}
                className="h-8 w-8 grid place-items-center text-muted"
                aria-label="Elimina passkey"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// conferma senza finestre di sistema: secondo tocco entro 3 secondi
let armed = 0;
function confirmDelete(toast: (m: string) => void) {
  if (Date.now() - armed < 3000) return true;
  armed = Date.now();
  toast("Tocca di nuovo per eliminare la passkey");
  return false;
}

const KEY = "habitus-passkey-invite";
/** Invito una tantum nella schermata Oggi. */
export function PasskeyInvite() {
  const app = useApp();
  const { list, load } = usePasskeys();
  const [hidden, setHidden] = useState(() => {
    try {
      return !!localStorage.getItem(KEY);
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  if (hidden || !passkeySupported() || list === null || list.length) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* */
    }
    setHidden(true);
  };
  return (
    <div className="mt-4 rounded-[22px] bg-surface shadow-soft p-5 flex items-center gap-4 relative">
      <Fingerprint size={24} className="text-gold shrink-0" />
      <div className="flex-1 pr-5">
        <div className="font-semibold text-[15px]">Entra con Face ID</div>
        <div className="text-[13px] text-muted">Attiva la passkey: niente più password per aprire Habitus.</div>
      </div>
      <button
        onClick={async () => {
          setBusy(true);
          if (await register(app.toast)) {
            load();
            close();
          }
          setBusy(false);
        }}
        disabled={busy}
        className="h-10 px-4 rounded-full bg-brand text-brand-fg text-[13.5px] font-semibold shrink-0 flex items-center gap-1.5"
      >
        {busy && <Loader2 size={14} className="animate-spin" />} Attiva
      </button>
      <button onClick={close} className="absolute top-2 right-2 h-7 w-7 grid place-items-center text-muted" aria-label="Chiudi">
        <X size={14} />
      </button>
    </div>
  );
}
