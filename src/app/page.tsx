"use client";

import Link from "next/link";
import { useConfig } from "@/lib/config";
import SubmitQR from "@/components/SubmitQR";

export default function Home() {
  const cfg = useConfig();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      {/* Header: title + tagline on the left, scan-to-submit QR to the side */}
      <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:text-left">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
            {cfg.companyName} all-hands
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
            {cfg.gameTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-brand-muted">
            {cfg.tagline}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <Link
              href="/submit"
              className="btn-primary w-full rounded-full px-8 py-3.5 text-lg font-semibold sm:w-auto"
            >
              Submit my clues
            </Link>
            <Link
              href="/play"
              className="w-full rounded-full border border-brand-border bg-brand-surface px-8 py-3.5 text-lg font-semibold transition hover:border-brand-primary sm:w-auto"
            >
              Play the game
            </Link>
          </div>
        </div>

        {/* Scan to submit from your phone */}
        <div className="shrink-0">
          <SubmitQR path="/submit" size={132} compact caption="📱 Scan to submit" />
        </div>
      </div>

      {/* How it works */}
      {cfg.howItWorks.length > 0 && (
        <div className="mt-12 card p-6 text-center">
          <h2 className="text-lg font-bold">How it works</h2>
          <ol className="mx-auto mt-3 max-w-md space-y-1 text-left text-sm text-brand-muted">
            {cfg.howItWorks.map((step, i) => (
              <li key={i}>
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* What you'll submit — a clearly-labeled preview of the prompts */}
      <section className="mt-12">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Preview
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            The prompts you&apos;ll answer
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-brand-muted">
            Here&apos;s a sneak peek at the {cfg.clues.length} prompts. When you
            submit, answer any{" "}
            <strong className="text-brand-ink">{cfg.minAnswers} or more</strong>{" "}
            — your answers become the clues the room tries to match to you.
          </p>
        </div>

        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {cfg.clues.map((clue, i) => (
            <li key={clue.key} className="card flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl">
                {clue.emoji}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-muted">
                    Prompt {i + 1}
                  </span>
                </div>
                <div className="font-semibold">{clue.label}</div>
                <div className="text-sm text-brand-muted">{clue.prompt}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 text-center">
          <Link
            href="/submit"
            className="btn-primary inline-block rounded-full px-8 py-3.5 text-lg font-semibold"
          >
            Submit my clues
          </Link>
        </div>
      </section>
    </div>
  );
}
