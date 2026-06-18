"use client";

import { useEffect, useState } from "react";
import { brand } from "./brand";
import {
  isSupabaseConfigured,
  supabase,
  CONFIG_TABLE,
  CONFIG_ID,
} from "./supabase";

// ─────────────────────────────────────────────────────────────────────────────
// EDITABLE APP CONFIG
// The questions, min-answers, title, and tagline live in the database so they
// can be edited from the /admin page with no code change or redeploy. The
// values in brand.ts act as the built-in defaults / first-run seed.
// ─────────────────────────────────────────────────────────────────────────────

export type ClueType = "image" | "text";

export type Clue = {
  key: string;
  type: ClueType;
  label: string;
  emoji: string;
  prompt: string;
};

export type AppConfig = {
  companyName: string;
  gameTitle: string;
  tagline: string;
  submitTitle: string;
  submitIntro: string;
  minAnswers: number;
  clues: Clue[];
  howItWorks: string[];
};

export const DEFAULT_CONFIG: AppConfig = {
  companyName: brand.companyName,
  gameTitle: brand.gameTitle,
  tagline: brand.tagline,
  submitTitle: brand.submitTitle,
  submitIntro: brand.submitIntro,
  minAnswers: brand.minAnswers,
  clues: brand.clues.map((c) => ({ ...c })) as Clue[],
  howItWorks: [...brand.howItWorks],
};

const DEMO_KEY = "ahg.config";

function normalize(partial: Partial<AppConfig> | null | undefined): AppConfig {
  const c = partial ?? {};
  const clues = Array.isArray(c.clues) && c.clues.length > 0
    ? c.clues
    : DEFAULT_CONFIG.clues;
  return {
    companyName: c.companyName ?? DEFAULT_CONFIG.companyName,
    gameTitle: c.gameTitle ?? DEFAULT_CONFIG.gameTitle,
    tagline: c.tagline ?? DEFAULT_CONFIG.tagline,
    submitTitle: c.submitTitle ?? DEFAULT_CONFIG.submitTitle,
    submitIntro: c.submitIntro ?? DEFAULT_CONFIG.submitIntro,
    minAnswers:
      typeof c.minAnswers === "number" && c.minAnswers >= 1
        ? c.minAnswers
        : DEFAULT_CONFIG.minAnswers,
    clues: clues.map((x) => ({
      key: x.key,
      type: x.type === "text" ? "text" : "image",
      label: x.label ?? "",
      emoji: x.emoji ?? "",
      prompt: x.prompt ?? "",
    })),
    howItWorks: Array.isArray(c.howItWorks)
      ? c.howItWorks.filter((s): s is string => typeof s === "string")
      : DEFAULT_CONFIG.howItWorks,
  };
}

/** Loads the active config (DB values over built-in defaults). */
export async function getConfig(): Promise<AppConfig> {
  if (!isSupabaseConfigured || !supabase) {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    const raw = window.localStorage.getItem(DEMO_KEY);
    if (!raw) return DEFAULT_CONFIG;
    try {
      return normalize(JSON.parse(raw) as Partial<AppConfig>);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  const { data, error } = await supabase
    .from(CONFIG_TABLE)
    .select("config")
    .eq("id", CONFIG_ID)
    .maybeSingle();
  if (error) return DEFAULT_CONFIG;
  return normalize(data?.config as Partial<AppConfig>);
}

/** Saves the config (used by the admin editor). Takes effect for everyone. */
export async function saveConfig(config: AppConfig): Promise<void> {
  const clean = normalize(config);
  if (!isSupabaseConfigured || !supabase) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_KEY, JSON.stringify(clean));
    }
    return;
  }
  const { error } = await supabase
    .from(CONFIG_TABLE)
    .upsert({ id: CONFIG_ID, config: clean, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save settings: ${error.message}`);
}

/**
 * Resets all editable settings (questions, min-answers, titles, submit text,
 * how-it-works) back to the built-in defaults from brand.ts. Used by the
 * admin "reset from scratch" action.
 */
export async function resetConfig(): Promise<void> {
  await saveConfig(DEFAULT_CONFIG);
}

/**
 * React hook: returns the active config. Starts from the built-in defaults
 * (so there's never an empty flash), then loads any saved overrides.
 */
export function useConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  useEffect(() => {
    let alive = true;
    getConfig().then((c) => {
      if (alive) setConfig(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

/** Make a unique key for a brand-new question. */
export function newClueKey(): string {
  return "q_" + Math.random().toString(36).slice(2, 8);
}
