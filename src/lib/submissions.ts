import { brand } from "./brand";
import {
  isSupabaseConfigured,
  supabase,
  PHOTO_BUCKET,
  SUBMISSIONS_TABLE,
} from "./supabase";

export type Submission = {
  id: string;
  name: string;
  createdAt: string;
  /** Map of clue key -> value (an image URL or a piece of text). */
  clues: Record<string, string>;
};

// ─── Demo mode (no Supabase configured) ─────────────────────────────────────
// Stores submissions in the browser so you can build and play immediately.
// Switches off automatically once Supabase env vars are set.

const DEMO_KEY = "ahg.demo.submissions";

const DEMO_SEED: Submission[] = [
  {
    id: "seed-1",
    name: "Sample Sam",
    createdAt: new Date().toISOString(),
    clues: {
      desk: "https://picsum.photos/seed/desk1/800/600",
      quote: "Stay hungry, stay foolish.",
      album: "https://picsum.photos/seed/album1/600/600",
      travel: "https://picsum.photos/seed/travel1/800/600",
    },
  },
  {
    id: "seed-2",
    name: "Demo Dana",
    createdAt: new Date().toISOString(),
    clues: {
      desk: "https://picsum.photos/seed/desk2/800/600",
      quote: "The best way out is always through.",
      album: "https://picsum.photos/seed/album2/600/600",
      travel: "https://picsum.photos/seed/travel2/800/600",
    },
  },
  {
    id: "seed-3",
    name: "Test Taylor",
    createdAt: new Date().toISOString(),
    clues: {
      desk: "https://picsum.photos/seed/desk3/800/600",
      quote: "Do small things with great love.",
      album: "https://picsum.photos/seed/album3/600/600",
      travel: "https://picsum.photos/seed/travel3/800/600",
    },
  },
];

function readDemo(): Submission[] {
  const seed = brand.showSampleData ? DEMO_SEED : [];
  if (typeof window === "undefined") return seed;
  const raw = window.localStorage.getItem(DEMO_KEY);
  let stored: Submission[] = [];
  if (raw) {
    try {
      stored = JSON.parse(raw) as Submission[];
    } catch {
      stored = [];
    }
  }
  // Once there are real submissions, only show those (sample people drop out).
  // After a reset, fall back to the sample people unless they're turned off.
  return stored.length > 0 ? stored : seed;
}

function writeDemo(sub: Submission) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(DEMO_KEY);
  const stored = raw ? (JSON.parse(raw) as Submission[]) : [];
  stored.push(sub);
  window.localStorage.setItem(DEMO_KEY, JSON.stringify(stored));
}

// ─── Public API (works in both demo and Supabase mode) ──────────────────────

/** Uploads a photo and returns a public URL to it. */
export async function uploadPhoto(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    // Demo mode: keep the image inline as a data URL.
    return await fileToDataUrl(file);
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Saves one person's submission. */
export async function addSubmission(
  name: string,
  clues: Record<string, string>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    writeDemo({
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      clues,
    });
    return;
  }
  const { error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .insert({ name, clues });
  if (error) throw new Error(`Could not save submission: ${error.message}`);
}

/** Returns all submissions (newest last). */
export async function getSubmissions(): Promise<Submission[]> {
  if (!isSupabaseConfigured || !supabase) {
    return readDemo();
  }
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("id, name, clues, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load submissions: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: row.name as string,
    createdAt: row.created_at as string,
    clues: (row.clues ?? {}) as Record<string, string>,
  }));
}

/**
 * Returns just the list of participant names (the guessing options) — without
 * which clues belong to whom. Safe to load on voters' phones so it doesn't
 * reveal the answers.
 */
export async function getCandidateNames(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) {
    return Array.from(new Set(readDemo().map((s) => s.name)));
  }
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("name")
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load names: ${error.message}`);
  return Array.from(new Set((data ?? []).map((r) => r.name as string)));
}

/** Deletes ALL submissions. Used by the organizer's reset button. */
export async function clearSubmissions(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_KEY);
    }
    return;
  }
  // Requires a delete policy on the table (see GAME-SETUP.md). If you'd rather,
  // you can instead reset from the Supabase dashboard with: truncate submissions;
  const { error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .delete()
    .not("id", "is", null);
  if (error) {
    throw new Error(
      `Could not clear submissions: ${error.message}. You can also reset from the Supabase dashboard (SQL: truncate ${SUBMISSIONS_TABLE};).`
    );
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
