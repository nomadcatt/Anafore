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
- `src/lib/live.ts` — live layer: game state (incl. `finished` finale flag) + votes (incl. `voter_name`) via Supabase Realtime, with a BroadcastChannel demo fallback for same-computer multi-tab preview. Also `getVoterName`/`setVoterName` and `getAllVotes`.
- `src/lib/results.ts` — pure `computeResults(submissions, votes)` → end-of-game leaderboard (top guessers, with ranks/ties) + room stats (overall accuracy, easiest/trickiest mystery). Used by both `/play` and `/vote` at the finale.
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
- **Questions / wording / how-it-works / min answers / company name / submit-page heading + intro** → edit live in **`/admin` → ✏️ Questions & settings** (saves to Supabase, no redeploy). Defaults live in `brand.ts`.
- **Colors / logo / header wordmark / footer / tab title** → `src/lib/brand.ts` + `src/app/globals.css`, then commit/push (redeploys). (The home/`/vote` "___ all-hands" eyebrow uses the editable company name; the logo wordmark + footer + tab title still read from `brand.ts`.)
- **Reset for a new round** → `/admin` → "Reset the game": **Clear all votes** (replay same submissions) or **Clear all submissions** (people resubmit). Both need delete policies — see below.

## Database setup state (done in Supabase)
Run via `supabase-setup.sql` / snippets:
- ✅ `submissions` table + insert/select/**delete** policies + `photos` storage bucket
- ✅ `game_state` + `votes` tables + policies + realtime publication
- ✅ `app_config` table + policies (for the in-app editor)
- ✅ delete policies on `submissions` and `votes` (so the reset button works)

---

## ✅ Resolved (2026-06-18)
- **Voting works on phones.** Added the **public** Supabase URL + publishable
  (anon) key as **fallback constants** in `src/lib/supabase.ts` (env vars still
  take precedence), so the live site connects to Supabase regardless of Vercel's
  env-var config. Confirmed working.
- **Live tally on `/play` updates in real time.** The earlier realtime-sync
  issue is fixed — vote bars now move as votes come in. Confirmed working.

**No known outstanding issues.**

---

## ✅ Resolved (2026-06-23)
- **Winners finale shipped & migration run.** The two columns (`votes.voter_name`,
  `game_state.finished`) were added in Supabase; the finale was tested live and
  works. No outstanding DB actions.
- **Game-day safeguards** (submissions lock + duplicate-name warning) pushed on
  branch `game-day-safeguards` — **no migration needed**; merge to `main` to ship.

## ⚠️ Action needed — edit-submissions migration (2026-06-23)
- The **edit-your-submission** feature needs an **UPDATE policy** on the
  `submissions` table (it currently only allows insert/select/delete). Until it's
  run, saving an edit shows a clear error. Run once in the Supabase SQL editor
  (also in `supabase-setup.sql`, idempotent):
  ```sql
  drop policy if exists "edit submissions" on submissions;
  create policy "edit submissions" on submissions
    for update to anon using (true) with check (true);
  ```

## 🗓️ Running the game (day-of checklist)
1. Collect everyone's submissions (share `/submit`).
2. In `/admin` (code `reveal`): fix any **⚠️ duplicate names**, then click
   **Close submissions** to lock the player list.
3. Open `/play` on the big screen (open it a few min early to warm it up).
4. Share `/vote`; players enter their name, then guess each mystery.
5. Reveal each mystery → on the last one, hit **🏆 Finish & show winners**.
6. To replay: `/admin` → **Clear all votes** (same people) or **Clear all
   submissions** (start over).

## 💡 Backlog / ideas (not built yet)
- **This repo is becoming "Anafore All Hands Games"** — a hub of activities.
  Game 1: **Guess Who** (built, live). Game 2: **The A4 Awards** (designing).
- **The A4 Awards** (Anafore All Hands Afterparty Awards) → design doc in
  **`A4-AWARDS.md`**. 🎨 Designing now, needed ~July 2026. Peer-voted superlative
  awards for the "afterparty"; values carried subtly by playful category names.
- **More all-hands games** → see **`GAME-IDEAS.md`** for the full brainstormed
  menu (peer-recognition + value-themed games).
- **Multiple saved games / events** (requested 2026-06-23): keep past games and
  switch between them via a sidebar/tabs. Needs a "game/event" concept threaded
  through `submissions`, `votes`, `game_state`, and `app_config` (today there's
  exactly **one** of each — a single global game). See discussion in chat;
  moderate refactor. Decide: fully independent games (own questions + people +
  leaderboard) vs. shared questions; archive old games read-only?

---

## Session log

### 2026-06-23 — Edit your submission (needs DB migration)
- **People can now edit an entry they already submitted.** On `/submit`, a return
  visit on the **same device** auto-loads their entry into an "✏️ Editing your
  entry" form (prefilled name + clues; saved photos shown, reused unless
  replaced) with a **Save changes** button and a "Start a new entry instead"
  escape hatch. From a **different device**, an "Already submitted? Edit your
  entry" link looks the entry up **by name** (exact, case-insensitive; if 2+
  share a name it defers to the organizer).
- **How identity works (no logins):** on submit we store the new submission id in
  the browser (`ahg.mySubmissionId`); the name-lookup fallback re-remembers it on
  that device. Chose "remember on device + name fallback" over admin-only.
- **Editing is intentionally blocked while submissions are closed** (the 🔒
  screen covers edits too), so clues can't change mid-game. Easy to relax later.
- Code: `updateSubmission`/`getSubmission`/`findSubmissionsByName` + device-id
  helpers in `submissions.ts` (`addSubmission` now returns the new id); edit mode
  in `src/app/submit/page.tsx`; new `"edit submissions"` UPDATE policy in
  `supabase-setup.sql`.
- **DB migration required** — see "Action needed" above. Verified: `tsc --noEmit`
  clean, `next build` succeeds.

### 2026-06-23 — Game-day safeguards (no DB migration)
- **"Submissions open/closed" toggle in `/admin`.** New `submissionsOpen` flag on
  `AppConfig` (lives in the existing `app_config` JSON — no schema change). When
  closed, `/submit` shows a "Submissions are closed 🔒" screen and the submit
  handler refuses to post. Toggle saves instantly. Use it to **lock the player
  list before starting the game** (late submissions otherwise desync `/play` and
  `/vote`, which load their lists once on mount).
- **Duplicate-name warning in `/admin`.** Detects names shared by 2+ submissions
  (case-insensitive): an amber banner up top + a "⚠️ duplicate name" badge on each
  affected card. Duplicates are ambiguous to guess and skew the scoreboard, so the
  organizer can rename (e.g. add a last initial) before play.
- Verified: `tsc --noEmit` clean, `next build` succeeds. No Supabase changes.

### 2026-06-23 — Winners finale (end-of-game page)
- **New end-of-game winner page.** After the last mystery is revealed, `/play`
  shows a **🏆 Finish & show winners** button that ends the game and displays a
  finale: a **top-guessers leaderboard** (medals, tie-aware ranks) + **room
  stats** (overall accuracy, easiest-to-spot, trickiest mystery). A "Back to the
  game" button returns to the round.
- **Phones follow into the finale.** Added a `finished` flag to the shared
  `game_state`; when the host finishes, every `/vote` phone switches to a
  personal results screen ("You got X/Y right — you placed #N").
- **Voters now enter a name** (one-time gate on `/vote`, stored per device) so
  the leaderboard can crown real winners by name. Votes carry `voter_name`.
- New `src/lib/results.ts` (`computeResults`); `getAllVotes` + name helpers in
  `live.ts`; resets and `clearSubmissions` also clear the `finished` flag.
- **DB migration required** — see "Action needed" above. `supabase-setup.sql`
  updated (idempotent `add column if not exists` for both new columns).
- Verified: `tsc --noEmit` clean, `next build` succeeds.

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

### 2026-06-18 — Live tally fix, UX polish, editable text, resets, correctness
- **Fixed the live `/play` tally** — votes now update on the presenter screen in real time (realtime sync resolved). Confirmed working.
- **Home page:** framed the clue grid as a labeled **"Preview" → "The prompts you'll answer"** section (numbered cards, emoji chips, Submit CTA); later removed the explanatory subtext under that heading per request.
- **Submit form simplified:** removed the per-clue **"Include" checkbox**. A prompt now counts as soon as it has content; the Submit button **auto-unlocks at `minAnswers`**. Each card shows **"Optional" / "✓ Answered"**; intro copy encourages filling in as many as you like (blanks are skipped).
- **More editable text in `/admin`:** added **company name** (the "Anafore" word in "___ all-hands" on home + `/vote`), **submit-page heading**, and **submit-page intro** to `AppConfig` (defaults in `brand.ts`, edited via `SettingsEditor`). Note: header logo wordmark + footer + tab title still come from `brand.ts`.
- **Two reset options in `/admin` "Reset the game":** (1) **Clear all votes** — `clearVotes()` in `live.ts` wipes votes + resets game state to replay with the **same submissions**; (2) **Clear all submissions** — existing `clearSubmissions()` so people resubmit. (An earlier "factory reset" idea was removed in favor of these two.)
- **Correctness on phones:** on reveal, each phone fetches the answer (`getSubmissionName()`) and shows a **🎉 correct / 😅 wrong / 👀 didn't-vote** moment instead of just the pick. Answer is only fetched after reveal, so it stays secret.
