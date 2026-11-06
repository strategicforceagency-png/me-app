import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Instagram – API ufficiale Meta (Instagram API con Facebook Login, Business Discovery).
 * Permette di importare i post di altri profili professionali (Creator/Business) partendo dal @nome.
 * Secrets: META_APP_ID, META_APP_SECRET
 */
const APP_URL = "https://strategicforceagency-png.github.io/me-app/";
const REDIRECT = `${Deno.env.get("SUPABASE_URL")}/functions/v1/instagram/callback`;
const V = "v23.0";
const GRAPH = `https://graph.facebook.com/${V}`;
const SCOPES = "instagram_basic,pages_show_list,business_management,pages_read_engagement";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const env = (k: string) => {
  const v = Deno.env.get(k)?.trim();
  if (!v) throw new Error(`${k} mancante nei secrets di Supabase`);
  return v;
};

async function userFrom(req: Request) {
  const tok = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!tok) return null;
  const { data } = await admin().auth.getUser(tok);
  return data.user ?? null;
}

async function graph(path: string, params: Record<string, string>) {
  const u = new URL(path.startsWith("http") ? path : GRAPH + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error || {};
    throw Object.assign(new Error(e.error_user_msg || e.message || `Errore Meta ${r.status}`), { code: e.code, sub: e.error_subcode });
  }
  return j;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const db = admin();
  const back = (r: string) => Response.redirect(`${APP_URL}?instagram=${encodeURIComponent(r)}`, 302);
  try {
    switch (route) {
      case "start": {
        const user = await userFrom(req);
        if (!user) return json({ error: "Non autenticato" }, 401);
        const state = crypto.randomUUID().replace(/-/g, "");
        await db.from("instagram_oauth_states").insert({ state, user_id: user.id });
        const u = new URL(`https://www.facebook.com/${V}/dialog/oauth`);
        u.searchParams.set("client_id", env("META_APP_ID"));
        u.searchParams.set("redirect_uri", REDIRECT);
        u.searchParams.set("state", state);
        u.searchParams.set("scope", SCOPES);
        u.searchParams.set("response_type", "code");
        return json({ url: u.toString() });
      }

      case "callback": {
        const q = new URL(req.url).searchParams;
        if (q.get("error")) return back("annullato");
        const { data: st } = await db.from("instagram_oauth_states").select("*").eq("state", q.get("state") || "").maybeSingle();
        if (!st) return back("errore-stato");
        await db.from("instagram_oauth_states").delete().eq("state", st.state);
        const short = await graph("/oauth/access_token", {
          client_id: env("META_APP_ID"),
          client_secret: env("META_APP_SECRET"),
          redirect_uri: REDIRECT,
          code: q.get("code") || "",
        });
        // token di lunga durata (~60 giorni)
        const long = await graph("/oauth/access_token", {
          grant_type: "fb_exchange_token",
          client_id: env("META_APP_ID"),
          client_secret: env("META_APP_SECRET"),
          fb_exchange_token: short.access_token,
        });
        const token = long.access_token || short.access_token;
        const pages = await graph("/me/accounts", { fields: "name,instagram_business_account{id,username}", access_token: token, limit: "50" });
        // deno-lint-ignore no-explicit-any
        const page = (pages.data || []).find((p: any) => p.instagram_business_account);
        if (!page) return back("nessun-account-professionale");
        await db.from("instagram_connections").upsert({
          user_id: st.user_id,
          access_token: token,
          expires_at: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null,
          ig_user_id: page.instagram_business_account.id,
          ig_username: page.instagram_business_account.username,
          connected_at: new Date().toISOString(),
        });
        return back("ok");
      }

      case "discover": {
        // body: { username, limit? } → importa gli ultimi post del profilo e crea l'ispirazione
        const user = await userFrom(req);
        if (!user) return json({ error: "Non autenticato" }, 401);
        const { data: c } = await db.from("instagram_connections").select("*").eq("user_id", user.id).maybeSingle();
        if (!c) return json({ error: "Instagram non collegato", code: "NOT_CONNECTED" }, 400);
        const b = await req.json().catch(() => ({}));
        const handle = String(b.username || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/[/?].*$/, "").toLowerCase();
        if (!/^[a-z0-9._]{1,30}$/.test(handle)) return json({ error: "Nome profilo non valido" }, 400);
        const limit = Math.min(Math.max(Number(b.limit) || 12, 3), 14);
        let bd;
        try {
          bd = await graph(`/${c.ig_user_id}`, {
            fields: `business_discovery.username(${handle}){username,name,biography,followers_count,media_count,media.limit(${limit * 2}){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}}}`,
            access_token: c.access_token,
          });
        } catch (e) {
          const err = e as Error & { code?: number };
          if (err.code === 190) return json({ error: "Collegamento Instagram scaduto: ricollega l'account", code: "EXPIRED" }, 400);
          if (err.code === 110 || /business|cannot be found|does not exist|Invalid user/i.test(err.message))
            return json({ error: `@${handle} non è un profilo professionale (Creator/Business) o non esiste: usa screenshot o video`, code: "NOT_BUSINESS" }, 400);
          throw err;
        }
        const prof = bd.business_discovery;
        // un'immagine per post (prima del carosello, copertina per i video)
        const urls: { url: string; caption: string }[] = [];
        for (const m of prof.media?.data || []) {
          let u: string | undefined;
          if (m.media_type === "IMAGE") u = m.media_url;
          else if (m.media_type === "VIDEO") u = m.thumbnail_url;
          else if (m.media_type === "CAROUSEL_ALBUM") {
            const first = m.children?.data?.[0];
            u = first?.media_type === "VIDEO" ? first?.thumbnail_url : first?.media_url || m.media_url;
          }
          if (u) urls.push({ url: u, caption: (m.caption || "").slice(0, 200) });
          if (urls.length >= limit) break;
        }
        if (!urls.length) return json({ error: `Nessun post leggibile per @${handle}` }, 400);
        const paths: string[] = [];
        await Promise.all(
          urls.map(async ({ url }, i) => {
            const r = await fetch(url);
            if (!r.ok) return;
            const type = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
            const path = `${user.id}/ig-${handle}-${i}-${crypto.randomUUID().slice(0, 8)}.jpg`;
            const { error } = await db.storage.from("inspirations").upload(path, await r.arrayBuffer(), { contentType: type });
            if (!error) paths[i] = path;
          }),
        );
        const clean = paths.filter(Boolean);
        if (!clean.length) return json({ error: "Download delle immagini non riuscito, riprova" }, 500);
        const { data: insp, error } = await db
          .from("inspirations")
          .insert({ user_id: user.id, kind: "instagram", handle: prof.username || handle, title: prof.name || null, image_paths: clean, status: "analisi" })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return json({ id: insp.id, username: prof.username, name: prof.name, followers: prof.followers_count, images: clean.length });
      }

      case "disconnect": {
        const user = await userFrom(req);
        if (!user) return json({ error: "Non autenticato" }, 401);
        await db.from("instagram_connections").delete().eq("user_id", user.id);
        return json({ ok: true });
      }

      default:
        return json({ error: "Percorso sconosciuto" }, 404);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (route === "callback") return back("errore: " + msg.slice(0, 140));
    return json({ error: msg }, 500);
  }
});

