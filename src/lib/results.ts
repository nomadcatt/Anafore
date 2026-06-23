// ─────────────────────────────────────────────────────────────────────────────
// RESULTS — turns the raw submissions + votes into the end-of-game finale data:
// a leaderboard of the room's best guessers and overall room stats. Pure
// functions (no I/O) so both the presenter screen and phones can reuse them.
// ─────────────────────────────────────────────────────────────────────────────

import type { Submission } from "./submissions";
import type { VoteRecord } from "./live";

/** One player's overall game score. */
export type LeaderboardEntry = {
  voterId: string;
  name: string;
  correct: number;
  answered: number;
  /** 1-based rank (ties share a rank). */
  rank: number;
};

/** How the room did on a single mystery. */
export type MysteryStat = {
  submissionId: string;
  name: string;
  correct: number;
  total: number;
};

export type GameResults = {
  leaderboard: LeaderboardEntry[];
  totalGuesses: number;
  totalCorrect: number;
  /** Share of all guesses that were right, 0–100 (0 when no votes). */
  accuracyPct: number;
  /** Mystery the room nailed best / found hardest (needs ≥1 vote each). */
  easiest: MysteryStat | null;
  trickiest: MysteryStat | null;
};

export function computeResults(
  submissions: Submission[],
  votes: VoteRecord[]
): GameResults {
  // submissionId -> the correct name.
  const answer = new Map<string, string>();
  for (const s of submissions) answer.set(s.id, s.name);

  // Per-player tallies.
  const byVoter = new Map<
    string,
    { name: string; correct: number; answered: number }
  >();
  // Per-mystery tallies.
  const byMystery = new Map<string, MysteryStat>();

  let totalGuesses = 0;
  let totalCorrect = 0;

  for (const v of votes) {
    const truth = answer.get(v.submissionId);
    if (truth === undefined) continue; // ignore votes for deleted submissions
    const isCorrect = v.guess === truth;
    totalGuesses += 1;
    if (isCorrect) totalCorrect += 1;

    const player = byVoter.get(v.voterId) ?? {
      name: "",
      correct: 0,
      answered: 0,
    };
    player.answered += 1;
    if (isCorrect) player.correct += 1;
    // Prefer a non-empty name (the player's latest known label).
    if (v.voterName.trim()) player.name = v.voterName.trim();
    byVoter.set(v.voterId, player);

    const m = byMystery.get(v.submissionId) ?? {
      submissionId: v.submissionId,
      name: truth,
      correct: 0,
      total: 0,
    };
    m.total += 1;
    if (isCorrect) m.correct += 1;
    byMystery.set(v.submissionId, m);
  }

  const leaderboard: LeaderboardEntry[] = [...byVoter.entries()]
    .map(([voterId, p]) => ({
      voterId,
      name: p.name || "Anonymous",
      correct: p.correct,
      answered: p.answered,
      rank: 0,
    }))
    // Most correct wins; break ties by fewer wrong guesses (higher accuracy).
    .sort((a, b) => b.correct - a.correct || a.answered - b.answered);

  // Assign ranks (ties share a rank, e.g. 1, 2, 2, 4).
  leaderboard.forEach((e, i) => {
    if (i > 0 && e.correct === leaderboard[i - 1].correct) {
      e.rank = leaderboard[i - 1].rank;
    } else {
      e.rank = i + 1;
    }
  });

  // Easiest / trickiest by accuracy among mysteries that got votes.
  let easiest: MysteryStat | null = null;
  let trickiest: MysteryStat | null = null;
  for (const m of byMystery.values()) {
    if (m.total === 0) continue;
    const acc = m.correct / m.total;
    if (!easiest || acc > easiest.correct / easiest.total) easiest = m;
    if (!trickiest || acc < trickiest.correct / trickiest.total) trickiest = m;
  }

  return {
    leaderboard,
    totalGuesses,
    totalCorrect,
    accuracyPct: totalGuesses ? Math.round((totalCorrect / totalGuesses) * 100) : 0,
    easiest,
    trickiest,
  };
}
