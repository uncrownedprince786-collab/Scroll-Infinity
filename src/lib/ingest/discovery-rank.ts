// Pure discovery ranking (no database imports, so it is unit-testable in
// isolation — mirrors how the source parsers stay pure and fixture-tested).
// The DB-facing collectors live in `discovery.ts` and call into this.

import type { SeedEntity } from "@/lib/data/seed";
import { normalizeText, slugify } from "@/lib/slug";

/** Keys that already identify an entity, so discovery never re-proposes one. */
export interface ExistingKeys {
  slugs: Set<string>;
  names: Set<string>;
}

/** A reference to a related entity, extracted from one entity's facts. */
export interface CandidateRef {
  /** Human label, e.g. "Tokyo". */
  label: string;
  /** Topic slugs of the entity that referenced it (inherited on discovery). */
  topicSlugs: string[];
}

/**
 * Rank candidate references into a bounded discovery list. Candidates that
 * already exist (by slug or normalized name) are dropped; the rest are ranked
 * by how many distinct entities reference them (centrality in the graph), and
 * each surviving candidate inherits the union of its referrers' topics. Pure
 * and deterministic so it can be tested without a database.
 */
export function rankDiscoveryCandidates(
  refs: CandidateRef[],
  existing: ExistingKeys,
  limit: number,
): SeedEntity[] {
  if (limit <= 0) return [];

  interface Agg {
    title: string;
    slug: string;
    referrers: number;
    topics: Set<string>;
  }
  const bySlug = new Map<string, Agg>();

  for (const ref of refs) {
    const title = ref.label.trim();
    if (title.length < 2) continue;
    const slug = slugify(title);
    if (!slug) continue;
    // Skip anything we already track, by slug or by normalized name.
    if (existing.slugs.has(slug) || existing.names.has(normalizeText(title))) continue;

    const agg = bySlug.get(slug) ?? { title, slug, referrers: 0, topics: new Set<string>() };
    agg.referrers += 1;
    for (const t of ref.topicSlugs) if (t) agg.topics.add(t);
    bySlug.set(slug, agg);
  }

  return [...bySlug.values()]
    .sort((a, b) => b.referrers - a.referrers || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((a) => ({ title: a.title, topics: [...a.topics] }));
}
