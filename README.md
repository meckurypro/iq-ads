# IQ Ads Site

React + TypeScript + Vite. Deploys on Vercel. Database is the shared
Meckury AI Supabase project.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

## Connecting Vercel to the database

The feed and (later) admin dashboard read from Supabase via
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Vite only exposes
env vars at build time, so they must be set in Vercel, not just
locally:

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the values from the Meckury AI Supabase project (Project Settings → API)
3. Apply them to **Production**, **Preview**, and **Development**
4. Redeploy (env var changes don't apply to already-built deployments)

## Assets in `/public`

- `public/logo.png` — real logo, used in the nav
- `public/favicon.png`, `public/apple-touch-icon.png` — generated from the logo
- `public/og-image.jpg` — **still needed**, social share preview image
- `public/hero/reel.mp4` + `public/hero/reel-poster.jpg` — **still needed**, the hero video and its poster frame

Portfolio media is no longer a local placeholder set — it's fetched
live from Supabase (see below), so portfolio video/image files just
need to be uploaded wherever the admin dashboard stores them (e.g.
Supabase Storage), not dropped into this repo.

## Still to wire up

The feed (`src/lib/usePortfolio.ts`) already queries Supabase — it
currently assumes a table named `iq_ads_portfolio` with snake_case
columns (`media_url`, `media_type`, `poster_url`, `created_at`, etc.)
matching `src/types/portfolio.ts`. **This is a flagged assumption,
not a confirmed schema** — once you share the real Meckury AI schema:

1. Confirm/adjust the table name and column mapping in `usePortfolio.ts`
2. Add RLS policies on that table (read: public; write: admins only)
3. Add Supabase Auth check against the existing admin role/table — no separate signup, any Meckury AI admin can log in here
4. Build out `src/pages/AdminPlaceholder.tsx` into the real dashboard (login, create/edit portfolio entries)
5. Wire `ContactForm.tsx` to a `iq_ads_leads` table or serverless function instead of the current console.log placeholder

## Design tokens

Colors, type, spacing, and motion timing all live in `src/styles/tokens.css`.
