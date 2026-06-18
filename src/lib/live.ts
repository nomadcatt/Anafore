// ─────────────────────────────────────────────────────────────────────────────
// LIVE LAYER — keeps the presenter screen (/play) and voters' phones (/vote)
// in sync, and tallies votes in real time.
//
// Two backends behind one API:
//  • Supabase mode  → real cross-device sync via Supabase Realtime. This is
//    what you use at the event once deployed.
//  • Demo mode      → a BroadcastChannel that syncs across browser tabs on the
//    SAME computer, so you can preview the whole flow locally (open /play in one
//    tab and /vote in another). It does NOT sync across separate phones.
// ─────────────────────────────────────────────────────────────────────────────

import {
  isSupabaseConfigured,
  supabase,
  GAME_STATE_TABLE,
  GAME_STATE_ID,
  VOTES_TABLE,
} from "./supabase";

export type GameState = {
  /** The submission everyone is currently guessing (null = not started). */
  submissionId: string | null;
  /** Whether the answer has been revealed. */
  revealed: boolean;
};

export type Tally = Record<string, number>; // guessed name -> vote count

const DEFAULT_STATE: GameState = { submissionId: null, revealed: false };

// ─── A stable per-device voter id (so one phone = one vote per round) ────────
export function getVoterId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "ahg.voterId";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

// ════════════════════════════════════════════════════════════════════════════
// DEMO BACKEND (BroadcastChannel + localStorage)
// ════════════════════════════════════════════════════════════════════════════

const CH_NAME = "ahg-live";
const STATE_KEY = "ahg.gameState";
const VOTES_KEY = "ahg.votes";

type DemoVote = { submissionId: string; guess: string; voterId: string };

// A new channel per subscriber (closed on cleanup).
function demoChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return null;
  return new BroadcastChannel(CH_NAME);
}

// A single reused channel for posting, so we don't leak one per update.
let _postCh: BroadcastChannel | null = null;
function postChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return null;
  if (!_postCh) _postCh = new BroadcastChannel(CH_NAME);
  return _postCh;
}

function readDemoState(): GameState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const raw = window.localStorage.getItem(STATE_KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return DEFAULT_STATE;
  }
}

function readDemoVotes(): DemoVote[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(VOTES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DemoVote[];
  } catch {
    return [];
  }
}

function tallyFor(votes: DemoVote[], submissionId: string): Tally {
  const t: Tally = {};
  for (const v of votes) {
    if (v.submissionId === submissionId) t[v.guess] = (t[v.guess] ?? 0) + 1;
  }
  return t;
}

// ════════════════════════════════════════════════════════════════════════════
// UNIFIED API
// ════════════════════════════════════════════════════════════════════════════

/** Presenter: set what everyone is guessing and whether it's revealed. */
export async function setGameState(state: GameState): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
    postChannel()?.postMessage({ type: "state", state });
    return;
  }
  const { error } = await supabase.from(GAME_STATE_TABLE).upsert({
    id: GAME_STATE_ID,
    submission_id: state.submissionId,
    revealed: state.revealed,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not update game state: ${error.message}`);
}

/** Subscribe to game-state changes. Returns an unsubscribe function. */
export function onGameState(cb: (s: GameState) => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    cb(readDemoState());
    const ch = demoChannel();
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "state") cb(e.data.state as GameState);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY) cb(readDemoState());
    };
    ch?.addEventListener("message", onMsg);
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }

  // Supabase: fetch current, then listen for changes.
  const sb = supabase;
  sb.from(GAME_STATE_TABLE)
    .select("submission_id, revealed")
    .eq("id", GAME_STATE_ID)
    .maybeSingle()
    .then(({ data }) => {
      if (data)
        cb({
          submissionId: (data.submission_id as string) ?? null,
          revealed: Boolean(data.revealed),
        });
    });

  const channel = sb
    .channel("game_state_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: GAME_STATE_TABLE },
      (payload) => {
        const row = payload.new as {
          submission_id: string | null;
          revealed: boolean;
        };
        cb({
          submissionId: row.submission_id ?? null,
          revealed: Boolean(row.revealed),
        });
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

/** Voter: cast (or change) this device's vote for the current mystery. */
export async function castVote(
  submissionId: string,
  guess: string,
  voterId: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    if (typeof window === "undefined") return;
    const votes = readDemoVotes().filter(
      (v) => !(v.submissionId === submissionId && v.voterId === voterId)
    );
    votes.push({ submissionId, guess, voterId });
    window.localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    postChannel()?.postMessage({ type: "vote", submissionId });
    return;
  }
  const { error } = await supabase
    .from(VOTES_TABLE)
    .upsert(
      { submission_id: submissionId, guess, voter_id: voterId },
      { onConflict: "submission_id,voter_id" }
    );
  if (error) throw new Error(`Could not record vote: ${error.message}`);
}

/** Subscribe to the live vote tally for one mystery. Returns unsubscribe. */
export function onVotes(
  submissionId: string,
  cb: (tally: Tally) => void
): () => void {
  if (!submissionId) return () => {};

  if (!isSupabaseConfigured || !supabase) {
    const emit = () => cb(tallyFor(readDemoVotes(), submissionId));
    emit();
    const ch = demoChannel();
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "vote") emit();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === VOTES_KEY) emit();
    };
    ch?.addEventListener("message", onMsg);
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }

  const sb = supabase;
  const refetch = async () => {
    const { data } = await sb
      .from(VOTES_TABLE)
      .select("guess")
      .eq("submission_id", submissionId);
    const t: Tally = {};
    for (const row of data ?? []) {
      const g = row.guess as string;
      t[g] = (t[g] ?? 0) + 1;
    }
    cb(t);
  };
  refetch();

  const channel = sb
    .channel(`votes_${submissionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: VOTES_TABLE,
        filter: `submission_id=eq.${submissionId}`,
      },
      () => refetch()
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}
