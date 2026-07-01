import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth-keys";
import { deleteSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  if (token) {
    await deleteSession(decodeURIComponent(token));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
