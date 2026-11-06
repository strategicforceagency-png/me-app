# Habitus — lifestyle app personale

Guardaroba (armadio digitale, crea outfit, prova virtuale), Salute e Fisico (in arrivo).

- Frontend: React + Vite + Tailwind + framer-motion, pubblicato su GitHub Pages (branch `gh-pages`).
- Backend: Supabase (progetto `me-lifestyle`): auth, Postgres con RLS, storage privato, edge function `ai`.
- AI: Google Gemini (`GEMINI_API_KEY` nei secrets delle Edge Functions) per catalogazione, scontorno e virtual try-on.

## Sviluppo
```
npm i
npm run dev
npm run build   # output in dist/
```
Il codice dell'edge function è in `supabase/functions/ai/index.ts`.
