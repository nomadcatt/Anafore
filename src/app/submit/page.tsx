"use client";

import { useState } from "react";
import Link from "next/link";
import { useConfig } from "@/lib/config";
import { addSubmission, uploadPhoto } from "@/lib/submissions";
import { resizeImage } from "@/lib/image";
import SubmitQR from "@/components/SubmitQR";

type Status = "idle" | "submitting" | "done" | "error";

export default function SubmitPage() {
  const cfg = useConfig();
  const [name, setName] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function handleFile(key: string, file: File | undefined) {
    if (!file) return;
    setFiles((f) => ({ ...f, [key]: file }));
    setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
  }

  // A clue counts as "filled" simply when it has content — no opt-in needed.
  // Anything left blank is automatically skipped on submit.
  function isFilled(key: string, type: string) {
    return type === "text"
      ? (texts[key] ?? "").trim().length > 0
      : Boolean(files[key]);
  }

  const filledCount = cfg.clues.filter((c) => isFilled(c.key, c.type)).length;
  const minAnswers = cfg.minAnswers;

  // Ready when there's a name and at least the required number of answers.
  // Anything left blank is simply skipped.
  const ready = name.trim().length > 0 && filledCount >= minAnswers;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !cfg.submissionsOpen) return;
    setStatus("submitting");
    setError("");
    try {
      const clues: Record<string, string> = {};
      for (const clue of cfg.clues) {
        if (!isFilled(clue.key, clue.type)) continue; // skip blank/opted-out
        if (clue.type === "text") {
          clues[clue.key] = texts[clue.key].trim();
        } else {
          const resized = await resizeImage(files[clue.key]);
          clues[clue.key] = await uploadPhoto(resized);
        }
      }
      await addSubmission(name.trim(), clues);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <div className="card p-10">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-4 text-2xl font-bold">You&apos;re in, {name.trim()}!</h1>
          <p className="mt-2 text-brand-muted">
            You submitted {filledCount} clue{filledCount === 1 ? "" : "s"}. No
            peeking — see you at the all-hands!
          </p>
          <Link
            href="/"
            className="btn-primary mt-6 inline-block rounded-full px-5 py-2.5 font-medium"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (!cfg.submissionsOpen) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <div className="card p-10">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold">Submissions are closed</h1>
          <p className="mt-2 text-brand-muted">
            The game is underway — entries are locked. Head to the big screen and
            get ready to guess!
          </p>
          <Link
            href="/"
            className="btn-primary mt-6 inline-block rounded-full px-5 py-2.5 font-medium"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {cfg.submitTitle}
          </h1>
          <p className="mt-2 whitespace-pre-line text-brand-muted">
            {cfg.submitIntro}
          </p>
        </div>
        {/* Compact QR on the side — scan to finish on your phone (where your
            photos live). Hidden on small screens since you're already mobile. */}
        <div className="hidden shrink-0 sm:block">
          <SubmitQR path="/submit" size={84} compact caption="📱 Open on phone" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Name */}
        <div className="card p-5">
          <label className="block text-sm font-semibold">
            Your name <span className="text-brand-accent">*</span>
          </label>
          <p className="mt-0.5 text-xs text-brand-muted">
            Hidden until the big reveal.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Rivera"
            className="mt-3 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 outline-none focus:border-brand-primary"
          />
        </div>

        {/* Each clue — all optional. Fill in any you want; blanks are skipped. */}
        {cfg.clues.map((clue) => {
          const filled = isFilled(clue.key, clue.type);
          return (
            <div key={clue.key} className="card p-5 transition">
              <div className="flex items-start justify-between gap-3">
                <label className="block text-sm font-semibold">
                  <span className="mr-1">{clue.emoji}</span>
                  {clue.prompt}
                </label>
                {filled ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-accent">
                    ✓ Answered
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-brand-muted">
                    Optional
                  </span>
                )}
              </div>

              {clue.type === "text" ? (
                <textarea
                  value={texts[clue.key] ?? ""}
                  onChange={(e) =>
                    setTexts((t) => ({ ...t, [clue.key]: e.target.value }))
                  }
                  rows={3}
                  placeholder="Type it here…"
                  className="mt-3 w-full resize-none rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 outline-none focus:border-brand-primary"
                />
              ) : (
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-brand-border bg-brand-bg transition hover:border-brand-primary">
                  {previews[clue.key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previews[clue.key]}
                      alt="preview"
                      className="max-h-60 w-full object-contain"
                    />
                  ) : (
                    <span className="px-4 py-10 text-sm text-brand-muted">
                      Tap to upload a photo 📷
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(clue.key, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          );
        })}

        {status === "error" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-brand-muted">
          <span>
            {filledCount} of {cfg.clues.length} answered
          </span>
          {filledCount < minAnswers && (
            <span className="text-brand-accent">
              Answer at least {minAnswers} to submit
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!ready || status === "submitting"}
          className="btn-primary w-full rounded-full px-6 py-3.5 text-lg font-semibold"
        >
          {status === "submitting" ? "Submitting…" : "Submit my clues"}
        </button>
      </form>
    </div>
  );
}
