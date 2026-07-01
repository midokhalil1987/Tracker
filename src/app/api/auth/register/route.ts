import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/server/auth-keys";
import {
  AuthConflictError,
  AuthStorageNotConfiguredError,
  AuthValidationError,
  registerUser,
} from "@/lib/server/user-store";
import {
  createSession,
  sessionCookieOptions,
} from "@/lib/server/session";
import { writeWorkspace } from "@/lib/server/workspace-store";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Username must use letters, numbers, . _ - only."
    ),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: "Invalid email, username, or password." },
      { status: 400 }
    );
  }

  try {
    const user = await registerUser(body);
    const token = await createSession(user.id);

    await writeWorkspace(
      {
        projects: [],
        tags: [],
        entries: [],
        emailReportsEnabled: false,
        emails: [user.email ?? body.email.trim().toLowerCase()],
      },
      user.id
    );

    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (error) {
    if (error instanceof AuthValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AuthConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof AuthStorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[api/auth/register]", error);
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 }
    );
  }
}
