// Internal operations snapshot (spec sec. 42). Read-only aggregate view of the
// platform's health for operators: source health, entity/page counts, archive
// size, recent changes and recent errors. Server-only and never exposed to the
// public read path — it is served only behind the authenticated ops endpoint.

import "server-only";
import { count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  changes,
  entities,
  entityAttributes,
  observations,
  sources,
  systemEvents,
  topics,
} from "@/db/schema";

export interface OpsSnapshot {
  generatedAt: string;
  sources: Array<{
    key: string;
    name: string;
    health: string;
    enabled: boolean;
    errorCount: number;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
  }>;
  entities: {
    total: number;
    indexable: number;
    byState: Record<string, number>;
    newLast24h: number;
    newLast7d: number;
  };
  archive: { topics: number; attributes: number; observations: number; changesTotal: number };
  recentChanges: Array<{
    entity: string;
    attribute: string;
    previousValue: string | null;
    newValue: string | null;
    changedAt: string;
  }>;
  recentErrors: Array<{ event: string; message: string | null; at: string }>;
}

function since(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/** Gather the operational snapshot in a handful of aggregate queries. */
export async function getOpsSnapshot(): Promise<OpsSnapshot> {
  const [
    sourceRows,
    totalRow,
    indexableRow,
    stateRows,
    new24Row,
    new7dRow,
    topicRow,
    attrRow,
    obsRow,
    changeRow,
    changeRows,
    errorRows,
  ] = [
    await db
      .select({
        key: sources.key,
        name: sources.name,
        health: sources.health,
        enabled: sources.enabled,
        errorCount: sources.errorCount,
        lastSuccessAt: sources.lastSuccessAt,
        lastErrorAt: sources.lastErrorAt,
      })
      .from(sources)
      .orderBy(sources.key),
    await db.select({ v: count() }).from(entities),
    await db.select({ v: count() }).from(entities).where(eq(entities.indexable, true)),
    await db
      .select({ state: entities.pageState, v: count() })
      .from(entities)
      .groupBy(entities.pageState),
    await db.select({ v: count() }).from(entities).where(gte(entities.firstSeenAt, since(24))),
    await db.select({ v: count() }).from(entities).where(gte(entities.firstSeenAt, since(24 * 7))),
    await db.select({ v: count() }).from(topics),
    await db.select({ v: count() }).from(entityAttributes),
    await db.select({ v: count() }).from(observations),
    await db.select({ v: count() }).from(changes),
    await db
      .select({
        entity: entities.name,
        attribute: changes.attributeLabel,
        previousValue: changes.previousValue,
        newValue: changes.newValue,
        changedAt: changes.changedAt,
      })
      .from(changes)
      .innerJoin(entities, eq(entities.id, changes.entityId))
      .orderBy(desc(changes.changedAt))
      .limit(15),
    await db
      .select({ event: systemEvents.event, data: systemEvents.data, createdAt: systemEvents.createdAt })
      .from(systemEvents)
      .where(eq(systemEvents.level, "error"))
      .orderBy(desc(systemEvents.createdAt))
      .limit(20),
  ];

  const byState: Record<string, number> = {};
  for (const r of stateRows) byState[r.state] = Number(r.v);

  return {
    generatedAt: new Date().toISOString(),
    sources: sourceRows.map((s) => ({
      key: s.key,
      name: s.name,
      health: s.health,
      enabled: s.enabled,
      errorCount: s.errorCount,
      lastSuccessAt: s.lastSuccessAt ? s.lastSuccessAt.toISOString() : null,
      lastErrorAt: s.lastErrorAt ? s.lastErrorAt.toISOString() : null,
    })),
    entities: {
      total: Number(totalRow[0]?.v ?? 0),
      indexable: Number(indexableRow[0]?.v ?? 0),
      byState,
      newLast24h: Number(new24Row[0]?.v ?? 0),
      newLast7d: Number(new7dRow[0]?.v ?? 0),
    },
    archive: {
      topics: Number(topicRow[0]?.v ?? 0),
      attributes: Number(attrRow[0]?.v ?? 0),
      observations: Number(obsRow[0]?.v ?? 0),
      changesTotal: Number(changeRow[0]?.v ?? 0),
    },
    recentChanges: changeRows.map((c) => ({
      entity: c.entity,
      attribute: c.attribute,
      previousValue: c.previousValue,
      newValue: c.newValue,
      changedAt: c.changedAt.toISOString(),
    })),
    recentErrors: errorRows.map((e) => ({
      event: e.event,
      message: typeof e.data?.error === "string" ? e.data.error : null,
      at: e.createdAt.toISOString(),
    })),
  };
}
