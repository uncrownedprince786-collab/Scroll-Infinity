// Ingest pipeline: resolve one seed entity through Wikipedia + Wikidata, gate
// its quality, and persist it; then wire up the whole graph. Each entity is
// isolated in a try/catch so one bad source never aborts the run (spec sec. 39).

import { fetchWikipediaSummary } from "@/lib/sources/wikipedia";
import { fetchWikidataEntity } from "@/lib/sources/wikidata";
import { cleanExtract, firstSentence } from "@/lib/normalize";
import { assessQuality } from "@/lib/quality";
import { slugify } from "@/lib/slug";
import { seedEntities, type SeedEntity } from "@/lib/data/seed";
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

export interface IngestSummary {
  slug: string;
  name: string;
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
      isNew: false,
      changed: false,
      attributeCount: 0,
      indexable: false,
      error: message,
    };
  }
}

export async function ingestAll(): Promise<{
  summaries: IngestSummary[];
  topics: number;
  relationships: { entities: number; pairs: number };
}> {
  const startedAt = Date.now();
  await ensureSources();
  const topicIdMap = await ensureTopics();

  const summaries: IngestSummary[] = [];
  for (let i = 0; i < seedEntities.length; i++) {
    if (i > 0) await delay(POLITE_DELAY_MS); // be gentle to the Wikimedia APIs
    summaries.push(await ingestEntity(seedEntities[i], topicIdMap));
  }

  const relationships = await buildRelationships();

  const newCount = summaries.filter((s) => s.isNew).length;
  const changedCount = summaries.filter((s) => s.changed).length;
  const indexableCount = summaries.filter((s) => s.indexable).length;
  const errorCount = summaries.filter((s) => s.error).length;

  await logEvent("info", "ingest.complete", {
    entities: summaries.length,
    new: newCount,
    changed: changedCount,
    indexable: indexableCount,
    errors: errorCount,
    relationships: relationships.pairs,
    durationMs: Date.now() - startedAt,
  });

  return { summaries, topics: topicIdMap.size, relationships };
}
