// Internal operations snapshot endpoint (spec sec. 42). Same Bearer auth as the
// ingest trigger; returns the operational health view as JSON. Read-only.

import { NextResponse } from "next/server";
import { getOpsSnapshot } from "@/lib/repo/admin";
import { logEvent } from "@/lib/ingest/writes";
import { isAuthorized } from "@/lib/auth";
import { serverConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = serverConfig.ingestSecret;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Admin API is not configured (INGEST_SECRET unset)." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getOpsSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEvent("error", "admin.stats.failed", { error: message });
    return NextResponse.json({ ok: false, error: "Snapshot failed" }, { status: 500 });
  }
}
