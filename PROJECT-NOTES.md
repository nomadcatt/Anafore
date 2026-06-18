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
| Local dev URL | **http://localhost:3001** (`npm run dev -- -p 3001`) — port 3000 is Nicole's *other* project (Dossier Desk), so always run this game on **3001** to avoid confusion |
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

## ✅ Resolved — voting now works on phones (2026-06-18)
The "demo mode" voting problem is **fixed**. Added the **public** Supabase URL +
publishable (anon) key as **fallback constants** in `src/lib/supabase.ts` (env
vars still take precedence). The live site now connects to Supabase regardless
of Vercel's env-var config, so phones can vote together. Confirmed working on
phones.

## ⚠️ Outstanding issue (as of 2026-06-18)
**The presenter `/play` screen isn't updating the live vote tally in real time.**
Phones can vote fine, but the bars on `/play` don't move as votes come in.
- Suspected area: the Supabase Realtime subscription in `onVotes()` in
  `src/lib/live.ts` (the `postgres_changes` channel filtered by
  `submission_id`). Likely the `votes` table isn't in the Realtime publication,
  or the filtered subscription isn't firing → `refetch()` never runs.
- Not yet diagnosed/fixed. Next step: check that `votes` (and `game_state`) are
  added to the `supabase_realtime` publication in Supabase, and that the channel
  subscribe status is `SUBSCRIBED`.

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

### 2026-06-18 — Voting fix + home-page layout
- **Fixed live voting:** added public Supabase URL + publishable key as fallback constants in `src/lib/supabase.ts` (env vars still win). Pushed → deployed. **Confirmed voting now works on phones.**
- **Home page redesign:** moved the QR code to the **side of the game title** (compact variant, "📱 Scan to submit") so it takes less vertical space; moved the **How it works** group up into the space directly below the title; clue grid follows.
- Noted local dev convention: run this game on **port 3001** (`npm run dev -- -p 3001`); port 3000 is Nicole's other project (Dossier Desk).
- **New open issue:** the `/play` presenter screen isn't updating the live vote tally in real time (see Outstanding issue) — likely a Supabase Realtime publication / subscription issue in `live.ts`.
