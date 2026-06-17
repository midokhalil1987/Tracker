import { NextResponse } from "next/server";
import { getStorageStatus } from "@/lib/server/workspace-store";
import { STORAGE_SETUP } from "@/lib/server/storage-setup";

export const runtime = "nodejs";

/** Debug which persistence backend is available (no secrets exposed). */
export async function GET() {
  const status = getStorageStatus();
  const ready = status.mode !== null;
  return NextResponse.json({
    ...status,
    ready,
    setup: ready ? null : STORAGE_SETUP,
  });
}
