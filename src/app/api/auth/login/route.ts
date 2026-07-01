import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/server/auth-keys";
import {
  AuthCredentialsError,
  AuthStorageNotConfiguredError,
  authenticateUser,
} from "@/lib/server/user-store";
import {
  createSession,
  sessionCookieOptions,
} from "@/lib/server/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: "Invalid email/username or password." },
      { status: 400 }
    );
  }

  try {
    const user = await authenticateUser(body);
    const token = await createSession(user.id);
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (error) {
    if (error instanceof AuthCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthStorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[api/auth/login]", error);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
