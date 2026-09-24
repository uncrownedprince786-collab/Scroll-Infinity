// Drizzle schema for Scroll Infinity (spec sec. 35).
// A deliberately focused subset of the full model: enough to persist canonical
// entities, their provenance-tracked observations, detected changes, topics,
// and the entity graph. Designed to extend (pages, crawl/discovery queues,
// search_performance, etc.) without reshaping what exists.

import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SourceRef } from "@/lib/types";

export const verificationEnum = pgEnum("verification_state", [
  "verified",
  "supported",
  "conflicting",
  "unverified",
  "stale",
  "rejected",
]);

export const pageStateEnum = pgEnum("page_state", [
  "candidate",
  "draft",
  "published",
  "indexable",
  "noindex",
  "merged",
  "archived",
]);

export const sourceHealthEnum = pgEnum("source_health", [
  "healthy",
  "degraded",
  "failing",
  "disabled",
]);

// --- Sources & provenance --------------------------------------------------

export const sources = pgTable("sources", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  homepage: text("homepage"),
  license: text("license"),
  trust: integer("trust").notNull().default(50),
  health: sourceHealthEnum("health").notNull().default("healthy"),
  enabled: boolean("enabled").notNull().default(true),
  errorCount: integer("error_count").notNull().default(0),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  parserVersion: text("parser_version").notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sourceFetches = pgTable(
  "source_fetches",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceKey: text("source_key").notNull(),
    url: text("url").notNull(),
    httpStatus: integer("http_status"),
    ok: boolean("ok").notNull().default(false),
    contentHash: text("content_hash"),
    parserVersion: text("parser_version").notNull().default("1"),
    bytes: integer("bytes"),
    error: text("error"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("source_fetches_source_idx").on(t.sourceKey),
    index("source_fetches_retrieved_idx").on(t.retrievedAt),
  ],
);

// --- Entities --------------------------------------------------------------

export const entities = pgTable(
  "entities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    longDescription: text("long_description"),
    wikidataId: text("wikidata_id").unique(),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    verification: verificationEnum("verification").notNull().default("unverified"),
    pageState: pageStateEnum("page_state").notNull().default("candidate"),
    indexable: boolean("indexable").notNull().default(false),
    qualityScore: integer("quality_score").notNull().default(0),
    qualityReasons: jsonb("quality_reasons")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    contentHash: text("content_hash"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("entities_page_state_idx").on(t.pageState),
    index("entities_indexable_idx").on(t.indexable),
    index("entities_updated_idx").on(t.updatedAt),
  ],
);

export const entityAliases = pgTable(
  "entity_aliases",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityId: bigint("entity_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalized: text("normalized").notNull(),
    source: text("source"),
  },
  (t) => [
    uniqueIndex("entity_aliases_uq").on(t.entityId, t.normalized),
    index("entity_aliases_norm_idx").on(t.normalized),
  ],
);

export const entityAttributes = pgTable(
  "entity_attributes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityId: bigint("entity_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    numeric: doublePrecision("numeric"),
    unit: text("unit"),
    kind: text("kind").notNull().default("text"),
    verification: verificationEnum("verification").notNull().default("unverified"),
    provenance: jsonb("provenance")
      .$type<SourceRef[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("entity_attributes_uq").on(t.entityId, t.key),
    index("entity_attributes_key_idx").on(t.key),
  ],
);

// --- Archive: append-only observations + detected changes (spec sec. 13/20) -

export const observations = pgTable(
  "observations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityId: bigint("entity_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    attributeKey: text("attribute_key").notNull(),
    value: text("value").notNull(),
    numeric: doublePrecision("numeric"),
    unit: text("unit"),
    sourceKey: text("source_key").notNull(),
    sourceUrl: text("source_url").notNull(),
    fetchId: bigint("fetch_id", { mode: "number" }).references(() => sourceFetches.id),
    valueHash: text("value_hash").notNull(),
    parserVersion: text("parser_version").notNull().default("1"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("observations_entity_attr_idx").on(t.entityId, t.attributeKey),
    index("observations_retrieved_idx").on(t.retrievedAt),
  ],
);

export const changes = pgTable(
  "changes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityId: bigint("entity_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    attributeKey: text("attribute_key").notNull(),
    attributeLabel: text("attribute_label").notNull(),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    sourceKey: text("source_key").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("changes_entity_idx").on(t.entityId),
    index("changes_changed_idx").on(t.changedAt),
  ],
);

// --- Topics & graph --------------------------------------------------------

export const topics = pgTable("topics", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const topicEntities = pgTable(
  "topic_entities",
  {
    topicId: bigint("topic_id", { mode: "number" })
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    entityId: bigint("entity_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.topicId, t.entityId] })],
);

export const entityRelationships = pgTable(
  "entity_relationships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fromId: bigint("from_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    toId: bigint("to_id", { mode: "number" })
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("related"),
    weight: integer("weight").notNull().default(1),
  },
  (t) => [
    uniqueIndex("entity_relationships_uq").on(t.fromId, t.toId, t.type),
    index("entity_relationships_from_idx").on(t.fromId),
  ],
);

// --- Product signals -------------------------------------------------------

export const searchQueries = pgTable(
  "search_queries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    query: text("query").notNull(),
    normalized: text("normalized").notNull(),
    results: integer("results").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("search_queries_norm_idx").on(t.normalized),
    index("search_queries_created_idx").on(t.createdAt),
  ],
);

export const systemEvents = pgTable(
  "system_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    level: text("level").notNull().default("info"),
    event: text("event").notNull(),
    jobId: text("job_id"),
    sourceKey: text("source_key"),
    entityId: bigint("entity_id", { mode: "number" }),
    durationMs: integer("duration_ms"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("system_events_created_idx").on(t.createdAt),
    index("system_events_event_idx").on(t.event),
  ],
);

// Convenience inferred types.
export type EntityRow = typeof entities.$inferSelect;
export type NewEntityRow = typeof entities.$inferInsert;
export type TopicRow = typeof topics.$inferSelect;
export type AttributeRow = typeof entityAttributes.$inferSelect;
