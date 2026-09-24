// Build the entity graph from shared topics. For each indexable entity we rank
// every other indexable entity by how many topics they share and keep the
// strongest links. Idempotent: re-running upserts the same edges with refreshed
// weights (spec sec. graph).

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { entities, topicEntities, topics } from "@/db/schema";
import { addRelationship, logEvent } from "@/lib/ingest/writes";

const MAX_RELATED = 12;

export async function buildRelationships(): Promise<{ entities: number; pairs: number }> {
  const rows = await db
    .select({ entityId: topicEntities.entityId, slug: topics.slug })
    .from(topicEntities)
    .innerJoin(entities, eq(entities.id, topicEntities.entityId))
    .innerJoin(topics, eq(topics.id, topicEntities.topicId))
    .where(eq(entities.indexable, true));

  const topicsByEntity = new Map<number, Set<string>>();
  for (const r of rows) {
    const set = topicsByEntity.get(r.entityId) ?? new Set<string>();
    set.add(r.slug);
    topicsByEntity.set(r.entityId, set);
  }

  const ids = [...topicsByEntity.keys()];
  let pairs = 0;
  for (const fromId of ids) {
    const fromTopics = topicsByEntity.get(fromId)!;
    const scored: Array<{ toId: number; shared: number }> = [];
    for (const toId of ids) {
      if (toId === fromId) continue;
      const toTopics = topicsByEntity.get(toId)!;
      let shared = 0;
      for (const t of fromTopics) if (toTopics.has(t)) shared++;
      if (shared >= 1) scored.push({ toId, shared });
    }
    scored.sort((a, b) => b.shared - a.shared || a.toId - b.toId);
    for (const { toId, shared } of scored.slice(0, MAX_RELATED)) {
      await addRelationship(fromId, toId, "related", shared);
      pairs++;
    }
  }

  await logEvent("info", "relationships.built", { entities: ids.length, pairs });
  return { entities: ids.length, pairs };
}
