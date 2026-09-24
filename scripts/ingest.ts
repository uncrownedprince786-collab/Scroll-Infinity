// CLI entry for the ingest pipeline.
//
// Environment (DATABASE_URL, etc.) MUST already be present in process.env when
// this runs: the db client reads DATABASE_URL at import time, and ESM import
// evaluation is hoisted above any in-file dotenv call, so we deliberately do
// not load dotenv here. Run it with the env file preloaded, e.g.
//   tsx --env-file=.env.local scripts/ingest.ts
// tsx resolves the "@/*" tsconfig path alias automatically.

import { ingestAll } from "@/lib/ingest/pipeline";
import { logEvent } from "@/lib/ingest/writes";

async function main(): Promise<void> {
  const { summaries, topics, relationships } = await ingestAll();

  const newCount = summaries.filter((s) => s.isNew).length;
  const changedCount = summaries.filter((s) => s.changed).length;
  const indexableCount = summaries.filter((s) => s.indexable).length;
  const errors = summaries.filter((s) => s.error);

  console.log("\nScroll Infinity ingest");
  console.log("======================");
  for (const s of summaries) {
    const mark = s.error ? "x" : s.indexable ? "+" : "-";
    const parts = [
      s.isNew ? "new" : "existing",
      s.changed ? "changed" : null,
      s.indexable ? "indexable" : "not-indexable",
      `${s.attributeCount} attrs`,
      s.error ? `ERROR: ${s.error}` : null,
    ].filter(Boolean);
    console.log(`  [${mark}] ${s.name} (${s.slug}) — ${parts.join(", ")}`);
  }

  console.log("\nSummary");
  console.log(`  topics:        ${topics}`);
  console.log(`  entities:      ${summaries.length}`);
  console.log(`  new:           ${newCount}`);
  console.log(`  changed:       ${changedCount}`);
  console.log(`  indexable:     ${indexableCount}`);
  console.log(`  relationships: ${relationships.pairs}`);
  console.log(`  errors:        ${errors.length}`);

  // A run where every entity failed means the pipeline could not do its job.
  if (summaries.length > 0 && errors.length === summaries.length) {
    throw new Error("All entities failed to ingest");
  }
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ingest failed:", message);
    await logEvent("error", "ingest.fatal", { error: message }).catch(() => {});
    process.exit(1);
  });
