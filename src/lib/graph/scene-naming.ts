/**
 * Scene auto-naming (ideas/0004 A2): c-TF-IDF over member genre terms with
 * scenes as documents. Term counts arrive pre-weighted by each member's
 * within-scene weighted in-degree — the defining artists name the scene.
 * A scene whose located members concentrate in one city gets a city prefix
 * ("Berlin Dub Techno"). Scenes with no distinctive vocabulary stay
 * unnamed (name: null) — never rendered as "Cluster #341".
 */

import { isFormatTerm } from "@/lib/browse/format-terms";
import { foldTerm, titleCase } from "@/lib/browse/slug";

export interface SceneDoc {
  /** Caller's cluster key; results are returned under it. */
  key: number;
  /** Folded term → weight (term evidence × member in-scene in-degree). */
  termWeights: ReadonlyMap<string, number>;
  /** Dominant city among located members, when known. */
  topCity: { name: string; share: number; locatedMembers: number } | null;
}

export interface SceneNamingConfig {
  /** Terms must appear in at least this many scenes to enter the vocabulary. */
  minDocFrequency: number;
  /**
   * …and in at most this fraction of scenes: a term most scenes carry
   * ("electronic" in a Berlin-seeded crawl) cannot define any one of them.
   */
  maxDocFraction: number;
  /** City prefix requires this share of located members… */
  cityShareThreshold: number;
  /** …and at least this many located members (2 of 3 is noise, not a scene home). */
  minLocatedMembers: number;
  /** At most this many terms in a name. */
  maxNameTerms: number;
  /** Extra name terms must score at least this fraction of the top term. */
  secondaryTermRatio: number;
  tagCount: number;
}

export const DEFAULT_SCENE_NAMING_CONFIG: SceneNamingConfig = {
  minDocFrequency: 3,
  maxDocFraction: 0.6,
  cityShareThreshold: 0.4,
  minLocatedMembers: 5,
  maxNameTerms: 3,
  secondaryTermRatio: 0.5,
  tagCount: 10,
};

export interface SceneName {
  name: string | null;
  tags: string[];
}

interface ScoredTerm {
  term: string;
  score: number;
}

/** "dubtechno" and "techno" are one idea; keep the higher-scored spelling. */
function isRedundant(candidate: string, chosen: readonly string[]): boolean {
  return chosen.some((term) => term.includes(candidate) || candidate.includes(term));
}

/**
 * Score every document's terms with class-based TF-IDF:
 * W(t,c) = (count(t,c) / total(c)) · log(1 + A / f(t)),
 * where f(t) is the term's total count across scenes and A the average
 * per-scene total — ubiquitous terms ("electronic") score near zero.
 */
function scoreDocs(
  docs: readonly SceneDoc[],
  vocabulary: ReadonlySet<string>,
): Map<number, ScoredTerm[]> {
  const termTotals = new Map<string, number>();
  let grandTotal = 0;
  for (const doc of docs) {
    for (const [term, weight] of doc.termWeights) {
      if (!vocabulary.has(term)) continue;
      termTotals.set(term, (termTotals.get(term) ?? 0) + weight);
      grandTotal += weight;
    }
  }
  const averageTotal = docs.length > 0 ? grandTotal / docs.length : 0;

  const scored = new Map<number, ScoredTerm[]>();
  for (const doc of docs) {
    const docTotal = [...doc.termWeights.entries()]
      .filter(([term]) => vocabulary.has(term))
      .reduce((sum, [, weight]) => sum + weight, 0);
    const terms: ScoredTerm[] = [];
    if (docTotal > 0) {
      for (const [term, weight] of doc.termWeights) {
        if (!vocabulary.has(term) || weight <= 0) continue;
        const tf = weight / docTotal;
        const idf = Math.log(1 + averageTotal / (termTotals.get(term) ?? 1));
        terms.push({ term, score: tf * idf });
      }
      terms.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));
    }
    scored.set(doc.key, terms);
  }
  return scored;
}

function buildVocabulary(
  docs: readonly SceneDoc[],
  config: SceneNamingConfig,
): Set<string> {
  const docFrequency = new Map<string, number>();
  for (const doc of docs) {
    for (const [term, weight] of doc.termWeights) {
      if (weight > 0) docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
    }
  }
  const maxDf = Math.max(config.minDocFrequency, config.maxDocFraction * docs.length);
  return new Set(
    [...docFrequency.entries()]
      .filter(
        ([term, df]) =>
          df >= config.minDocFrequency && df <= maxDf && !isFormatTerm(term),
      )
      .map(([term]) => term),
  );
}

function cityPrefix(doc: SceneDoc, config: SceneNamingConfig): string | null {
  const city = doc.topCity;
  if (!city) return null;
  if (city.share < config.cityShareThreshold) return null;
  if (city.locatedMembers < config.minLocatedMembers) return null;
  return city.name;
}

function composeName(
  terms: readonly ScoredTerm[],
  city: string | null,
  display: (term: string) => string,
  config: SceneNamingConfig,
): { name: string | null; nameTerms: string[] } {
  const cityFold = city ? foldTerm(city) : null;
  const chosen: string[] = [];
  for (const { term, score } of terms) {
    if (chosen.length >= config.maxNameTerms) break;
    if (term === cityFold) continue; // "Berlin Berlin Dub" — the prefix already says it
    if (isRedundant(term, chosen)) continue;
    if (chosen.length > 0 && score < terms[0].score * config.secondaryTermRatio) break;
    chosen.push(term);
  }
  if (chosen.length === 0) return { name: null, nameTerms: [] };
  const joined = chosen.map(display).join(" · ");
  return { name: city ? `${city} ${joined}` : joined, nameTerms: chosen };
}

/**
 * Name every scene. `display` renders a folded term for humans (most
 * frequent raw spelling, title-cased) — the caller owns spelling data.
 */
export function nameScenes(
  docs: readonly SceneDoc[],
  display: (term: string) => string,
  config: SceneNamingConfig = DEFAULT_SCENE_NAMING_CONFIG,
): Map<number, SceneName> {
  const vocabulary = buildVocabulary(docs, config);
  const scored = scoreDocs(docs, vocabulary);

  const results = new Map<number, SceneName>();
  for (const doc of docs) {
    const terms = scored.get(doc.key) ?? [];
    const { name } = composeName(terms, cityPrefix(doc, config), display, config);
    results.set(doc.key, {
      name,
      tags: terms.slice(0, config.tagCount).map(({ term }) => display(term)),
    });
  }
  return results;
}

/** Default display: title-cased fold key — callers should map spellings instead. */
export const displayFromSpellings =
  (spellings: ReadonlyMap<string, string>) =>
  (term: string): string =>
    spellings.get(term) ?? titleCase(term);
