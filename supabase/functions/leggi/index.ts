import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/** Habitus – la voce di Alfred: legge un testo con la stessa voce maschile delle chiamate (Gemini TTS). */
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GEM = "https://generativelanguage.googleapis.com/v1beta";
const VOCI = ["Charon", "Orus", "Algenib", "Iapetus", "Schedar", "Enceladus"];
let lista: string[] | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autenticato" }, 401);
    const b = await req.json();
    const testo = String(b.testo || "").replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^[-*]\s+/gm, "").replace(/#+\s/g, "").trim().slice(0, 2500);
    if (!testo) return json({ error: "Niente da leggere" }, 400);
    const { data: p } = await sb.from("profiles").select("alfred_voce").eq("id", user.id).maybeSingle();
    const voce = VOCI.includes(p?.alfred_voce || "") ? p!.alfred_voce! : "Charon";
    const key = Deno.env.get("GEMINI_API_KEY")!.trim();
    if (!lista) {
      const j = await (await fetch(`${GEM}/models?key=${key}&pageSize=1000`)).json();
      const n: string[] = (j.models || []).map((m: { name: string }) => m.name.replace("models/", "")).filter((x: string) => /tts/.test(x));
      const v = (x: string) => parseFloat(x.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || "0");
      lista = [...n.filter((x) => /flash-tts$/.test(x)).sort((a, c) => v(c) - v(a)), ...n.filter((x) => /flash-lite-tts$/.test(x)), ...n.filter((x) => /flash.*tts/.test(x) && !/(flash-tts|flash-lite-tts)$/.test(x))].slice(0, 4);
    }
    let last = "Voce non disponibile";
    for (const m of lista) {
      const r = await fetch(`${GEM}/models/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(40000),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `Leggi in italiano, con la voce pacata, calda e misurata di un anziano maggiordomo inglese, a ritmo tranquillo:\n\n${testo}` }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voce } } } },
        }),
      }).catch(() => null);
      if (!r) continue;
      const j = await r.json().catch(() => ({}));
      const d = j.candidates?.[0]?.content?.parts?.find((x: { inlineData?: unknown }) => x.inlineData)?.inlineData;
      if (r.ok && d?.data) return json({ mime: d.mimeType || "audio/wav", data: d.data });
      last = j?.error?.message || `Errore ${r.status}`;
    }
    return json({ error: last }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
