# IQ Ads Site

React + TypeScript + Vite. Deploys on Vercel. Database is the shared
Meckury AI Supabase project.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

## Assets to drop into `/public` before launch

Replace these placeholders with your real generated assets:

- `public/logo.svg` — replace with the real logo mark
- `public/favicon.png` — add this (referenced in index.html)
- `public/og-image.jpg` — social share preview image
- `public/hero/reel.mp4` + `public/hero/reel-poster.jpg` — the hero video and its poster frame
- `public/portfolio/sample-*.mp4` + matching poster jpgs — portfolio feed media (or wire the feed to Supabase and drop this local set entirely)

## Still to wire up

Once you share the Meckury AI schema:

1. Add the `iq_ads_portfolio` table + RLS policies (read: public; write: admins only)
2. Add Supabase Auth check against the existing admin role/table — no separate signup, any Meckury AI admin can log in here
3. Replace `src/lib/placeholderPortfolio.ts` usage in `Feed.tsx` with a live Supabase query
4. Build out `src/pages/AdminPlaceholder.tsx` into the real dashboard (login, create/edit portfolio entries)
5. Wire `ContactForm.tsx` to a `iq_ads_leads` table or serverless function instead of the current console.log placeholder

## Design tokens

Colors, type, spacing, and motion timing all live in `src/styles/tokens.css`.
