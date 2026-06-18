"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/lib/config";
import {
  clearSubmissions,
  getSubmissions,
  Submission,
} from "@/lib/submissions";
import SettingsEditor from "@/components/SettingsEditor";

// Light, casual gate so a stray click on /admin doesn't spoil the answers.
// Set NEXT_PUBLIC_ADMIN_CODE in your env to change it (default: "reveal").
const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "reveal";

export default function AdminPage() {
  const cfg = useConfig();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  function load() {
    getSubmissions()
      .then(setSubs)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load submissions.")
      );
  }

  useEffect(() => {
    if (!unlocked) return;
    load();
  }, [unlocked]);

  async function handleReset() {
    const ok = window.confirm(
      "Delete ALL submissions? This cannot be undone. Do this only when you want a clean slate for a new round."
    );
    if (!ok) return;
    setResetting(true);
    setError("");
    try {
      await clearSubmissions();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset submissions.");
    } finally {
      setResetting(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm px-5 py-20">
        <div className="card p-6">
          <h1 className="text-xl font-bold">Organizer view 🔒</h1>
          <p className="mt-1 text-sm text-brand-muted">
            This page shows everyone&apos;s name and answers. Enter the code to
            continue.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code === ADMIN_CODE) setUnlocked(true);
              else setError("Wrong code.");
            }}
          >
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Access code"
              className="mt-4 w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 outline-none focus:border-brand-primary"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="btn-primary mt-3 w-full rounded-full px-5 py-2.5 font-medium"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      {/* Questions & settings editor (collapsible) */}
      <div className="card mb-8 p-5">
        <button
          onClick={() => setShowEditor((s) => !s)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-lg font-bold">✏️ Questions &amp; settings</span>
          <span className="text-sm text-brand-muted">
            {showEditor ? "Hide ▲" : "Edit ▼"}
          </span>
        </button>
        {showEditor && (
          <div className="mt-5 border-t border-brand-border pt-5">
            <SettingsEditor />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">All submissions</h1>
        <span className="text-brand-muted">{subs?.length ?? 0} total</span>
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {subs?.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="text-lg font-bold">{s.name}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cfg.clues.map((clue) => {
                const v = s.clues[clue.key] ?? "";
                const skipped = v === "";
                return (
                  <div key={clue.key}>
                    <div className="text-xs font-semibold text-brand-muted">
                      {clue.emoji} {clue.label}
                    </div>
                    {skipped ? (
                      <p className="mt-1 text-sm italic text-brand-muted/70">
                        — skipped —
                      </p>
                    ) : clue.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v}
                        alt={clue.label}
                        className="mt-1 aspect-video w-full rounded-lg object-cover"
                      />
                    ) : (
                      <p className="mt-1 text-sm italic">“{v}”</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {subs && subs.length === 0 && (
          <p className="text-brand-muted">No submissions yet.</p>
        )}
      </div>

      {/* Danger zone — reset everything for a fresh round */}
      <div className="mt-12 rounded-xl border border-red-200 bg-red-50/50 p-5">
        <h2 className="text-sm font-bold text-red-700">Reset the game</h2>
        <p className="mt-1 text-sm text-red-700/80">
          Permanently delete every submission so you can start a new round (for
          example, after changing the questions). This can&apos;t be undone.
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="mt-3 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Clear all submissions"}
        </button>
      </div>
    </div>
  );
}
