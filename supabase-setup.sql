-- ============================================================================
--  Anafore Guessing Game — one-time Supabase setup.
--  Paste this WHOLE file into the Supabase SQL Editor and click "Run".
--  Safe to run more than once.
-- ============================================================================

-- 1) Submissions -------------------------------------------------------------
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clues jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table submissions enable row level security;

drop policy if exists "anyone can submit" on submissions;
create policy "anyone can submit" on submissions
  for insert to anon with check (true);

drop policy if exists "anyone can read" on submissions;
create policy "anyone can read" on submissions
  for select to anon using (true);

-- 2) Photo storage -----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "anyone can upload photos" on storage.objects;
create policy "anyone can upload photos" on storage.objects
  for insert to anon with check (bucket_id = 'photos');

-- 3) Live game state (which mystery is on screen + revealed?) -----------------
create table if not exists game_state (
  id int primary key,
  submission_id text,
  revealed boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into game_state (id) values (1) on conflict (id) do nothing;
alter table game_state enable row level security;

drop policy if exists "read game state" on game_state;
create policy "read game state" on game_state
  for select to anon using (true);

drop policy if exists "insert game state" on game_state;
create policy "insert game state" on game_state
  for insert to anon with check (true);

drop policy if exists "update game state" on game_state;
create policy "update game state" on game_state
  for update to anon using (true);

-- 4) Votes (one row per phone per mystery; re-voting replaces it) -------------
create table if not exists votes (
  submission_id text not null,
  voter_id text not null,
  guess text not null,
  created_at timestamptz not null default now(),
  primary key (submission_id, voter_id)
);
alter table votes enable row level security;

drop policy if exists "read votes" on votes;
create policy "read votes" on votes
  for select to anon using (true);

drop policy if exists "cast votes" on votes;
create policy "cast votes" on votes
  for insert to anon with check (true);

drop policy if exists "change vote" on votes;
create policy "change vote" on votes
  for update to anon using (true);

-- 4b) Editable app config (questions, min answers, title, tagline) -----------
create table if not exists app_config (
  id int primary key,
  config jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into app_config (id) values (1) on conflict (id) do nothing;
alter table app_config enable row level security;

drop policy if exists "read config" on app_config;
create policy "read config" on app_config
  for select to anon using (true);

drop policy if exists "insert config" on app_config;
create policy "insert config" on app_config
  for insert to anon with check (true);

drop policy if exists "update config" on app_config;
create policy "update config" on app_config
  for update to anon using (true);

-- 5) Turn on realtime so the screen + phones update instantly ----------------
do $$
begin
  begin
    alter publication supabase_realtime add table game_state;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table votes;
  exception when duplicate_object then null;
  end;
end $$;
