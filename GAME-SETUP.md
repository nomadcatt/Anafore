# 🎉 All-Hands Guessing Game — Setup & Hosting Guide

A web game where coworkers submit four clues (desk photo, favorite quote, favorite
album cover, window view) and everyone guesses who's who at the all-hands.

- **`/`** — landing page
- **`/submit`** — the form coworkers use to submit their clues
- **`/play`** — the game you project at the all-hands (clues + Reveal button)
- **`/admin`** — organizer-only list of everyone's answers (code-protected)

---

## 1. Run it on your computer

```bash
npm install      # first time only
npm run dev
```

Open the URL it prints (usually http://localhost:3000, or 3001 if 3000 is busy).

Out of the box it runs in **demo mode** — submissions are saved only in your own
browser, and three sample people are preloaded so `/play` works immediately. This
is perfect for trying it out. To collect real submissions from coworkers, set up
Supabase (Step 3).

---

## 2. Add your company branding

Everything brand-related lives in two files:

- **`src/lib/brand.ts`** — company name, game title, tagline, logo, and the four
  clue prompts/labels. To use a logo: drop the image in the `public/` folder and
  set `logoSrc` to e.g. `"/logo.png"`.
- **`src/app/globals.css`** — the `--brand-*` color variables at the top. Replace
  the hex codes with your official brand colors.

Save the file and the browser updates instantly.

---

## 2b. Change the questions & game structure

All the prompts live in one list — the `clues` array in **`src/lib/brand.ts`**.
Each entry is one question on the form and one clue in the game. You can add,
remove, reorder, or reword them:

```ts
clues: [
  { key: "desk",  type: "image", label: "Their desk",      emoji: "🖥️", prompt: "A photo of your desk / workspace" },
  { key: "quote", type: "text",  label: "Favorite quote",  emoji: "💬", prompt: "Your favorite quote" },
  // add your own, e.g.:
  { key: "pet",   type: "image", label: "Their pet",       emoji: "🐾", prompt: "A photo of your pet" },
]
```

- `key` — a short unique id (lowercase, no spaces).
- `type` — `"image"` for a photo upload, `"text"` for a typed answer.
- `label` / `emoji` / `prompt` — what people see.

The form, the game screen, and the admin view all update automatically. People
can already choose **any one to four** (or however many you define) to fill in.

> ⚠️ If you **change or remove `key`s after people have submitted**, old saved
> data won't line up with the new questions. Reset the submissions first (below).

## 2c. Reset / clear all submissions

Open the **`/admin`** page, unlock it with your code, and use **"Clear all
submissions"** at the bottom (Reset the game). This wipes everything so you can
start a fresh round.

- **Demo mode** (no Supabase yet): the button clears your browser's saved data
  instantly. To start with no sample people at all, set `showSampleData: false`
  in `src/lib/brand.ts`.
- **Supabase mode:** the easiest reset is from the Supabase dashboard → **SQL
  Editor** → run `truncate submissions;`. If you want the in-app button to work
  in Supabase mode too, add a delete policy once:

  ```sql
  create policy "organizer can reset"
    on submissions for delete to anon using (true);
  ```

  (Only add this if you're comfortable that anyone with the app could trigger a
  reset — fine for a casual internal game, but the dashboard `truncate` is the
  safer option.)

## 3. Set up Supabase (free — stores real submissions & photos)

You only need this to collect submissions from other people.

1. Go to **https://supabase.com** → sign up → **New project** (pick any name; save
   the database password somewhere; choose the region closest to you).
2. When it finishes setting up, open the **SQL Editor** (left sidebar) → **New
   query**, paste this, and click **Run**:

   ```sql
   -- Table to hold submissions
   create table submissions (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     clues jsonb not null default '{}',
     created_at timestamptz not null default now()
   );

   alter table submissions enable row level security;

   create policy "anyone can submit"
     on submissions for insert to anon with check (true);

   create policy "anyone can read"
     on submissions for select to anon using (true);
   ```

3. Create the photo storage:
   - Left sidebar → **Storage** → **New bucket**.
   - Name it exactly **`photos`**, toggle **Public bucket** ON, and create it.
   - Then back in the **SQL Editor**, run this so uploads are allowed:

     ```sql
     create policy "anyone can upload photos"
       on storage.objects for insert to anon
       with check (bucket_id = 'photos');
     ```

4. Get your keys: left sidebar → **Project Settings** → **API**. Copy:
   - **Project URL**
   - **anon / public** API key

5. In the project folder, copy `.env.local.example` to a new file named
   **`.env.local`** and paste your values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

   (Optional) set an organizer code for the `/admin` page:
   ```
   NEXT_PUBLIC_ADMIN_CODE=yourSecretCode
   ```

6. Stop the dev server (Ctrl+C) and run `npm run dev` again. It's now saving real
   data to Supabase. 🎉

> Note: the policies above let anyone with the link submit — fine for a friendly
> internal game. After everyone has submitted, you can delete the "anyone can
> submit" / "anyone can upload" policies in Supabase to lock it down.

---

## 3b. Enable live audience voting (optional, needs Supabase)

The game can let the audience vote on their phones, with tallies updating live on
the `/play` screen before you reveal. This needs Supabase (phones and the screen
share data through it). To preview locally without Supabase, just open `/play` in
one browser tab and `/vote` in another — they sync across tabs on the same
computer (but not across separate phones until deployed).

In the Supabase **SQL Editor**, run:

```sql
-- One shared row that tracks which mystery is on screen + if it's revealed.
create table game_state (
  id int primary key,
  submission_id text,
  revealed boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into game_state (id) values (1);
alter table game_state enable row level security;
create policy "read game state"   on game_state for select to anon using (true);
create policy "update game state"  on game_state for insert to anon with check (true);
create policy "update game state2" on game_state for update to anon using (true);

-- One row per phone per mystery (re-voting replaces the old vote).
create table votes (
  submission_id text not null,
  voter_id text not null,
  guess text not null,
  created_at timestamptz not null default now(),
  primary key (submission_id, voter_id)
);
alter table votes enable row level security;
create policy "read votes"  on votes for select to anon using (true);
create policy "cast votes"  on votes for insert to anon with check (true);
create policy "change vote" on votes for update to anon using (true);

-- Turn on realtime so the screen and phones update instantly.
alter publication supabase_realtime add table game_state, votes;
```

At the event: project `/play` (it shows a small "Scan to vote" QR), the room
scans it to reach `/vote`, picks a guess, and the bars on `/play` fill in live.
Hit **Reveal** when you're ready.

## 4. Put it online so your company can access it

We'll use **Vercel** (free, made by the creators of Next.js).

**a) Push the code to GitHub**

1. Create a free account at https://github.com and a **new empty repository**
   (e.g. `all-hands-game`). Don't add a README.
2. In the project folder:

   ```bash
   git add -A
   git commit -m "All-hands guessing game"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/all-hands-game.git
   git push -u origin main
   ```

   (`.env.local` is already gitignored, so your keys stay private.)

**b) Deploy on Vercel**

1. Go to https://vercel.com → sign up **with GitHub**.
2. **Add New → Project** → import your `all-hands-game` repo.
3. Before deploying, expand **Environment Variables** and add the same ones from
   your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_CODE` (optional)
4. Click **Deploy**. After ~1 minute you get a public URL like
   `https://all-hands-game.vercel.app`.

Every time you `git push`, Vercel redeploys automatically.

---

## 5. Run the game at the all-hands

1. **Before the event:** share the `/submit` link (e.g. in Slack) and ask everyone
   to submit. Check progress anytime at `/admin` with your code.
2. **At the event:** open the `/play` link, share your screen / project it, and go
   full screen.
   - ← → arrow keys move between people.
   - Spacebar (or the **Reveal** button) shows the answer.
3. Let the room shout out guesses, then reveal. Enjoy! 🎈
