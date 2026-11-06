import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export const SUPABASE_URL = "https://zoyjsvkwetecbmgzcecq.supabase.co";
export const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveWpzdmt3ZXRlY2JtZ3pjZWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5Nzk1MDAsImV4cCI6MjEwOTU1NTUwMH0.mSuFGdHoULR1Per5ioSRScowXbXcGESyXWAeRzWEGxQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const CATEGORIE = [
  "Felpe e Maglioni",
  "Maglie",
  "Camicie",
  "Canotte",
  "Pantaloni",
  "Giacche e Cappotti",
  "Scarpe",
  "Accessori",
] as const;

export const STILI = ["Weekend", "Lavoro", "Serata", "Sport", "Cerimonia", "Viaggio"];

export type Slot = "top" | "bottom" | "scarpe";
export const SLOT_OF: Record<string, Slot | null> = {
  "Felpe e Maglioni": "top",
  Maglie: "top",
  Camicie: "top",
  Canotte: "top",
  "Giacche e Cappotti": "top",
  Pantaloni: "bottom",
  Scarpe: "scarpe",
  Accessori: null,
};
export const SLOT_LABEL: Record<Slot, string> = { top: "Sopra", bottom: "Sotto", scarpe: "Scarpe" };

export type Garment = {
  id: string;
  nome: string;
  categoria: string;
  colore: string | null;
  stagione: string | null;
  formalita: string | null;
  brand: string | null;
  taglia: string | null;
  prezzo: string | null;
  image_original_path: string | null;
  image_cutout_path: string | null;
  source: string | null;
  source_url: string | null;
  note: string | null;
  created_at: string;
};
export type Profile = {
  id: string;
  nome: string | null;
  avatar_mode: "foto" | "manichino";
  avatar_photo_path: string | null;
  altezza: number;
  peso: number;
  spalle: number;
  petto: number;
  vita: number;
  fianchi: number;
  forma_corpo: number;
  taglia_top: string | null;
  taglia_pantaloni: string | null;
  taglia_scarpe: string | null;
};
export type OutfitItem = { garment_id: string; slot: Slot; layer: number };
export type Outfit = {
  id: string;
  nome: string;
  stile: string | null;
  preferito: boolean;
  preview_path: string | null;
  created_at: string;
  outfit_items: OutfitItem[];
};

/* ---------- signed URLs with cache ---------- */
const urlCache = new Map<string, { url: string; exp: number }>();
const key = (b: string, p: string) => `${b}/${p}`;

export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const k = key(bucket, path);
  const c = urlCache.get(k);
  if (c && c.exp > Date.now()) return c.url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  if (!data?.signedUrl) return null;
  urlCache.set(k, { url: data.signedUrl, exp: Date.now() + 1000 * 60 * 60 * 5 });
  return data.signedUrl;
}
export async function prefetchUrls(bucket: string, paths: string[]) {
  const missing = paths.filter((p) => p && !(urlCache.get(key(bucket, p))?.exp! > Date.now()));
  if (!missing.length) return;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(missing, 60 * 60 * 6);
  data?.forEach((d) => {
    if (d.signedUrl && d.path) urlCache.set(key(bucket, d.path), { url: d.signedUrl, exp: Date.now() + 1000 * 60 * 60 * 5 });
  });
}
export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const cached = path ? urlCache.get(key(bucket, path)) : undefined;
  const [url, setUrl] = useState<string | null>(cached && cached.exp > Date.now() ? cached.url : null);
  useEffect(() => {
    let alive = true;
    if (!path) return setUrl(null);
    signedUrl(bucket, path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [bucket, path]);
  return url;
}
export const garmentPath = (g: Garment) => g.image_cutout_path || g.image_original_path;

/* ---------- edge function ---------- */
export class AiError extends Error {
  code?: string;
  constructor(msg: string, code?: string) {
    super(msg);
    this.code = code;
  }
}
export async function ai<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data: s } = await supabase.auth.getSession();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${s.session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new AiError(friendly(j.error) || `Errore ${r.status}`, j.code);
  return j as T;
}
export function friendly(msg?: string | null) {
  if (!msg) return msg;
  if (/quota|billing|rate-limit/i.test(msg)) return "Funzione immagini AI non attiva: abilita la fatturazione su Google AI Studio";
  if (/demand|overloaded|unavailable/i.test(msg)) return "AI momentaneamente occupata, riprova tra poco";
  return msg;
}

/* ---------- image helpers ---------- */
export async function resizeImage(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob((b) => res(b || file), "image/jpeg", 0.88));
}
export async function uploadImage(bucket: string, uid: string, file: File, prefix = "orig") {
  const blob = await resizeImage(file);
  const path = `${uid}/${prefix}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

/* ---------- white background → transparent (flood fill from edges) ---------- */
const alphaCache = new Map<string, Promise<string>>();
export function transparentUrl(cacheKey: string, url: string): Promise<string> {
  if (!alphaCache.has(cacheKey)) alphaCache.set(cacheKey, makeTransparent(url).catch(() => url));
  return alphaCache.get(cacheKey)!;
}
async function makeTransparent(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const isBg = (i: number) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > 222 && mx - mn < 22;
  };
  // only apply if the border is mostly white
  let border = 0, white = 0;
  for (let x = 0; x < w; x += 4) for (const y of [0, h - 1]) { border++; if (isBg((y * w + x) * 4)) white++; }
  if (white / border < 0.6) return url;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!isBg(i)) continue;
    d[i + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  // soften 1px edge
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (d[i + 3] === 0) continue;
    const x = p % w, y = (p / w) | 0;
    const n = [p - 1, p + 1, p - w, p + w].filter((q) => q >= 0 && q < w * h && (q % w !== 0 || x !== w - 1));
    if (n.some((q) => d[q * 4 + 3] === 0) && y > 0 && y < h - 1) d[i + 3] = 150;
  }
  ctx.putImageData(img, 0, 0);
  const out: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
  return URL.createObjectURL(out);
}
