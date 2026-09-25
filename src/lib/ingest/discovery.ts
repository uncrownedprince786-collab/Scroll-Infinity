// Discovery: how the graph grows itself (spec sec. 17, 37, 48). Rather than an
// ever-expanding hardcoded list, each run (a) refreshes the entities that have
// gone longest without verification, and (b) proposes a few genuinely related
// new entities drawn from what the existing graph already references — the
// entity-valued Wikidata facts we have already resolved to real labels (a
// country's capital, a mountain's location, ...). Candidates are always run
// through the same quality gate as seeds, so discovery cannot mint thin pages.
//
// The pure ranking logic lives in `discovery-rank.ts` (unit-tested there); this
// module is the database-facing half.

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { entities, entityAliases, entityAttributes, topicEntities, topics } from "@/db/schema";
import type { SeedEntity } from "@/lib/data/seed";
import { normalizeText, slugify } from "@/lib/slug";
import {
  rankDiscoveryCandidates,
  type CandidateRef,
  type ExistingKeys,
} from "@/lib/ingest/discovery-rank";

export type { CandidateRef, ExistingKeys } from "@/lib/ingest/discovery-rank";
export { rankDiscoveryCandidates } from "@/lib/ingest/discovery-rank";

/** Slugs, normalized names and normalized aliases of every stored entity. */
export async function collectExistingKeys(): Promise<ExistingKeys> {
  const [entityRows, aliasRows] = [
    await db.select({ slug: entities.slug, name: entities.name }).from(entities),
    await db.select({ normalized: entityAliases.normalized }).from(entityAliases),
  ];
  const slugs = new Set<string>();
  const names = new Set<string>();
  for (const r of entityRows) {
    slugs.add(r.slug);
    names.add(normalizeText(r.name));
  }
  for (const r of aliasRows) names.add(r.normalized);
  return { slugs, names };
}

/**
 * The `limit` entities that have gone longest without verification, as seeds to
 * re-ingest (freshness by staleness — spec sec. 37). Uses the resolved name as
 * the Wikipedia title (titles resolve through the Action API with redirects).
 */
export async function collectStaleSeeds(limit: number): Promise<SeedEntity[]> {
  if (limit <= 0) return [];
  const rows = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .orderBy(asc(entities.lastVerifiedAt))
    .limit(limit);
  if (rows.length === 0) return [];

  const topicsByEntity = new Map<number, string[]>();
  const topicRows = await db
    .select({ entityId: topicEntities.entityId, slug: topics.slug, sortOrder: topics.sortOrder })
    .from(topicEntities)
    .innerJoin(topics, eq(topics.id, topicEntities.topicId))
    .orderBy(asc(topics.sortOrder));
  for (const r of topicRows) {
    const arr = topicsByEntity.get(r.entityId) ?? [];
    arr.push(r.slug);
    topicsByEntity.set(r.entityId, arr);
  }

  return rows.map((r) => ({ title: r.name, topics: topicsByEntity.get(r.id) ?? [] }));
}

/**
 * Propose up to `limit` new entities from the entity-valued attributes already
 * stored on indexable entities. Each stored value may join several labels
 * ("English, French"), so values are split before ranking.
 */
export async function collectDiscoverySeeds(
  limit: number,
  existing: ExistingKeys,
): Promise<SeedEntity[]> {
  if (limit <= 0) return [];

  const rows = await db
    .select({
      entityId: entityAttributes.entityId,
      value: entityAttributes.value,
      topicSlug: topics.slug,
    })
    .from(entityAttributes)
    .innerJoin(entities, eq(entities.id, entityAttributes.entityId))
    .innerJoin(topicEntities, eq(topicEntities.entityId, entities.id))
    .innerJoin(topics, eq(topics.id, topicEntities.topicId))
    // Anchor discovery to quality data: only draw candidates from the facts of
    // entities that passed the quality gate (spec sec. 21).
    .where(and(eq(entityAttributes.kind, "entity"), eq(entities.indexable, true)));

  // Topics per referring entity (an entity can sit under several topics).
  const topicsByEntity = new Map<number, Set<string>>();
  for (const r of rows) {
    const set = topicsByEntity.get(r.entityId) ?? new Set<string>();
    set.add(r.topicSlug);
    topicsByEntity.set(r.entityId, set);
  }

  // One CandidateRef per (referring entity, referenced label): a label counts
  // once per entity that references it, so shared references rank higher.
  const seenPerEntity = new Set<string>();
  const refs: CandidateRef[] = [];
  for (const r of rows) {
    for (const part of r.value.split(",")) {
      const label = part.trim();
      if (label.length < 2) continue;
      const dedupKey = `${r.entityId}::${slugify(label)}`;
      if (seenPerEntity.has(dedupKey)) continue;
      seenPerEntity.add(dedupKey);
      refs.push({ label, topicSlugs: [...(topicsByEntity.get(r.entityId) ?? [])] });
    }
  }

  return rankDiscoveryCandidates(refs, existing, limit);
}
