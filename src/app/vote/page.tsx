"use client";

import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";
import { getCandidateNames } from "@/lib/submissions";
import { castVote, getVoterId, GameState, onGameState } from "@/lib/live";

export default function VotePage() {
  const [voterId, setVoterId] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [state, setState] = useState<GameState>({
    submissionId: null,
    revealed: false,
  });
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setVoterId(getVoterId());
    getCandidateNames()
      .then(setNames)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load names.")
      );
  }, []);

  // Follow the presenter: which mystery is live + whether it's revealed.
  useEffect(() => onGameState(setState), []);

  // New round → let this phone vote again.
  useEffect(() => {
    setVotedFor(null);
  }, [state.submissionId]);

  async function vote(name: string) {
    if (!state.submissionId || !voterId) return;
    setVotedFor(name); // optimistic
    try {
      await castVote(state.submissionId, name, voterId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record your vote.");
      setVotedFor(null);
    }
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
        {brand.companyName}
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
