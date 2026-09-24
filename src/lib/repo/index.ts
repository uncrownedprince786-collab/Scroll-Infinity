// Repository: the single read API the pages render from. All public reads
// filter to published/indexable entities so the page-quality gate (spec sec.
// 21) is enforced at the data layer — a URL that exists in the DB is not
// served unless it passed the gate.

import "server-only";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import {
  changes,
  entities,
  entityAliases,
  entityAttributes,
  entityRelationships,
  searchQueries,
  topicEntities,
  topics,
} from "@/db/schema";
import type {
  AttributeValue,
  Entity,
  EntitySummary,
  ImageRef,
  RecentChange,
  SearchResult,
  SiteStats,
  SourceRef,
  Topic,
  VerificationState,
} from "@/lib/types";
import { normalizeText } from "@/lib/slug";

export type { SiteStats, RecentChange } from "@/lib/types";

const PUBLIC_STATES = ["published", "indexable"] as const;

type EntityCoreRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  verification: VerificationState;
  imageUrl: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  updatedAt: Date;
};

const ENTITY_CORE_COLUMNS = {
  id: entities.id,
  slug: entities.slug,
  name: entities.name,
  description: entities.description,
  verification: entities.verification,
  imageUrl: entities.imageUrl,
  imageAlt: entities.imageAlt,
  imageWidth: entities.imageWidth,
  imageHeight: entities.imageHeight,
  updatedAt: entities.updatedAt,
} as const;

function toImage(row: {
  imageUrl: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  name: string;
}): ImageRef | null {
  if (!row.imageUrl) return null;
  return {
    url: row.imageUrl,
    alt: row.imageAlt ?? row.name,
    width: row.imageWidth ?? undefined,
    height: row.imageHeight ?? undefined,
  };
}

async function topicSlugsByEntityIds(
  ids: number[],
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      entityId: topicEntities.entityId,
      slug: topics.slug,
      sortOrder: topics.sortOrder,
    })
    .from(topicEntities)
    .innerJoin(topics, eq(topics.id, topicEntities.topicId))
    .where(inArray(topicEntities.entityId, ids))
    .orderBy(asc(topics.sortOrder));
  for (const r of rows) {
    const arr = map.get(r.entityId) ?? [];
    arr.push(r.slug);
    map.set(r.entityId, arr);
  }
  return map;
}

async function toSummaries(rows: EntityCoreRow[]): Promise<EntitySummary[]> {
  const topicMap = await topicSlugsByEntityIds(rows.map((r) => r.id));
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    topicSlugs: topicMap.get(r.id) ?? [],
    primaryImage: toImage(r),
    verification: r.verification,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

// --- Topics ----------------------------------------------------------------

export async function listTopics(): Promise<Topic[]> {
  const rows = await db
    .select({
      slug: topics.slug,
      name: topics.name,
      description: topics.description,
      sortOrder: topics.sortOrder,
      entityCount: countDistinct(entities.id),
    })
    .from(topics)
    .leftJoin(topicEntities, eq(topicEntities.topicId, topics.id))
    .leftJoin(
      entities,
      and(eq(entities.id, topicEntities.entityId), eq(entities.indexable, true)),
    )
    .groupBy(topics.id, topics.slug, topics.name, topics.description, topics.sortOrder)
    .orderBy(asc(topics.sortOrder));
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    entityCount: Number(r.entityCount),
    sortOrder: r.sortOrder,
  }));
}

export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  const topicRows = await listTopics();
  return topicRows.find((t) => t.slug === slug) ?? null;
}

export async function listEntitiesByTopic(
  topicSlug: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<EntitySummary[]> {
  const rows = await db
    .select(ENTITY_CORE_COLUMNS)
    .from(entities)
    .innerJoin(topicEntities, eq(topicEntities.entityId, entities.id))
    .innerJoin(topics, eq(topics.id, topicEntities.topicId))
    .where(and(eq(topics.slug, topicSlug), eq(entities.indexable, true)))
    .orderBy(desc(entities.qualityScore), asc(entities.name))
    .limit(opts.limit ?? 60)
    .offset(opts.offset ?? 0);
  return toSummaries(rows);
}

// --- Entities --------------------------------------------------------------

export async function listEntities(
  opts: { limit?: number; offset?: number; orderBy?: "updated" | "name" } = {},
): Promise<EntitySummary[]> {
  const order =
    opts.orderBy === "name"
      ? asc(entities.name)
      : desc(entities.updatedAt);
  const rows = await db
    .select(ENTITY_CORE_COLUMNS)
    .from(entities)
    .where(eq(entities.indexable, true))
    .orderBy(order)
    .limit(opts.limit ?? 60)
    .offset(opts.offset ?? 0);
  return toSummaries(rows);
}

export async function getRecentlyUpdated(limit = 8): Promise<EntitySummary[]> {
  return listEntities({ limit, orderBy: "updated" });
}

export async function getFeaturedEntities(limit = 6): Promise<EntitySummary[]> {
  const rows = await db
    .select(ENTITY_CORE_COLUMNS)
    .from(entities)
    .where(and(eq(entities.indexable, true), sql`${entities.imageUrl} is not null`))
    .orderBy(desc(entities.qualityScore), desc(entities.updatedAt))
    .limit(limit);
  return toSummaries(rows);
}

export async function getEntityBySlug(slug: string): Promise<Entity | null> {
  const [ent] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.slug, slug), inArray(entities.pageState, [...PUBLIC_STATES])))
    .limit(1);
  if (!ent) return null;

  const [attrRows, aliasRows, topicRows, changeRows, relRows] = [
    await db
      .select()
      .from(entityAttributes)
      .where(eq(entityAttributes.entityId, ent.id))
      .orderBy(asc(entityAttributes.label)),
    await db
      .select({ alias: entityAliases.alias })
      .from(entityAliases)
      .where(eq(entityAliases.entityId, ent.id)),
    await db
      .select({ slug: topics.slug })
      .from(topicEntities)
      .innerJoin(topics, eq(topics.id, topicEntities.topicId))
      .where(eq(topicEntities.entityId, ent.id))
      .orderBy(asc(topics.sortOrder)),
    await db
      .select()
      .from(changes)
      .where(eq(changes.entityId, ent.id))
      .orderBy(desc(changes.changedAt))
      .limit(8),
    await db
      .select({
        slug: entities.slug,
        name: entities.name,
        description: entities.description,
        type: entityRelationships.type,
      })
      .from(entityRelationships)
      .innerJoin(entities, eq(entities.id, entityRelationships.toId))
      .where(and(eq(entityRelationships.fromId, ent.id), eq(entities.indexable, true)))
      .orderBy(desc(entityRelationships.weight))
      .limit(12),
  ];

  const attributes: AttributeValue[] = attrRows.map((a) => ({
    key: a.key,
    label: a.label,
    value: a.value,
    numeric: a.numeric ?? null,
    unit: a.unit ?? undefined,
    kind: a.kind as AttributeValue["kind"],
    verification: a.verification,
    provenance: (a.provenance ?? []) as SourceRef[],
    observedAt: a.observedAt.toISOString(),
  }));

  return {
    slug: ent.slug,
    name: ent.name,
    description: ent.description,
    topicSlugs: topicRows.map((t) => t.slug),
    primaryImage: toImage(ent),
    verification: ent.verification,
    updatedAt: ent.updatedAt.toISOString(),
    wikidataId: ent.wikidataId,
    aliases: aliasRows.map((a) => a.alias),
    longDescription: ent.longDescription,
    attributes,
    sources: deriveSources(ent, attributes),
    firstSeenAt: ent.firstSeenAt.toISOString(),
    lastVerifiedAt: ent.lastVerifiedAt.toISOString(),
    related: relRows.map((r) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      relationType: r.type,
    })),
    recentChanges: changeRows.map((c) => ({
      attributeKey: c.attributeKey,
      attributeLabel: c.attributeLabel,
      previousValue: c.previousValue,
      newValue: c.newValue,
      changedAt: c.changedAt.toISOString(),
      source: c.sourceKey,
    })),
  };
}

/** Union of the canonical source links with every attribute's provenance. */
function deriveSources(
  ent: { name: string; wikidataId: string | null; lastVerifiedAt: Date },
  attributes: AttributeValue[],
): SourceRef[] {
  const byKey = new Map<string, SourceRef>();
  const retrievedAt = ent.lastVerifiedAt.toISOString();
  byKey.set("wikipedia|base", {
    source: "wikipedia",
    sourceName: "Wikipedia",
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(ent.name.replace(/ /g, "_"))}`,
    retrievedAt,
    license: "CC BY-SA",
  });
  if (ent.wikidataId) {
    byKey.set("wikidata|base", {
      source: "wikidata",
      sourceName: "Wikidata",
      url: `https://www.wikidata.org/wiki/${ent.wikidataId}`,
      retrievedAt,
      license: "CC0",
    });
  }
  for (const attr of attributes) {
    for (const p of attr.provenance) {
      byKey.set(`${p.source}|${p.url}`, p);
    }
  }
  return [...byKey.values()];
}

// --- Search ----------------------------------------------------------------

export async function searchEntities(
  query: string,
  limit = 20,
): Promise<SearchResult[]> {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const prefix = `${q}%`;

  const scored = new Map<number, { row: EntityCoreRow; score: number }>();

  const direct = await db
    .select({
      ...ENTITY_CORE_COLUMNS,
      score: sql<number>`case
        when lower(${entities.name}) = ${q} then 100
        when lower(${entities.name}) like ${prefix} then 80
        when lower(${entities.name}) like ${like} then 60
        else 30 end`,
    })
    .from(entities)
    .where(
      and(
        eq(entities.indexable, true),
        or(ilike(entities.name, like), ilike(entities.description, like)),
      ),
    )
    .limit(limit * 2);
  for (const r of direct) {
    scored.set(r.id, { row: r, score: Number(r.score) });
  }

  const viaAlias = await db
    .select({ ...ENTITY_CORE_COLUMNS })
    .from(entities)
    .innerJoin(entityAliases, eq(entityAliases.entityId, entities.id))
    .where(and(eq(entities.indexable, true), ilike(entityAliases.normalized, like)))
    .limit(limit * 2);
  for (const r of viaAlias) {
    if (!scored.has(r.id)) scored.set(r.id, { row: r, score: 50 });
  }

  const ranked = [...scored.values()]
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name))
    .slice(0, limit);

  const topicMap = await topicSlugsByEntityIds(ranked.map((x) => x.row.id));
  return ranked.map(({ row, score }) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    topicSlugs: topicMap.get(row.id) ?? [],
    verification: row.verification,
    updatedAt: row.updatedAt.toISOString(),
    score,
  }));
}

export async function logSearchQuery(query: string, results: number): Promise<void> {
  const q = query.trim();
  if (!q) return;
  try {
    await db.insert(searchQueries).values({
      query: q.slice(0, 200),
      normalized: normalizeText(q).slice(0, 200),
      results,
    });
  } catch {
    // Logging must never break search.
  }
}

// --- Changes & stats -------------------------------------------------------

export async function getRecentChanges(limit = 10): Promise<RecentChange[]> {
  const rows = await db
    .select({
      entitySlug: entities.slug,
      entityName: entities.name,
      attributeKey: changes.attributeKey,
      attributeLabel: changes.attributeLabel,
      previousValue: changes.previousValue,
      newValue: changes.newValue,
      changedAt: changes.changedAt,
      source: changes.sourceKey,
    })
    .from(changes)
    .innerJoin(entities, eq(entities.id, changes.entityId))
    .where(eq(entities.indexable, true))
    .orderBy(desc(changes.changedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, changedAt: r.changedAt.toISOString() }));
}

export async function getStats(): Promise<SiteStats> {
  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [entityCount, topicCount, observationCount, verifiedCount, changeCount, lastUpdated] =
      [
        await db.select({ v: count() }).from(entities).where(eq(entities.indexable, true)),
        await db.select({ v: count() }).from(topics),
        await db.select({ v: count() }).from(entityAttributes),
        await db
          .select({ v: count() })
          .from(entityAttributes)
          .where(inArray(entityAttributes.verification, ["verified", "supported"])),
        await db
          .select({ v: count() })
          .from(changes)
          .where(gte(changes.changedAt, startOfDay)),
        await db
          .select({ v: sql<string | null>`max(${entities.updatedAt})` })
          .from(entities)
          .where(eq(entities.indexable, true)),
      ];

    const last = lastUpdated[0]?.v ?? null;
    return {
      entities: Number(entityCount[0]?.v ?? 0),
      topics: Number(topicCount[0]?.v ?? 0),
      observations: Number(observationCount[0]?.v ?? 0),
      verifiedFacts: Number(verifiedCount[0]?.v ?? 0),
      changesToday: Number(changeCount[0]?.v ?? 0),
      lastUpdatedAt: last ? new Date(last).toISOString() : null,
    };
  } catch {
    // Homepage must render even if the DB is briefly unavailable (spec sec. 39).
    return {
      entities: 0,
      topics: 0,
      observations: 0,
      verifiedFacts: 0,
      changesToday: 0,
      lastUpdatedAt: null,
    };
  }
}

// --- Sitemap / static params ----------------------------------------------

export async function getAllIndexableEntities(): Promise<
  Array<{ slug: string; updatedAt: string }>
> {
  const rows = await db
    .select({ slug: entities.slug, updatedAt: entities.updatedAt })
    .from(entities)
    .where(eq(entities.indexable, true))
    .orderBy(asc(entities.slug));
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
}

export async function getAllTopicSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: topics.slug }).from(topics).orderBy(asc(topics.sortOrder));
  return rows.map((r) => r.slug);
}
