"use client";

import { useEffect, useState } from "react";
import {
  AppConfig,
  Clue,
  getConfig,
  newClueKey,
  saveConfig,
} from "@/lib/config";

/**
 * Organizer editor for the game's questions and settings. Saves to the
 * database so changes go live for everyone with no redeploy.
 */
export default function SettingsEditor() {
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getConfig().then(setDraft);
  }, []);

  if (!draft) {
    return <p className="text-sm text-brand-muted">Loading settings…</p>;
  }

  const update = (patch: Partial<AppConfig>) => {
    setDraft({ ...draft, ...patch });
    setSaved(false);
  };

  const updateClue = (i: number, patch: Partial<Clue>) => {
    const clues = draft.clues.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    update({ clues });
  };

  const addClue = () => {
    update({
      clues: [
        ...draft.clues,
        { key: newClueKey(), type: "text", label: "", emoji: "❓", prompt: "" },
      ],
    });
  };

  const removeClue = (i: number) => {
    update({ clues: draft.clues.filter((_, idx) => idx !== i) });
  };

  const moveClue = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.clues.length) return;
    const clues = [...draft.clues];
    [clues[i], clues[j]] = [clues[j], clues[i]];
    update({ clues });
  };

  const updateStep = (i: number, val: string) =>
    update({ howItWorks: draft.howItWorks.map((s, idx) => (idx === i ? val : s)) });
  const addStep = () => update({ howItWorks: [...draft.howItWorks, ""] });
  const removeStep = (i: number) =>
    update({ howItWorks: draft.howItWorks.filter((_, idx) => idx !== i) });
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.howItWorks.length) return;
    const steps = [...draft.howItWorks];
    [steps[i], steps[j]] = [steps[j], steps[i]];
    update({ howItWorks: steps });
  };

  async function save() {
    // Basic validation
    if (draft!.clues.length === 0) {
      setErr("Add at least one question.");
      return;
    }
    if (draft!.clues.some((c) => !c.prompt.trim())) {
      setErr("Every question needs prompt text.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      const clamped = Math.min(
        Math.max(1, draft!.minAnswers),
        draft!.clues.length
      );
      await saveConfig({ ...draft!, minAnswers: clamped });
      setDraft({ ...draft!, minAnswers: clamped });
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Title / tagline / min answers */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-brand-muted">
            Company name (shown as &ldquo;___ all-hands&rdquo; on the home page)
          </span>
          <input
            value={draft.companyName}
            onChange={(e) => update({ companyName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 outline-none focus:border-brand-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-brand-muted">
            Game title
          </span>
          <input
            value={draft.gameTitle}
            onChange={(e) => update({ gameTitle: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 outline-none focus:border-brand-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-brand-muted">
            Minimum answers required
          </span>
          <input
            type="number"
            min={1}
            max={draft.clues.length}
            value={draft.minAnswers}
            onChange={(e) =>
              update({ minAnswers: parseInt(e.target.value) || 1 })
            }
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 outline-none focus:border-brand-primary"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-brand-muted">Tagline</span>
          <input
            value={draft.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 outline-none focus:border-brand-primary"
          />
        </label>
      </div>

      {/* Submission page text */}
      <div className="grid gap-3">
        <div className="text-xs font-semibold text-brand-muted">
          Submission page text
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-brand-muted">
            Heading
          </span>
          <input
            value={draft.submitTitle}
            onChange={(e) => update({ submitTitle: e.target.value })}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 outline-none focus:border-brand-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-brand-muted">
            Intro paragraph
          </span>
          <textarea
            value={draft.submitIntro}
            onChange={(e) => update({ submitIntro: e.target.value })}
            rows={4}
            className="mt-1 w-full resize-none rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm outline-none focus:border-brand-primary"
          />
        </label>
      </div>

      {/* Questions */}
      <div>
        <div className="mb-2 text-xs font-semibold text-brand-muted">
          Questions ({draft.clues.length})
        </div>
        <div className="space-y-3">
          {draft.clues.map((clue, i) => (
            <div
              key={clue.key}
              className="rounded-xl border border-brand-border bg-brand-surface p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={clue.emoji}
                  onChange={(e) => updateClue(i, { emoji: e.target.value })}
                  aria-label="emoji"
                  className="w-12 rounded-lg border border-brand-border bg-brand-bg px-2 py-2 text-center outline-none focus:border-brand-primary"
                />
                <input
                  value={clue.label}
                  onChange={(e) => updateClue(i, { label: e.target.value })}
                  placeholder="Short label (e.g. Their desk)"
                  className="min-w-[8rem] flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 outline-none focus:border-brand-primary"
                />
                <select
                  value={clue.type}
                  onChange={(e) =>
                    updateClue(i, { type: e.target.value as Clue["type"] })
                  }
                  className="rounded-lg border border-brand-border bg-brand-bg px-2 py-2 outline-none focus:border-brand-primary"
                >
                  <option value="image">📷 Photo</option>
                  <option value="text">💬 Text</option>
                </select>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveClue(i, -1)}
                    disabled={i === 0}
                    className="rounded-lg border border-brand-border px-2 py-1.5 text-sm disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveClue(i, 1)}
                    disabled={i === draft.clues.length - 1}
                    className="rounded-lg border border-brand-border px-2 py-1.5 text-sm disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeClue(i)}
                    className="rounded-lg border border-red-200 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    title="Delete question"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <input
                value={clue.prompt}
                onChange={(e) => updateClue(i, { prompt: e.target.value })}
                placeholder="Full question shown on the form"
                className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />
            </div>
          ))}
        </div>
        <button
          onClick={addClue}
          className="mt-3 rounded-full border border-brand-border px-4 py-2 text-sm font-medium hover:border-brand-primary"
        >
          + Add question
        </button>
      </div>

      {/* "How it works" steps (shown on the home page, numbered automatically) */}
      <div>
        <div className="mb-2 text-xs font-semibold text-brand-muted">
          &ldquo;How it works&rdquo; steps ({draft.howItWorks.length})
        </div>
        <div className="space-y-2">
          {draft.howItWorks.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-sm font-semibold text-brand-muted">
                {i + 1}.
              </span>
              <input
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder="Describe this step…"
                className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />
              <button
                onClick={() => moveStep(i, -1)}
                disabled={i === 0}
                className="rounded-lg border border-brand-border px-2 py-1.5 text-sm disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => moveStep(i, 1)}
                disabled={i === draft.howItWorks.length - 1}
                className="rounded-lg border border-brand-border px-2 py-1.5 text-sm disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => removeStep(i)}
                className="rounded-lg border border-red-200 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                title="Delete step"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addStep}
          className="mt-3 rounded-full border border-brand-border px-4 py-2 text-sm font-medium hover:border-brand-primary"
        >
          + Add step
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary rounded-full px-6 py-2.5 font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="text-sm font-medium text-brand-primary">
            Saved! Live for everyone. ✓
          </span>
        )}
      </div>
      <p className="text-xs text-brand-muted">
        Tip: renaming a question keeps any answers people already gave. Deleting
        or adding a question is safe too — old answers just stay hidden.
      </p>
    </div>
  );
}
