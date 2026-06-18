import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These come from your Supabase project (Settings → API) and live in
// `.env.local` (see `.env.local.example`). If they're missing, the app
// automatically runs in local "demo mode" using your browser's storage.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      // This game has no user logins, so skip auth session storage. Avoids the
      // "Multiple GoTrueClient instances" console warning.
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Name of the Storage bucket that holds uploaded photos.
export const PHOTO_BUCKET = "photos";
// Name of the database table that holds submissions.
export const SUBMISSIONS_TABLE = "submissions";
// Live-voting tables (used by the realtime guessing game).
export const GAME_STATE_TABLE = "game_state";
export const VOTES_TABLE = "votes";
// Single fixed row id for the shared game state.
export const GAME_STATE_ID = 1;
