"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { getSubmissions, Submission } from "@/lib/submissions";
import { onVotes, setGameState, Tally } from "@/lib/live";
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
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState<Tally>({});

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

  // Tell everyone's phones which mystery is current + whether it's revealed.
  useEffect(() => {
    if (current?.id) setGameState({ submissionId: current.id, revealed });
  }, [current?.id, revealed]);

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
  useEffect(() => {
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
  }, [go]);

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
          <SubmitQR path="/vote" size={92} compact caption="📱 Scan to vote" />
        </div>
      </div>

      {/* Clue grid — only the clues this person chose to submit */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {brand.clues
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
        <button
          onClick={() => go(1)}
          disabled={idx === total - 1}
          className="rounded-full border border-brand-border px-5 py-2.5 font-medium transition hover:bg-brand-surface disabled:opacity-30"
        >
          Next →
        </button>
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
