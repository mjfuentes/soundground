/** Slug + term-folding utilities shared by aggregation and the browse store. */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Merge key for raw genre/tag/city terms: lowercase, diacritics folded,
 * everything non-alphanumeric stripped — so "Dub Techno", "dubtechno" and
 * "dub-techno" all collapse to "dubtechno". Purely mechanical, no vocabulary.
 */
export function foldTerm(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Most frequent value wins; ties broken alphabetically for determinism. */
export function mostFrequent(counts: ReadonlyMap<string, number>): string | null {
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null
  );
}

/** Terms are stored lowercased; title-case them for display ("dub techno" → "Dub Techno"). */
export function titleCase(term: string): string {
  return term.replace(/[a-z0-9]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
