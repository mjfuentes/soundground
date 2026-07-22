import { foldTerm } from "./slug";

/**
 * Non-genre platform vocabulary, excluded from genre discovery and scene
 * naming. Two mechanical sources — deliberately NOT genre-taxonomy curation:
 *
 * 1. Distribution-format noise artists put in genre fields ("podcast"
 *    declared by 121 artists in the Berlin crawl).
 * 2. SoundCloud's own fixed non-music category enum (the podcast categories:
 *    Learning, Religion & Spirituality, …) — a platform constant, not scene
 *    vocabulary. Genre vocabulary itself stays fully data-driven.
 */
export const FORMAT_TERMS: ReadonlySet<string> = new Set(
  [
    "podcast", "mix", "dj mix", "dj set", "live", "live set", "radio",
    "radio show", "premiere", "music", "free download", "promo", "demo",
    "snippet", "preview", "exclusive", "mixtape", "mastering", "recording",
    "interview", "talk", "talkshow",
    // SoundCloud's non-music podcast categories
    "audiobooks", "business", "comedy", "entertainment", "learning",
    "news & politics", "religion & spirituality", "science", "sports",
    "storytelling", "technology",
  ].map(foldTerm),
);

/** Bare function words that survive folding ("The", "Of") are never vocabulary. */
const STOP_WORDS: ReadonlySet<string> = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from",
]);

/**
 * A term that is platform noise rather than scene vocabulary: on the
 * stoplist, a bare stopword, or purely numeric ("2026" the year tag —
 * but "2step" survives).
 */
export function isFormatTerm(foldedTerm: string): boolean {
  return (
    FORMAT_TERMS.has(foldedTerm) || STOP_WORDS.has(foldedTerm) || /^[0-9]+$/.test(foldedTerm)
  );
}
