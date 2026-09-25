// Ingest trigger (spec sec. 36, 41). A single authenticated endpoint that runs
// one bounded ingest pass, so the platform can grow and detect changes on a
// schedule instead of only from a developer's machine.
//
// Auth: `Authorization: Bearer <INGEST_SECRET>`. Vercel Cron sends exactly this
// header when `CRON_SECRET` is configured, so set `CRON_SECRET` = `INGEST_SECRET`
// and the scheduled GET authenticates the same way as a manual POST. With no
// secret configured the endpoint fails closed (503) rather than running open.

import { NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest/pipeline";
import { logEvent } from "@/lib/ingest/writes";
import { isAuthorized } from "@/lib/auth";
import { serverConfig } from "@/lib/config";

// This route performs live network + database work on every call; it must never
// be cached or statically prerendered.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request): Promise<NextResponse> {
  const secret = serverConfig.ingestSecret;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Ingest is not configured (INGEST_SECRET unset)." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    // Do not reveal whether the secret exists or hint at its shape.
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { counts, relationships } = await ingestAll();
    return NextResponse.json({
      ok: true,
      counts,
      relationships: { entities: relationships.entities, pairs: relationships.pairs },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEvent("error", "ingest.route.failed", { error: message });
    return NextResponse.json({ ok: false, error: "Ingest failed" }, { status: 500 });
  }
}

// GET: Vercel Cron. POST: manual/programmatic trigger. Both require the secret.
export async function GET(request: Request): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return run(request);
}
