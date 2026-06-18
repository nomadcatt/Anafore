import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These come from your Supabase project (Settings → API) and normally live in
// `.env.local` (see `.env.local.example`). We also ship them as public
// fallbacks below so the deployed site connects to Supabase even if the Vercel
// env vars aren't set — env vars still take precedence when present.
//
// The publishable (anon) key is safe to expose publicly: it only allows what
// the database's Row Level Security policies permit. Do NOT put the service
// role / secret key here.
const FALLBACK_SUPABASE_URL = "https://xsebcngyjhkfjxqwjhbl.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_TztHBIygVYeb8rIZ20UM0A_VO0371yn";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

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
export const CONFIG_TABLE = "app_config";
export const CONFIG_ID = 1;
// Single fixed row id for the shared game state.
export const GAME_STATE_ID = 1;
