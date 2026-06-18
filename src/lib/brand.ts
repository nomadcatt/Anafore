// ─────────────────────────────────────────────────────────────────────────────
// COMPANY BRANDING — edit this file to match your brand.
//
// 1. Replace the text below (company name, game title, tagline).
// 2. Drop your logo file into the `public/` folder and update `logoSrc`.
// 3. Set your brand colors here AND in `src/app/globals.css` (the --brand-* vars).
//    Use your official hex codes (e.g. "#0F62FE").
// ─────────────────────────────────────────────────────────────────────────────

export const brand = {
  /** Your company name — shown in the header and footer. */
  companyName: "Anafore",

  /** The name of the game — shown big on the landing page. */
  gameTitle: "Guess Who?",

  /** A short, fun subtitle for the landing page. */
  tagline: "Six clues. One mystery coworker. Can you guess who?",

  /**
   * Path to your logo, relative to the `public/` folder.
   * Example: put `logo.png` in `public/` and set this to "/logo.png".
   * Leave as "" to show the company name as text instead.
   */
  logoSrc: "/anafore-logomark.png",

  /**
   * Set true only if your logo image already includes the company name
   * (a "wordmark"). If your logo is just an icon, leave this false so the
   * name is shown next to it.
   */
  logoIncludesName: false,

  /** Pixel height of the logo in the header (keeps aspect ratio). */
  logoHeight: 32,

  /**
   * Show 3 fake sample people in demo mode (before Supabase is set up) so the
   * game has something to display. Set to `false` to start with a clean,
   * empty game while you test your own setup. Has no effect once Supabase is
   * connected (then only real submissions show).
   */
  showSampleData: true,

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │  THE QUESTIONS / GAME STRUCTURE — edit this list to change the game.  │
   * └─────────────────────────────────────────────────────────────────────┘
   * Each entry is one prompt people can submit and one clue the room guesses.
   * You can add, remove, reorder, or reword them freely.
   *
   *   key    : a short unique id, lowercase, no spaces (e.g. "pet", "hometown").
   *            ⚠️ If you change keys after people have submitted, reset the
   *            submissions (Admin page → Reset) so old/new data don't mix.
   *   type   : "image" = photo upload  ·  "text" = a typed answer
   *   label  : short title shown on the game screen
   *   emoji  : a fun icon for the clue
   *   prompt : the full question shown on the submission form
   *
   * Example of adding a 5th question:
   *   { key: "pet", type: "image", label: "Their pet", emoji: "🐾", prompt: "A photo of your pet" },
   */
  clues: [
    { key: "desk", type: "image", label: "Their desk", emoji: "🖥️", prompt: "A photo of your desk / workspace" },
    { key: "travel", type: "image", label: "Favorite travel spot", emoji: "✈️", prompt: "A fun travel photo from somewhere you've been" },
    { key: "fashion", type: "text", label: "Fashion style", emoji: "👗", prompt: "Describe your fashion style in 5 words or less" },
    { key: "talent", type: "text", label: "Newest talent / hobby", emoji: "✨", prompt: "What is your newest talent or hobby?" },
    { key: "quote", type: "text", label: "Favorite quote", emoji: "💬", prompt: "Your favorite quote" },
    { key: "album", type: "image", label: "Favorite album", emoji: "🎵", prompt: "A photo of your favorite music album cover" },
  ] as const,
};

export type ClueKey = (typeof brand.clues)[number]["key"];
