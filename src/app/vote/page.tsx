"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/lib/config";
import {
  getCandidateNames,
  getSubmissionName,
  getSubmissions,
} from "@/lib/submissions";
import {
  castVote,
  getAllVotes,
  getVoterId,
  getVoterName,
  setVoterName,
  GameState,
  onGameState,
} from "@/lib/live";
import { computeResults, GameResults } from "@/lib/results";

export default function VotePage() {
  const cfg = useConfig();
  const [voterId, setVoterId] = useState("");
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [state, setState] = useState<GameState>({
    submissionId: null,
    revealed: false,
    finished: false,
  });
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setVoterId(getVoterId());
    setName(getVoterName());
    getCandidateNames()
      .then(setNames)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load names.")
      );
  }, []);

  // At the finale, fetch the full results so this phone can show its score.
  useEffect(() => {
    if (!state.finished) {
      setResults(null);
      return;
    }
    let alive = true;
    Promise.all([getSubmissions(), getAllVotes()])
      .then(([subs, votes]) => {
        if (alive) setResults(computeResults(subs, votes));
      })
      .catch(() => {
        if (alive) setResults(null);
      });
    return () => {
      alive = false;
    };
  }, [state.finished]);

  // Follow the presenter: which mystery is live + whether it's revealed.
  useEffect(() => onGameState(setState), []);

  // New round → let this phone vote again.
  useEffect(() => {
    setVotedFor(null);
  }, [state.submissionId]);

  // On reveal, fetch the correct name so we can tell this phone if it got it
  // right. Only runs after the host reveals, so the answer stays secret.
  useEffect(() => {
    if (!state.revealed || !state.submissionId) {
      setAnswer(null);
      return;
    }
    let alive = true;
    getSubmissionName(state.submissionId).then((n) => {
      if (alive) setAnswer(n);
    });
    return () => {
      alive = false;
    };
  }, [state.revealed, state.submissionId]);

  function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setVoterName(trimmed);
    setName(trimmed);
  }

  async function vote(guess: string) {
    if (!state.submissionId || !voterId) return;
    setVotedFor(guess); // optimistic
    try {
      await castVote(state.submissionId, guess, voterId, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record your vote.");
      setVotedFor(null);
    }
  }

  // ── Game over: this phone's personal results ──
  if (state.finished) {
    const me = results?.leaderboard.find((e) => e.voterId === voterId) ?? null;
    return (
      <Shell>
        <div className="animate-[pulse_1.4s_ease-in-out_1] text-6xl">🎉</div>
        <h1 className="mt-3 text-3xl font-black">That&apos;s a wrap!</h1>
        {results === null ? (
          <p className="mt-3 text-brand-muted">Tallying the winners…</p>
        ) : me && me.answered > 0 ? (
          <>
            <p className="mt-3 text-xl font-semibold">
              You got {me.correct} of {me.answered} right.
            </p>
            <p className="mt-2 rounded-full bg-brand-tint px-4 py-2 text-sm font-medium text-brand-primary">
              {me.rank === 1
                ? "🏆 You're in 1st place!"
                : `You placed #${me.rank} of ${results.leaderboard.length}`}
            </p>
          </>
        ) : (
          <p className="mt-3 text-brand-muted">
            You didn&apos;t vote this game — check the big screen for the winners!
          </p>
        )}
        <p className="mt-6 text-sm text-brand-muted">
          🏆 The winners are up on the big screen.
        </p>
      </Shell>
    );
  }

  // ── Ask for the player's name (once) so we can crown winners at the end ──
  if (!name) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-accent">
          {cfg.companyName}
        </p>
        <h1 className="mt-1 text-center text-2xl font-bold">What&apos;s your name?</h1>
        <p className="mt-1 text-center text-brand-muted">
          So we can put you on the leaderboard when the game wraps up.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
          className="mt-6"
        >
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3.5 text-lg focus:border-brand-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="btn-primary mt-3 w-full rounded-full px-5 py-3 font-semibold disabled:opacity-40"
          >
            Let&apos;s play →
          </button>
        </form>
      </div>
    );
  }

  // ── Waiting for the game to start ──
  if (!state.submissionId) {
    return (
      <Shell>
        <div className="text-4xl">⏳</div>
        <h1 className="mt-3 text-xl font-bold">Hang tight!</h1>
        <p className="mt-2 text-brand-muted">
          The game hasn&apos;t started yet. When the host puts a mystery on
          screen, the candidates will pop up here to vote.
        </p>
      </Shell>
    );
  }

  // ── Answer revealed ──
  if (state.revealed) {
    const gotIt = answer !== null && votedFor !== null && votedFor === answer;

    // While the answer is still loading, keep it simple.
    if (answer === null) {
      return (
        <Shell>
          <div className="text-4xl">👀</div>
          <h1 className="mt-3 text-xl font-bold">Answer revealed!</h1>
          <p className="mt-2 text-brand-muted">Check the big screen.</p>
          {votedFor && (
            <p className="mt-4 rounded-full bg-brand-tint px-4 py-2 text-sm font-medium">
              You guessed: {votedFor}
            </p>
          )}
        </Shell>
      );
    }

    return (
      <Shell>
        {!votedFor ? (
          // Didn't vote this round.
          <>
            <div className="text-5xl">👀</div>
            <h1 className="mt-3 text-2xl font-bold">
              It was {answer}!
            </h1>
            <p className="mt-2 text-brand-muted">
              You sat this one out — jump in on the next mystery!
            </p>
          </>
        ) : gotIt ? (
          // Correct guess 🎉
          <>
            <div className="animate-[pulse_1.2s_ease-in-out_1] text-6xl">🎉</div>
            <h1 className="mt-3 text-2xl font-black text-brand-primary">
              You got it!
            </h1>
            <p className="mt-2 text-lg font-medium">It really was {answer}.</p>
            <p className="mt-2 text-sm text-brand-muted">
              Nice — you know your coworkers.
            </p>
          </>
        ) : (
          // Wrong guess
          <>
            <div className="text-5xl">😅</div>
            <h1 className="mt-3 text-2xl font-bold">So close!</h1>
            <p className="mt-2 text-lg font-medium">It was {answer}.</p>
            <p className="mt-3 rounded-full bg-brand-tint px-4 py-2 text-sm font-medium">
              You guessed: {votedFor}
            </p>
          </>
        )}
        <p className="mt-6 text-sm text-brand-muted">
          Waiting for the next mystery…
        </p>
      </Shell>
    );
  }

  // ── Voting ──
  return (
    <div className="mx-auto max-w-md px-5 py-8">
      <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-accent">
        {cfg.companyName}
      </p>
      <h1 className="mt-1 text-center text-2xl font-bold">Who is it?</h1>
      <p className="mt-1 text-center text-brand-muted">
        Look at the clues on screen, then tap your guess. You can change it until
        the host reveals.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-2.5">
        {names.map((n) => {
          const selected = votedFor === n;
          return (
            <button
              key={n}
              onClick={() => vote(n)}
              className={
                "rounded-xl border px-4 py-3.5 text-left text-lg font-medium transition " +
                (selected
                  ? "border-brand-primary bg-brand-primary text-brand-primary-ink"
                  : "border-brand-border bg-brand-surface hover:border-brand-primary")
              }
            >
              {selected ? "✓ " : ""}
              {n}
            </button>
          );
        })}
      </div>

      {votedFor && (
        <p className="mt-5 text-center text-sm text-brand-muted">
          Vote locked in for <strong>{votedFor}</strong> — tap another to change.
        </p>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
      {children}
    </div>
  );
}
