"use client";

import { useState } from "react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { addSubmission, uploadPhoto } from "@/lib/submissions";
import { resizeImage } from "@/lib/image";

type Status = "idle" | "submitting" | "done" | "error";

export default function SubmitPage() {
  const [name, setName] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // Which clues the person chooses to include — all on by default.
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(brand.clues.map((c) => [c.key, true]))
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function handleFile(key: string, file: File | undefined) {
    if (!file) return;
    setFiles((f) => ({ ...f, [key]: file }));
    setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
  }

  // A clue counts as "filled" only if it's included AND has content.
  function isFilled(key: string, type: string) {
    if (!included[key]) return false;
    return type === "text"
      ? (texts[key] ?? "").trim().length > 0
      : Boolean(files[key]);
  }

  const includedCount = brand.clues.filter((c) => included[c.key]).length;
  const filledCount = brand.clues.filter((c) => isFilled(c.key, c.type)).length;

  // Ready when: a name is given, at least one clue is included, and every
  // included clue actually has content.
  const ready =
    name.trim().length > 0 &&
    includedCount >= 1 &&
    brand.clues.every((c) => !included[c.key] || isFilled(c.key, c.type));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setStatus("submitting");
    setError("");
    try {
      const clues: Record<string, string> = {};
      for (const clue of brand.clues) {
        if (!included[clue.key]) continue; // skip clues they opted out of
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

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Submit your clues</h1>
      <p className="mt-2 text-brand-muted">
        Your name stays hidden during the game — coworkers guess it from your
        clues. Pick anywhere from one to four; the more you add, the trickier
        the guess!
      </p>

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

        {/* Each clue, in the order defined in brand.ts. Each is optional. */}
        {brand.clues.map((clue) => {
          const on = included[clue.key];
          return (
            <div
              key={clue.key}
              className={"card p-5 transition " + (on ? "" : "opacity-60")}
            >
              <div className="flex items-start justify-between gap-3">
                <label className="block text-sm font-semibold">
                  <span className="mr-1">{clue.emoji}</span>
                  {clue.prompt}
                </label>
                {/* Include / skip toggle */}
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-brand-muted">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setIncluded((inc) => ({
                        ...inc,
                        [clue.key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-brand-primary"
                  />
                  Include
                </label>
              </div>

              {on &&
                (clue.type === "text" ? (
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
                ))}
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
            {filledCount} of {brand.clues.length} clues ready
          </span>
          {includedCount === 0 && (
            <span className="text-brand-accent">Include at least one clue</span>
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
