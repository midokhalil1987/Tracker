import { NextResponse } from "next/server";
import { getStorageStatus, pingRedis } from "@/lib/server/workspace-store";
import { STORAGE_SETUP } from "@/lib/server/storage-setup";

export const runtime = "nodejs";

/** Debug which persistence backend is available (no secrets exposed). */
export async function GET() {
  const status = getStorageStatus();
  const redisPing = status.redis ? await pingRedis() : false;
  const ready = status.mode !== null && (status.mode !== "redis" || redisPing);

  return NextResponse.json({
    ...status,
    redisPing: status.redis ? redisPing : null,
    ready,
    setup: ready ? null : STORAGE_SETUP,
    note: !status.redis
      ? "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not detected — redeploy after adding them."
      : !redisPing
        ? "Redis env vars found but ping failed — check values are the real URL/token from Upstash, not placeholder text."
        : null,
  });
}
