"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";
import { useConfig } from "@/lib/config";
import SubmitQR from "@/components/SubmitQR";

export default function Home() {
  const cfg = useConfig();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
          {brand.companyName} all-hands
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
          {cfg.gameTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-brand-muted">
          {cfg.tagline}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
      <div className="mt-14 flex flex-col items-center gap-3 text-center">
        <h2 className="text-lg font-bold">Submit from your phone 📱</h2>
        <p className="max-w-sm text-sm text-brand-muted">
          Scan this code (or project it for the room) to open the form and upload
          photos straight from your phone.
        </p>
        <div className="mt-2">
          <SubmitQR path="/submit" size={200} />
        </div>
      </div>

      {/* What you'll submit */}
      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {cfg.clues.map((clue) => (
          <div key={clue.key} className="card flex items-center gap-4 p-5">
            <div className="text-3xl">{clue.emoji}</div>
            <div>
              <div className="font-semibold">{clue.label}</div>
              <div className="text-sm text-brand-muted">{clue.prompt}</div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-12 card p-6 text-center">
        <h2 className="text-lg font-bold">How it works</h2>
        <ol className="mx-auto mt-3 max-w-md space-y-1 text-left text-sm text-brand-muted">
          <li>1. Everyone secretly submits their clues.</li>
          <li>2. At the all-hands, we put the clues on the big screen.</li>
          <li>3. The room votes on their phones for who they think it is.</li>
          <li>4. Reveal the answer — and see who knows their coworkers best.</li>
        </ol>
      </div>
    </div>
  );
}
