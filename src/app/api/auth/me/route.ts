import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
