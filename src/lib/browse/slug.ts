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
