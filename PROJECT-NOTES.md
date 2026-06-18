# Project Notes — Anafore All-Hands Guessing Game

> Living document. Ask Claude to "update the summary file" anytime and new
> progress gets appended to the **Session log** at the bottom.

---

## What this is
A web game for the Anafore all-hands. Coworkers submit a few personal "clues"
(photos + text answers). At the event, clues are shown one at a time on a big
screen with the name hidden; the room votes on their phones for who they think
it is, votes show live, then the host reveals — with a celebratory winner moment.

## Key facts & links
| Thing | Value |
|------|-------|
| Local project folder | `/Users/nicoleemmalow/all-hands-game` |
| GitHub repo | https://github.com/nomadcatt/Anafore |
| Live site (Vercel) | https://anafore.vercel.app |
| Supabase project URL | `https://xsebcngyjhkfjxqwjhbl.supabase.co` |
| Supabase publishable (anon) key | `sb_publishable_TztHBIygVYeb8rIZ20UM0A_VO0371yn` *(public by design)* |
| Admin page password | `reveal` (override with env `NEXT_PUBLIC_ADMIN_CODE`) |
| Brand color (primary pink) | `#FF0E8B` (hover `#D4006F`, active `#B0005C`) |

## Tech stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase** — Postgres + Storage + Realtime (submissions, votes, live game state, editable config)
- **Vercel** — hosting (auto-deploys on push to `main`)
- `qrcode.react` for QR codes

## Pages
| Route | Purpose |
|------|---------|
| `/` | Landing page (title, tagline, QR to submit, question preview, how-it-works) |
| `/submit` | Branded submission form (answer ≥2 of the questions; photos auto-resized) |
| `/play` | Presenter screen: clues + live vote bars + Reveal + winner moment. Drives the round. |
| `/vote` | Phone voting page; follows the presenter via Supabase realtime |
| `/admin` | Password-gated: review all submissions, **edit questions/settings**, reset the game |

## Key files
- `src/lib/brand.ts` — built-in **defaults**: company name, logo, colors, default questions, min answers, how-it-works.
- `src/lib/config.ts` — **editable** config (questions, min answers, title, tagline, how-it-works) stored in Supabase `app_config`; `useConfig()` hook + `getConfig`/`saveConfig`. brand.ts is the fallback/seed.
- `src/lib/supabase.ts` — Supabase client (reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `src/lib/submissions.ts` — submissions CRUD, `getCandidateNames`, `clearSubmissions` (also clears votes + resets game state). Demo fallback when Supabase unset.
- `src/lib/live.ts` — live layer: game state + votes via Supabase Realtime, with a BroadcastChannel demo fallback for same-computer multi-tab preview.
- `src/lib/image.ts` — client-side photo resize/compress before upload.
- `src/components/SettingsEditor.tsx` — the in-admin questions/settings editor.
- `src/components/SubmitQR.tsx` — reusable QR (compact + full variants).
- `supabase-setup.sql` — full one-paste DB setup (tables, RLS policies, storage bucket, realtime).
- `GAME-SETUP.md` — step-by-step Supabase + Vercel setup guide.

## Current questions (6, editable in /admin)
1. 🖥️ Desk photo · 2. ✈️ Travel photo · 3. 👗 Fashion style (text) ·
4. ✨ Newest talent/hobby (text) · 5. 💬 Favorite quote (text) · 6. 🎵 Album cover photo.
Participants must answer **at least 2**.

## How to make common changes
- **Questions / wording / how-it-works / min answers** → edit live in **`/admin` → ✏️ Questions & settings** (saves to Supabase, no redeploy). Defaults live in `brand.ts`.
- **Colors / logo / company name** → `src/lib/brand.ts` + `src/app/globals.css`, then commit/push (redeploys).
- **Reset for a new round** → `/admin` → "Clear all submissions" (needs delete policies — see below).

## Database setup state (done in Supabase)
Run via `supabase-setup.sql` / snippets:
- ✅ `submissions` table + insert/select/**delete** policies + `photos` storage bucket
- ✅ `game_state` + `votes` tables + policies + realtime publication
- ✅ `app_config` table + policies (for the in-app editor)
- ✅ delete policies on `submissions` and `votes` (so the reset button works)

---

## ⚠️ Outstanding issue (as of 2026-06-18)
**Voting doesn't work on the live site** because **anafore.vercel.app is missing
the Supabase env vars** (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Without them the live site runs in offline "demo mode" where each phone is
isolated, so votes never sync.

- Confirmed: the Supabase URL is **not** baked into the deployed JavaScript.
- Confirmed: deploys **do** reach the site (recent features + "Six clues" tagline are live), so the GitHub→Vercel pipeline works — the env vars specifically aren't in the build.
- Likely cause: vars not saved in Vercel, saved under the wrong **name**, not enabled for **Production**, or no redeploy after saving. (`NEXT_PUBLIC_` vars are baked in **at build time** — must redeploy after adding.)

### Recommended next step (not yet done)
Add the **public** Supabase URL + publishable key as **fallback constants** in
`src/lib/supabase.ts` (env vars still take precedence). The publishable/anon key
is safe to ship publicly (RLS protects the data), so this makes the live site
connect to Supabase **regardless** of Vercel env-var config — sidestepping the
recurring problem. Then voting works everywhere. (Alternative: get the two env
vars correctly saved in Vercel + redeploy without build cache.)

---

## Session log

### 2026-06-18 — Initial build session
- Scaffolded Next.js + Tailwind project; applied Anafore branding (pink `#FF0E8B`, logomark, name).
- Built submission form, presenter game (`/play`), admin review, landing page.
- Added Supabase data layer with a demo fallback; image auto-resize.
- Made clues optional (pick a subset); added a QR code (moved onto the home page).
- Changed "window view" clue → "favorite travel photo".
- Added **live audience voting** (`/vote` + realtime tallies) and a **winner moment** on reveal.
- Set up Supabase (tables, storage, RLS, realtime) and connected locally via `.env.local`.
- Pushed to GitHub (`nomadcatt/Anafore`) and deployed to Vercel (`anafore.vercel.app`).
- Updated questions to **6** (desk, travel, fashion, talent, quote, album); required **≥2 answers**; added a compact QR to the submit page header.
- Built an **in-admin editor** so questions / min-answers / title / tagline / how-it-works are editable without code (stored in Supabase `app_config`).
- Fixed the **reset button** (added delete policies; it now also clears votes + resets game state).
- **Diagnosed** the live voting problem: Vercel deployment is missing the Supabase env vars (demo mode). Forced a redeploy; still missing → env vars not reaching the build. Fix pending (see Outstanding issue above).
