/**
 * Convert arbitrary text into a URL-safe slug. Deterministic and reversible
 * enough for canonical entity/topic URLs.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/['’]/g, "") // drop apostrophes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Lowercase, whitespace-collapsed form used for alias/search normalisation. */
export function normalizeText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Wikidata item ids look like Q<number>. */
export function isValidWikidataId(id: string): boolean {
  return /^Q[1-9]\d*$/.test(id);
}
