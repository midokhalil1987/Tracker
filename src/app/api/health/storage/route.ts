import { NextResponse } from "next/server";
import {
  getEnvDiagnostics,
  getStorageStatus,
  pingRedis,
} from "@/lib/server/workspace-store";
import { STORAGE_SETUP } from "@/lib/server/storage-setup";

export const runtime = "nodejs";

/** Debug which persistence backend is available (no secrets exposed). */
export async function GET() {
  const status = getStorageStatus();
  const env = getEnvDiagnostics();
  const redisPing = status.redis ? await pingRedis() : false;
  const ready = status.mode !== null && (status.mode !== "redis" || redisPing);

  let note: string | null = null;
  if (!env.UPSTASH_REDIS_REST_URL && !env.KV_REST_API_URL) {
    note =
      "Redis URL env var missing on this deployment. Add UPSTASH_REDIS_REST_URL in Vercel → Settings → Environment Variables → check Production → Redeploy.";
  } else if (!env.UPSTASH_REDIS_REST_TOKEN && !env.KV_REST_API_TOKEN) {
    note =
      "Redis TOKEN env var missing. Add UPSTASH_REDIS_REST_TOKEN, enable Production, then Redeploy.";
  } else if (status.redis && !redisPing) {
    note =
      "Redis vars exist but connection failed — double-check URL/token values from Upstash (not placeholder text).";
  } else if (ready) {
    note = null;
  }

  return NextResponse.json({
    ...status,
    env,
    redisPing: status.redis ? redisPing : null,
    ready,
    setup: ready ? null : STORAGE_SETUP,
    note,
  });
}
