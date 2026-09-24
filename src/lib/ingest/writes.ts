// Idempotent database writes and change detection (spec sec. 20). Every helper
// here is safe to re-run: entities match by slug, joins upsert, and the
// append-only observations archive plus the changes log record history without
// duplicating current state. Freshness is honest — an entity's updatedAt only
// moves when its content actually changes; lastVerifiedAt records every check.

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  changes,
  entities,
  entityAliases,
  entityAttributes,
  entityRelationships,
  observations,
  sourceFetches,
  sources,
  systemEvents,
  topicEntities,
  topics,
} from "@/db/schema";
import type { AttributeValue, VerificationState } from "@/lib/types";
import type { FetchResult } from "@/lib/sources/base";
import type { QualityResult } from "@/lib/quality";
import { contentHash, sha256 } from "@/lib/hash";
import { normalizeText } from "@/lib/slug";
import { seedTopics } from "@/lib/data/seed";

export interface EntityImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface EntityCandidate {
  slug: string;
  name: string;
  description: string;
  longDescription?: string | null;
  wikidataId?: string | null;
  image?: EntityImage | null;
  verification: VerificationState;
  attributes: AttributeValue[];
}

// --- Seeds: topics & sources ----------------------------------------------

/** Upsert the seed topics and return a slug → id map. */
export async function ensureTopics(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const t of seedTopics) {
    const [row] = await db
      .insert(topics)
      .values({ slug: t.slug, name: t.name, description: t.description, sortOrder: t.sortOrder })
      .onConflictDoUpdate({
        target: topics.slug,
        set: { name: t.name, description: t.description, sortOrder: t.sortOrder },
      })
      .returning({ id: topics.id, slug: topics.slug });
    if (row) map.set(row.slug, row.id);
  }
  return map;
}

/** Upsert the two data sources this layer writes provenance for. */
export async function ensureSources(): Promise<void> {
  const now = new Date();
  const rows = [
    {
      key: "wikipedia",
      name: "Wikipedia",
      homepage: "https://en.wikipedia.org",
      license: "CC BY-SA",
      trust: 80,
      parserVersion: "1",
    },
    {
      key: "wikidata",
      name: "Wikidata",
      homepage: "https://www.wikidata.org",
      license: "CC0",
      trust: 85,
      parserVersion: "1",
    },
  ];
  for (const r of rows) {
    await db
      .insert(sources)
      .values(r)
      .onConflictDoUpdate({
        target: sources.key,
        set: {
          name: r.name,
          homepage: r.homepage,
          license: r.license,
          trust: r.trust,
          parserVersion: r.parserVersion,
          updatedAt: now,
        },
      });
  }
}

// --- Fetch bookkeeping -----------------------------------------------------

/** Record one source fetch and roll its health forward. Returns the fetch id. */
export async function recordFetch(
  fetch: FetchResult,
  sourceKey: string,
  parserVersion = "1",
): Promise<number | null> {
  try {
    const [row] = await db
      .insert(sourceFetches)
      .values({
        sourceKey,
        url: fetch.url,
        httpStatus: fetch.status,
        ok: fetch.ok,
        contentHash: fetch.contentHash || null,
        parserVersion,
        bytes: fetch.bytes,
        error: fetch.error ?? null,
      })
      .returning({ id: sourceFetches.id });

    const now = new Date();
    if (fetch.ok) {
      await db
        .update(sources)
        .set({ lastSuccessAt: now, health: "healthy", errorCount: 0, updatedAt: now })
        .where(eq(sources.key, sourceKey));
    } else {
      await db
        .update(sources)
        .set({
          lastErrorAt: now,
          errorCount: sql`${sources.errorCount} + 1`,
          health: "degraded",
          updatedAt: now,
        })
        .where(eq(sources.key, sourceKey));
    }
    return row?.id ?? null;
  } catch (err) {
    await logEvent("error", "recordFetch.failed", { sourceKey, error: String(err) });
    return null;
  }
}

// --- Entity core -----------------------------------------------------------

/**
 * Insert or update an entity matched by slug. Returns whether it was newly
 * created and its previous content hash so the caller can detect change.
 */
export async function upsertEntity(
  candidate: EntityCandidate,
): Promise<{ id: number; isNew: boolean; prevContentHash: string | null; contentHash: string }> {
  const now = new Date();
  const hash = contentHash({
    description: candidate.description,
    longDescription: candidate.longDescription ?? null,
    image: candidate.image ?? null,
    attributes: candidate.attributes.map((a) => ({ key: a.key, value: a.value })),
  });

  const [existing] = await db
    .select({ id: entities.id, contentHash: entities.contentHash })
    .from(entities)
    .where(eq(entities.slug, candidate.slug))
    .limit(1);

  const image = candidate.image ?? null;
  const common = {
    name: candidate.name,
    description: candidate.description,
    longDescription: candidate.longDescription ?? null,
    wikidataId: candidate.wikidataId ?? null,
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt ?? null,
    imageWidth: image?.width ?? null,
    imageHeight: image?.height ?? null,
    verification: candidate.verification,
    contentHash: hash,
    lastVerifiedAt: now,
  };

  if (!existing) {
    const [row] = await db
      .insert(entities)
      .values({ slug: candidate.slug, ...common, firstSeenAt: now, updatedAt: now })
      .returning({ id: entities.id });
    return { id: row.id, isNew: true, prevContentHash: null, contentHash: hash };
  }

  const contentChanged = existing.contentHash !== hash;
  await db
    .update(entities)
    .set({ ...common, ...(contentChanged ? { updatedAt: now } : {}) })
    .where(eq(entities.id, existing.id));
  return { id: existing.id, isNew: false, prevContentHash: existing.contentHash ?? null, contentHash: hash };
}

/** Insert aliases, ignoring ones already present (unique on entity+normalized). */
export async function setAliases(entityId: number, aliases: string[]): Promise<void> {
  const rows: Array<{ entityId: number; alias: string; normalized: string; source: string }> = [];
  const seen = new Set<string>();
  for (const raw of aliases) {
    const alias = raw?.trim();
    if (!alias) continue;
    const normalized = normalizeText(alias);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    rows.push({ entityId, alias, normalized, source: "wikidata" });
  }
  if (rows.length === 0) return;
  await db
    .insert(entityAliases)
    .values(rows)
    .onConflictDoNothing({ target: [entityAliases.entityId, entityAliases.normalized] });
}

/**
 * Apply an entity's attributes: archive every value as an observation, upsert
 * the current entity_attributes row, and log a change when a value differs from
 * what was stored before (never for a brand-new entity). Returns whether any
 * attribute-level change was logged.
 */
export async function applyAttributes(
  entityId: number,
  isNewEntity: boolean,
  attributes: AttributeValue[],
  sourceUrlByKey: Record<string, string> | undefined,
  fetchId: number | null,
): Promise<{ changed: boolean }> {
  let changed = false;
  for (const attr of attributes) {
    const sourceKey = attr.provenance[0]?.source ?? "wikidata";
    const sourceUrl = sourceUrlByKey?.[attr.key] ?? attr.provenance[0]?.url ?? "";
    const numeric = attr.numeric ?? null;
    const unit = attr.unit ?? null;
    const observedAt = attr.observedAt ? new Date(attr.observedAt) : new Date();

    // (a) append-only archive
    await db.insert(observations).values({
      entityId,
      attributeKey: attr.key,
      value: attr.value,
      numeric,
      unit,
      sourceKey,
      sourceUrl,
      fetchId: fetchId ?? null,
      valueHash: sha256(attr.value),
      parserVersion: "1",
      retrievedAt: observedAt,
    });

    // (b) prior current value
    const [prior] = await db
      .select({ value: entityAttributes.value })
      .from(entityAttributes)
      .where(and(eq(entityAttributes.entityId, entityId), eq(entityAttributes.key, attr.key)))
      .limit(1);

    // (c) upsert current state
    const now = new Date();
    await db
      .insert(entityAttributes)
      .values({
        entityId,
        key: attr.key,
        label: attr.label,
        value: attr.value,
        numeric,
        unit,
        kind: attr.kind,
        verification: attr.verification,
        provenance: attr.provenance,
        observedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [entityAttributes.entityId, entityAttributes.key],
        set: {
          label: attr.label,
          value: attr.value,
          numeric,
          unit,
          kind: attr.kind,
          verification: attr.verification,
          provenance: attr.provenance,
          observedAt,
          updatedAt: now,
        },
      });

    // (d) change detection — never for a new entity
    if (!isNewEntity && (!prior || prior.value !== attr.value)) {
      await db.insert(changes).values({
        entityId,
        attributeKey: attr.key,
        attributeLabel: attr.label,
        previousValue: prior ? prior.value : null,
        newValue: attr.value,
        sourceKey,
      });
      changed = true;
    }
  }
  return { changed };
}

// --- Topics & graph --------------------------------------------------------

export async function linkTopics(
  entityId: number,
  topicSlugs: string[],
  topicIdMap: Map<string, number>,
): Promise<void> {
  const rows: Array<{ topicId: number; entityId: number }> = [];
  const seen = new Set<number>();
  for (const slug of topicSlugs) {
    const topicId = topicIdMap.get(slug);
    if (topicId == null || seen.has(topicId)) continue;
    seen.add(topicId);
    rows.push({ topicId, entityId });
  }
  if (rows.length === 0) return;
  await db.insert(topicEntities).values(rows).onConflictDoNothing();
}

export async function setEntityQuality(entityId: number, gate: QualityResult): Promise<void> {
  await db
    .update(entities)
    .set({
      qualityScore: gate.qualityScore,
      indexable: gate.indexable,
      pageState: gate.pageState,
      qualityReasons: gate.reasons,
    })
    .where(eq(entities.id, entityId));
}

export async function addRelationship(
  fromId: number,
  toId: number,
  type: string,
  weight: number,
): Promise<void> {
  if (fromId === toId) return;
  await db
    .insert(entityRelationships)
    .values({ fromId, toId, type, weight })
    .onConflictDoUpdate({
      target: [entityRelationships.fromId, entityRelationships.toId, entityRelationships.type],
      set: { weight },
    });
}

// --- Events ----------------------------------------------------------------

/** Best-effort structured log; must never throw and break a run. */
export async function logEvent(
  level: string,
  event: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(systemEvents).values({ level, event, data: data ?? null });
  } catch {
    // Logging failures are non-fatal by design.
  }
}
