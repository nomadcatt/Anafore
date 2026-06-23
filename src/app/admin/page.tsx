"use client";

import { useEffect, useState } from "react";
import { saveConfig, useConfig } from "@/lib/config";
import {
  clearSubmissions,
  getSubmissions,
  Submission,
} from "@/lib/submissions";
import { clearVotes } from "@/lib/live";
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
  const [clearingVotes, setClearingVotes] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  // Local mirror of the submissions-open flag so the toggle reflects instantly.
  const [open, setOpen] = useState<boolean | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);

  useEffect(() => {
    setOpen(cfg.submissionsOpen);
  }, [cfg.submissionsOpen]);

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

  async function handleClearVotes() {
    const ok = window.confirm(
      "Clear all votes and reset the game so you can play again with the same submissions? This cannot be undone."
    );
    if (!ok) return;
    setClearingVotes(true);
    setError("");
    try {
      await clearVotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear votes.");
    } finally {
      setClearingVotes(false);
    }
  }

  async function toggleSubmissions() {
    const next = !open;
    setTogglingOpen(true);
    setError("");
    setOpen(next); // optimistic
    try {
      await saveConfig({ ...cfg, submissionsOpen: next });
    } catch (e) {
      setOpen(!next); // roll back
      setError(e instanceof Error ? e.message : "Could not update submissions.");
    } finally {
      setTogglingOpen(false);
    }
  }

  // Flag any name shared by two or more submissions (case-insensitive) — these
  // are ambiguous to guess and to score, so the organizer should fix them.
  const nameCounts = new Map<string, number>();
  for (const s of subs ?? []) {
    const k = s.name.trim().toLowerCase();
    nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1);
  }
  const duplicateNames = new Set(
    [...nameCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k)
  );
  const isDuplicate = (name: string) =>
    duplicateNames.has(name.trim().toLowerCase());

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

      {/* Submissions open/closed — lock the form once the game starts */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-surface p-5">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <span>{open ? "🟢" : "🔒"}</span>
            <span>Submissions are {open ? "open" : "closed"}</span>
          </div>
          <p className="mt-1 text-sm text-brand-muted">
            {open
              ? "People can still submit. Close this before you start the game so the player list is locked."
              : "The /submit form is locked. Reopen it if you still need more entries."}
          </p>
        </div>
        <button
          onClick={toggleSubmissions}
          disabled={togglingOpen || open === null}
          className={
            "shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 " +
            (open
              ? "bg-red-600 text-white hover:bg-red-700"
              : "btn-primary")
          }
        >
          {togglingOpen
            ? "Saving…"
            : open
              ? "Close submissions"
              : "Reopen submissions"}
        </button>
      </div>

      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">All submissions</h1>
        <span className="text-brand-muted">{subs?.length ?? 0} total</span>
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {duplicateNames.size > 0 && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ <strong>Duplicate names found.</strong> Two or more people share the
          same name, so players can&apos;t tell them apart when guessing and the
          scoreboard may be off. Tip: open a submission below and make each name
          unique (e.g. add a last initial).
        </p>
      )}

      <div className="mt-6 space-y-4">
        {subs?.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex items-center gap-2 text-lg font-bold">
              {s.name}
              {isDuplicate(s.name) && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  ⚠️ duplicate name
                </span>
              )}
            </div>
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

      {/* Danger zone — two ways to reset */}
      <div className="mt-12 space-y-5 rounded-xl border border-red-200 bg-red-50/50 p-5">
        <h2 className="text-sm font-bold text-red-700">Reset the game</h2>

        {/* Option 1: clear votes only — replay with the same submissions */}
        <div>
          <p className="text-sm font-semibold text-red-700">
            Clear all votes
          </p>
          <p className="mt-1 text-sm text-red-700/80">
            Wipes every vote and resets the live game so you can play again
            fresh with the <strong>same submissions</strong>. Keeps everyone&apos;s
            clues. This can&apos;t be undone.
          </p>
          <button
            onClick={handleClearVotes}
            disabled={resetting || clearingVotes}
            className="mt-3 rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            {clearingVotes ? "Clearing…" : "Clear all votes"}
          </button>
        </div>

        {/* Option 2: clear submissions — start over with new prompts */}
        <div className="border-t border-red-200 pt-5">
          <p className="text-sm font-semibold text-red-700">
            Clear all submissions
          </p>
          <p className="mt-1 text-sm text-red-700/80">
            Deletes <strong>every submission</strong> (and its votes) so people
            can submit new prompts from scratch. Keeps your questions and
            settings. This can&apos;t be undone.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting || clearingVotes}
            className="mt-3 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {resetting ? "Clearing…" : "Clear all submissions"}
          </button>
        </div>
      </div>
    </div>
  );
}
