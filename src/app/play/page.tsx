"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConfig } from "@/lib/config";
import { getSubmissions, Submission } from "@/lib/submissions";
import { getAllVotes, onVotes, setGameState, Tally } from "@/lib/live";
import { computeResults, GameResults } from "@/lib/results";
import SubmitQR from "@/components/SubmitQR";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PlayPage() {
  const cfg = useConfig();
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState<Tally>({});
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<GameResults | null>(null);

  useEffect(() => {
    getSubmissions()
      .then((data) => setSubs(shuffle(data)))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load the game.")
      );
  }, []);

  // The pool of names shown as guess options (stable order).
  const namePool = useMemo(
    () => (subs ? shuffle(subs.map((s) => s.name)) : []),
    [subs]
  );

  const total = subs?.length ?? 0;
  const current = subs?.[idx];

  // Tell everyone's phones which mystery is current, whether it's revealed, and
  // whether the game has wrapped up (so they follow us into the finale).
  useEffect(() => {
    if (current?.id)
      setGameState({ submissionId: current.id, revealed, finished });
  }, [current?.id, revealed, finished]);

  // When the host ends the game, tally up the leaderboard + room stats.
  useEffect(() => {
    if (!finished || !subs) return;
    let alive = true;
    getAllVotes()
      .then((votes) => {
        if (alive) setResults(computeResults(subs, votes));
      })
      .catch(() => {
        if (alive) setResults(computeResults(subs, []));
      });
    return () => {
      alive = false;
    };
  }, [finished, subs]);

  // Subscribe to the live vote tally for the current mystery.
  useEffect(() => {
    setTally({});
    if (!current?.id) return;
    return onVotes(current.id, setTally);
  }, [current?.id]);

  const totalVotes = useMemo(
    () => Object.values(tally).reduce((a, b) => a + b, 0),
    [tally]
  );
  const correctVotes = current ? (tally[current.name] ?? 0) : 0;

  // A fun headline for the reveal, based on how the room did.
  const winnerMessage = (() => {
    if (!current) return "";
    if (totalVotes === 0) return `The answer is ${current.name}!`;
    if (correctVotes === 0) return `🙈 Nobody guessed it — it was ${current.name}!`;
    if (correctVotes === totalVotes)
      return `🏆 A clean sweep! Everyone knew it was ${current.name}!`;
    return `🎉 ${correctVotes} of ${totalVotes} guessed it — it's ${current.name}!`;
  })();

  const go = useCallback(
    (delta: number) => {
      setRevealed(false);
      setIdx((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
    },
    [total]
  );

  // Presenter keyboard shortcuts: ← → to navigate, space/enter to reveal.
  // Disabled once we're on the winners finale.
  useEffect(() => {
    if (finished) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed((r) => !r);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, finished]);

  if (error) {
    return (
      <Centered>
        <p className="text-red-600">{error}</p>
      </Centered>
    );
  }

  if (!subs) {
    return (
      <Centered>
        <p className="text-brand-muted">Loading the game…</p>
      </Centered>
    );
  }

  if (total === 0) {
    return (
      <Centered>
        <div className="card max-w-md p-8 text-center">
          <div className="text-4xl">🗳️</div>
          <h1 className="mt-3 text-xl font-bold">No submissions yet</h1>
          <p className="mt-2 text-brand-muted">
            Once your coworkers submit their clues, the game shows up here.
          </p>
          <Link
            href="/submit"
            className="btn-primary mt-5 inline-block rounded-full px-5 py-2.5 font-medium"
          >
            Go to the submission form
          </Link>
        </div>
      </Centered>
    );
  }

  // ── Winners finale (shown after the host ends the last mystery) ──
  if (finished) {
    return (
      <Finale
        results={results}
        onBack={() => {
          setResults(null);
          setFinished(false);
        }}
      />
    );
  }

  const isLast = idx === total - 1;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Header: progress + scan-to-vote QR */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm text-brand-muted">
            <span className="font-semibold">
              Mystery #{idx + 1}{" "}
              <span className="font-normal">of {total}</span>
            </span>
            <span className="hidden sm:inline">Who submitted these clues?</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <SubmitQR path="/vote" size={150} compact caption="📱 Scan to vote" />
        </div>
      </div>

      {/* Clue grid — only the clues this person chose to submit */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cfg.clues
          .filter((clue) => (current?.clues[clue.key] ?? "") !== "")
          .map((clue) => {
            const value = current!.clues[clue.key];
            return (
              <div key={clue.key} className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-brand-border px-4 py-2.5 text-sm font-semibold">
                  <span>{clue.emoji}</span>
                  <span>{clue.label}</span>
                </div>
                {clue.type === "image" ? (
                  <div className="flex aspect-video items-center justify-center bg-brand-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={value}
                      alt={clue.label}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center px-6 text-center">
                    <p className="text-xl font-medium italic leading-snug">
                      “{value}”
                    </p>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Winner moment — celebratory banner shown on reveal */}
      {revealed && (
        <div className="mt-6 animate-[pulse_1.2s_ease-in-out_1] rounded-2xl border border-brand-primary bg-brand-tint px-6 py-5 text-center">
          <p className="text-2xl font-black tracking-tight text-brand-ink sm:text-3xl">
            {winnerMessage}
          </p>
          {totalVotes > 0 && (
            <p className="mt-1 text-sm font-medium text-brand-muted">
              {Math.round((correctVotes / totalVotes) * 100)}% of the room got it
              right
            </p>
          )}
        </div>
      )}

      {/* Live vote tally — one bar per candidate, updates in real time */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold">The room&apos;s guesses</span>
          <span className="text-brand-muted">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"} · live
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {namePool.map((n) => {
            const count = tally[n] ?? 0;
            const pct = totalVotes ? (count / totalVotes) * 100 : 0;
            const isAnswer = revealed && n === current?.name;
            return (
              <div
                key={n}
                className={
                  "relative overflow-hidden rounded-xl border px-4 py-3 transition " +
                  (isAnswer
                    ? "border-brand-primary ring-2 ring-brand-primary"
                    : revealed
                      ? "border-brand-border opacity-50"
                      : "border-brand-border")
                }
              >
                {/* vote bar fill */}
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{
                    width: `${pct}%`,
                    background: isAnswer
                      ? "var(--brand-primary)"
                      : "var(--brand-tint)",
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <span
                    className={
                      "font-medium " +
                      (isAnswer ? "text-brand-primary-ink" : "text-brand-ink")
                    }
                  >
                    {n}
                    {isAnswer && " ✅"}
                  </span>
                  <span
                    className={
                      "text-sm tabular-nums " +
                      (isAnswer
                        ? "text-brand-primary-ink"
                        : "text-brand-muted")
                    }
                  >
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="rounded-full border border-brand-border px-5 py-2.5 font-medium transition hover:bg-brand-surface disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          onClick={() => setRevealed((r) => !r)}
          className="btn-primary rounded-full px-8 py-2.5 font-semibold"
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
        {isLast ? (
          <button
            onClick={() => setFinished(true)}
            className="btn-primary rounded-full px-6 py-2.5 font-semibold"
          >
            🏆 Finish & show winners
          </button>
        ) : (
          <button
            onClick={() => go(1)}
            className="rounded-full border border-brand-border px-5 py-2.5 font-medium transition hover:bg-brand-surface"
          >
            Next →
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-brand-muted">
        Tip: use ← → arrow keys to move and the spacebar to reveal. The room
        votes on their phones — tallies update live above.
      </p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      {children}
    </div>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];

function Finale({
  results,
  onBack,
}: {
  results: GameResults | null;
  onBack: () => void;
}) {
  if (!results) {
    return (
      <Centered>
        <p className="text-brand-muted">Tallying the winners…</p>
      </Centered>
    );
  }

  const { leaderboard, accuracyPct, totalGuesses, easiest, trickiest } = results;
  // Everyone tied with the top score is a "winner".
  const topRank = leaderboard.length ? leaderboard[0].rank : 0;
  const winners = leaderboard.filter((e) => e.rank === topRank);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="text-center">
        <div className="animate-[pulse_1.4s_ease-in-out_1] text-6xl">🏆</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          That&apos;s a wrap!
        </h1>
        {winners.length > 0 && winners[0].correct > 0 ? (
          <p className="mt-3 text-xl font-semibold text-brand-primary sm:text-2xl">
            {winners.length === 1
              ? `🎉 ${winners[0].name} wins`
              : `🎉 It's a tie — ${winners.map((w) => w.name).join(" & ")} win`}{" "}
            with {winners[0].correct}/{winners[0].answered} right!
          </p>
        ) : (
          <p className="mt-3 text-lg text-brand-muted">
            Tough crowd — nobody got a clean run. Here&apos;s how the room did.
          </p>
        )}
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-muted">
            Top guessers
          </h2>
          <div className="grid gap-2">
            {leaderboard.slice(0, 10).map((e, i) => {
              const isWinner = e.rank === topRank && e.correct > 0;
              return (
                <div
                  key={e.voterId}
                  className={
                    "flex items-center justify-between rounded-xl border px-4 py-3 " +
                    (isWinner
                      ? "border-brand-primary bg-brand-tint ring-1 ring-brand-primary"
                      : "border-brand-border")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-lg font-bold tabular-nums">
                      {MEDAL[e.rank - 1] ?? e.rank}
                    </span>
                    <span className="text-lg font-semibold">{e.name}</span>
                  </div>
                  <span className="text-sm font-medium text-brand-muted">
                    {e.correct}/{e.answered} correct
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center text-brand-muted">
          No votes were cast this game.
        </p>
      )}

      {/* Room stats */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Room accuracy" value={`${accuracyPct}%`}
          sub={`${totalGuesses} guess${totalGuesses === 1 ? "" : "es"} total`} />
        <Stat
          label="🧠 Easiest to spot"
          value={easiest ? easiest.name : "—"}
          sub={
            easiest
              ? `${Math.round((easiest.correct / easiest.total) * 100)}% got it`
              : "no votes"
          }
        />
        <Stat
          label="🙈 Trickiest"
          value={trickiest ? trickiest.name : "—"}
          sub={
            trickiest
              ? `${Math.round((trickiest.correct / trickiest.total) * 100)}% got it`
              : "no votes"
          }
        />
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={onBack}
          className="rounded-full border border-brand-border px-5 py-2.5 font-medium transition hover:bg-brand-surface"
        >
          ← Back to the game
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card px-4 py-4 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </div>
      <div className="mt-1 truncate text-2xl font-black">{value}</div>
      <div className="mt-0.5 text-xs text-brand-muted">{sub}</div>
    </div>
  );
}
