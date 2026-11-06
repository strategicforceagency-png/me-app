import { ai, AiError, friendly, supabase, uploadImage } from "./supabase";

type Deps = {
  uid: string;
  addPending: (p: { id: string; label: string; previewUrl?: string }) => void;
  removePending: (id: string) => void;
  reload: () => Promise<void>;
  toast: (m: string) => void;
};
type Extra = { nome?: string; categoria?: string; prezzo?: string; brand?: string; source_url?: string };

let warnedNoKey = false;
let warnedCut = false;

async function runImport(d: Deps, label: string, preview: string | undefined, job: () => Promise<{ path?: string; url?: string }>, source: string, extra: Extra) {
  const id = crypto.randomUUID();
  d.addPending({ id, label, previewUrl: preview });
  let path: string | undefined;
  try {
    const src = await job();
    path = src.path;
    const r = await ai<{ ai_error?: string | null; cutout_ok?: boolean }>({ action: "import", path: src.path, url: src.url, source, extra });
    if (r.ai_error && !warnedCut) {
      warnedCut = true;
      d.toast(friendly(r.ai_error)!.slice(0, 80));
    }
  } catch (e) {
    if (e instanceof AiError && e.code === "NO_KEY") {
      // AI non configurata: salva comunque il capo senza scontorno
      if (!path && extra.source_url === undefined) {
        /* url import requires the server to fetch; nothing we can do */
      }
      if (path) {
        await supabase.from("garments").insert({
          user_id: d.uid,
          nome: extra.nome || "Nuovo capo",
          categoria: extra.categoria || "Maglie",
          image_original_path: path,
          source,
          source_url: extra.source_url ?? null,
        });
      }
      if (!warnedNoKey) {
        d.toast("Capo salvato senza AI: manca la chiave Gemini");
        warnedNoKey = true;
      }
    } else {
      d.toast((e as Error).message || "Errore durante l'import");
    }
  } finally {
    d.removePending(id);
    await d.reload();
  }
}

export function importFiles(d: Deps, files: File[], extra: Extra = {}, source = "foto") {
  return Promise.all(
    files.map((f) =>
      runImport(d, extra.nome || "Analizzo il capo…", URL.createObjectURL(f), async () => ({ path: await uploadImage("garments", d.uid, f) }), source, extra),
    ),
  );
}

export function importUrls(d: Deps, urls: string[], extra: Extra = {}, source = "web") {
  return Promise.all(urls.map((u) => runImport(d, extra.nome || "Importo dal web…", u, async () => ({ url: u }), source, extra)));
}
