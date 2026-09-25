// Ingest pipeline: resolve one seed entity through Wikipedia + Wikidata, gate
// its quality, and persist it; then wire up the whole graph. Each entity is
// isolated in a try/catch so one bad source never aborts the run (spec sec. 39).

import { fetchWikipediaSummary } from "@/lib/sources/wikipedia";
import { fetchWikidataEntity } from "@/lib/sources/wikidata";
import { cleanExtract, firstSentence } from "@/lib/normalize";
import { assessQuality } from "@/lib/quality";
import { normalizeText, slugify } from "@/lib/slug";
import { seedEntities, type SeedEntity } from "@/lib/data/seed";
import { ingestConfig } from "@/lib/config";
import type { AttributeValue, VerificationState } from "@/lib/types";
import {
  applyAttributes,
  ensureSources,
  ensureTopics,
  linkTopics,
  logEvent,
  recordFetch,
  setAliases,
  setEntityQuality,
  upsertEntity,
  type EntityCandidate,
} from "@/lib/ingest/writes";
import { buildRelationships } from "@/lib/ingest/relationships";
import {
  collectDiscoverySeeds,
  collectExistingKeys,
  collectStaleSeeds,
} from "@/lib/ingest/discovery";

export type IngestOrigin = "seed" | "refresh" | "discovered";

export interface IngestSummary {
  slug: string;
  name: string;
  origin: IngestOrigin;
  isNew: boolean;
  changed: boolean;
  attributeCount: number;
  indexable: boolean;
  error?: string;
}

const POLITE_DELAY_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ingestEntity(
  seed: SeedEntity,
  topicIdMap: Map<string, number>,
  origin: IngestOrigin = "seed",
): Promise<IngestSummary> {
  const fallbackName = seed.name ?? seed.title;
  try {
    const { data: summary, fetch: wikiFetch } = await fetchWikipediaSummary(seed.title);
    await recordFetch(wikiFetch, "wikipedia");

    if (!summary) {
      await logEvent("warn", "ingest.wikipedia.miss", {
        title: seed.title,
        error: wikiFetch.error,
      });
      return {
        slug: slugify(fallbackName),
        name: fallbackName,
        origin,
        isNew: false,
        changed: false,
        attributeCount: 0,
        indexable: false,
        error: wikiFetch.error ?? "Wikipedia summary unavailable",
      };
    }

    const name = summary.resolvedTitle || fallbackName;
    const slug = slugify(name);
    const wikidataId = summary.wikibaseItem;

    let attributes: AttributeValue[] = [];
    let aliases: string[] = [];
    let wdFetchId: number | null = null;
    if (wikidataId) {
      const wd = await fetchWikidataEntity(wikidataId);
      wdFetchId = await recordFetch(wd.fetch, "wikidata");
      attributes = wd.facts.attributes;
      aliases = wd.aliases;
    }

    const longDescription = cleanExtract(summary.extract);
    const description =
      summary.description?.trim() || firstSentence(summary.extract) || "";

    const image = summary.thumbnail ?? summary.originalimage;
    const candidateImage = image
      ? { url: image.source, alt: name, width: image.width, height: image.height }
      : null;

    const verification: VerificationState =
      wikidataId && attributes.length > 0 ? "supported" : "unverified";

    const candidate: EntityCandidate = {
      slug,
      name,
      description,
      longDescription: longDescription || null,
      wikidataId: wikidataId ?? null,
      image: candidateImage,
      verification,
      attributes,
    };

    const gate = assessQuality({
      description,
      longDescription,
      attributeCount: attributes.length,
      hasImage: !!candidateImage,
      aliasCount: aliases.length,
      topicCount: seed.topics.length,
    });

    const { id, isNew, prevContentHash, contentHash } = await upsertEntity(candidate);
    await setAliases(id, aliases);
    await applyAttributes(id, isNew, attributes, undefined, wdFetchId);
    await linkTopics(id, seed.topics, topicIdMap);
    await setEntityQuality(id, gate);

    const changed = !isNew && prevContentHash !== contentHash;

    return {
      slug,
      name,
      origin,
      isNew,
      changed,
      attributeCount: attributes.length,
      indexable: gate.indexable,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEvent("error", "ingest.entity.failed", { title: seed.title, error: message });
    return {
      slug: slugify(fallbackName),
      name: fallbackName,
      origin,
      isNew: false,
      changed: false,
      attributeCount: 0,
      indexable: false,
      error: message,
    };
  }
}

export interface IngestRunOptions {
  /** How many stale existing entities to refresh this run. */
  refreshLimit?: number;
  /** How many newly discovered related entities to add this run. */
  discoverLimit?: number;
}

export interface IngestRunResult {
  summaries: IngestSummary[];
  topics: number;
  relationships: { entities: number; pairs: number };
  counts: {
    processed: number;
    seeded: number;
    refreshed: number;
    discovered: number;
    new: number;
    changed: number;
    indexable: number;
    errors: number;
    durationMs: number;
  };
}

/**
 * One ingest run (spec sec. 36, 48). Bounded and self-growing: ensure any
 * not-yet-stored seed entities exist, refresh the stalest known entities, then
 * discover a few genuinely related new ones — and rebuild the graph. Work per
 * run is capped by `refreshLimit`/`discoverLimit`, so the schedule stays cheap
 * as the database grows instead of re-crawling everything.
 */
export async function ingestAll(opts: IngestRunOptions = {}): Promise<IngestRunResult> {
  const refreshLimit = opts.refreshLimit ?? ingestConfig.refreshLimit;
  const discoverLimit = opts.discoverLimit ?? ingestConfig.discoverLimit;
  const startedAt = Date.now();

  await ensureSources();
  const topicIdMap = await ensureTopics();

  // Build a de-duplicated work list across the three passes. `seen` guarantees
  // one entity is never fetched twice in a single run.
  const seen = new Set<string>();
  const work: Array<{ seed: SeedEntity; origin: IngestOrigin }> = [];
  const enqueue = (seed: SeedEntity, origin: IngestOrigin) => {
    const slug = slugify(seed.name ?? seed.title);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    work.push({ seed, origin });
  };

  const existing = await collectExistingKeys();

  // Pass 1 — ensure seeds exist. Established seeds stay fresh via Pass 2; only
  // seeds not yet in the database (e.g. newly added to seed.ts) are ingested.
  for (const seed of seedEntities) {
    const slug = slugify(seed.name ?? seed.title);
    if (existing.slugs.has(slug) || existing.names.has(normalizeText(seed.title))) continue;
    enqueue(seed, "seed");
  }

  // Pass 2 — refresh the stalest known entities for freshness + change detection.
  for (const seed of await collectStaleSeeds(refreshLimit)) enqueue(seed, "refresh");

  // Pass 3 — discover a bounded set of genuinely related new entities.
  for (const seed of await collectDiscoverySeeds(discoverLimit, existing)) {
    enqueue(seed, "discovered");
  }

  const summaries: IngestSummary[] = [];
  for (let i = 0; i < work.length; i++) {
    if (i > 0) await delay(POLITE_DELAY_MS); // be gentle to the Wikimedia APIs
    summaries.push(await ingestEntity(work[i].seed, topicIdMap, work[i].origin));
  }

  const relationships = await buildRelationships();

  const counts = {
    processed: summaries.length,
    seeded: summaries.filter((s) => s.origin === "seed").length,
    refreshed: summaries.filter((s) => s.origin === "refresh").length,
    discovered: summaries.filter((s) => s.origin === "discovered").length,
    new: summaries.filter((s) => s.isNew).length,
    changed: summaries.filter((s) => s.changed).length,
    indexable: summaries.filter((s) => s.indexable).length,
    errors: summaries.filter((s) => s.error).length,
    durationMs: Date.now() - startedAt,
  };

  await logEvent("info", "ingest.complete", {
    ...counts,
    relationships: relationships.pairs,
  });

  return { summaries, topics: topicIdMap.size, relationships, counts };
}
