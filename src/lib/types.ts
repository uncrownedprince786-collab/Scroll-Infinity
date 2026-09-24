// Shared domain types for the Scroll Infinity knowledge model.
// These are the stable contracts every layer (sources, ingest, repository,
// pages) codes against.

/** Confidence in a stored fact (spec sec. 18). */
export type VerificationState =
  | "verified" // corroborated by multiple sources / high confidence
  | "supported" // a single reliable source
  | "conflicting" // sources disagree
  | "unverified" // extracted but not yet validated
  | "stale" // not refreshed within the freshness window
  | "rejected"; // failed validation

/** Lifecycle of an indexable page (spec sec. 21). */
export type PageState =
  | "candidate"
  | "draft"
  | "published"
  | "indexable"
  | "noindex"
  | "merged"
  | "archived";

export type AttributeKind =
  | "text"
  | "number"
  | "date"
  | "url"
  | "entity"
  | "quantity";

/** Provenance for a single datum (spec sec. 13). */
export interface SourceRef {
  source: string; // adapter key, e.g. "wikidata"
  sourceName: string; // display name, e.g. "Wikidata"
  url: string; // canonical source URL for this datum
  retrievedAt: string; // ISO timestamp
  license?: string;
}

export interface ImageRef {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  source?: SourceRef;
}

export interface AttributeValue {
  key: string; // machine key, e.g. "population"
  label: string; // display label, e.g. "Population"
  value: string; // normalized, display-ready value
  numeric?: number | null;
  unit?: string;
  kind: AttributeKind;
  verification: VerificationState;
  provenance: SourceRef[];
  observedAt: string; // ISO timestamp
}

export interface ChangeSummary {
  attributeKey: string;
  attributeLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changedAt: string; // ISO timestamp
  source: string;
}

export interface EntitySummary {
  slug: string;
  name: string;
  description: string; // one-line factual description
  topicSlugs: string[];
  primaryImage?: ImageRef | null;
  verification: VerificationState;
  updatedAt: string; // ISO timestamp
}

export interface Entity extends EntitySummary {
  wikidataId?: string | null;
  aliases: string[];
  longDescription?: string | null; // intro paragraph (plain text)
  attributes: AttributeValue[];
  sources: SourceRef[];
  firstSeenAt: string; // ISO timestamp
  lastVerifiedAt: string; // ISO timestamp
  related: RelatedEntity[];
  recentChanges: ChangeSummary[];
}

export interface RelatedEntity {
  slug: string;
  name: string;
  description: string;
  relationType: string;
}

export interface Topic {
  slug: string;
  name: string;
  description: string;
  entityCount: number;
  sortOrder?: number;
}

export interface SearchResult {
  slug: string;
  name: string;
  description: string;
  topicSlugs: string[];
  verification: VerificationState;
  updatedAt: string;
  score?: number;
}

/** Aggregate counters for the homepage live summary. */
export interface SiteStats {
  entities: number;
  topics: number;
  observations: number;
  verifiedFacts: number;
  changesToday: number;
  lastUpdatedAt: string | null;
}

/** A detected material change, joined to its entity for display. */
export interface RecentChange {
  entitySlug: string;
  entityName: string;
  attributeKey: string;
  attributeLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changedAt: string;
  source: string;
}
