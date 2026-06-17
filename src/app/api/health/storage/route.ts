import { NextResponse } from "next/server";
import { getStorageStatus } from "@/lib/server/workspace-store";

export const runtime = "nodejs";

/** Debug which persistence backend is available (no secrets exposed). */
export async function GET() {
  const status = getStorageStatus();
  const ready = status.mode !== null;
  return NextResponse.json({
    ...status,
    ready,
    hint: ready
      ? null
      : "Add Upstash Redis or Blob from Vercel → Storage, connect to this project, then Redeploy.",
  });
}
