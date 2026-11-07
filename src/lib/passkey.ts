import { supabase } from "./supabase";

export const passkeySupported = () => typeof window !== "undefined" && !!window.PublicKeyCredential;

/** Traduce gli errori delle passkey in italiano; null = annullato dall'utente (nessun messaggio). */
export function passkeyError(e: unknown): string | null {
  const err = e as { code?: string; message?: string; name?: string };
  const code = err?.code || "";
  const msg = err?.message || String(e);
  if (err?.name === "NotAllowedError" || /cancel|abort|not allowed|timed out/i.test(msg) || code === "ERROR_CEREMONY_ABORTED") return null;
  if (code === "passkey_disabled" || /passkey.*disabled|not enabled/i.test(msg)) return "Le passkey non sono ancora attive su Supabase (Authentication → Passkeys).";
  if (code === "webauthn_credential_not_found") return "Questa passkey non è registrata su Habitus. Accedi con la password e attivala dal profilo.";
  if (code === "webauthn_credential_exists") return "Questo dispositivo ha già una passkey per Habitus.";
  if (code === "webauthn_challenge_expired") return "Tempo scaduto, riprova.";
  if (code === "too_many_passkeys") return "Hai raggiunto il numero massimo di passkey.";
  return msg;
}

export async function signInPasskey() {
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) throw error;
}
