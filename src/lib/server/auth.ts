import { cookies } from "next/headers";
import type { PublicUser } from "@/lib/auth/types";
import { SESSION_COOKIE } from "@/lib/server/auth-keys";
import { getSessionUser } from "@/lib/server/session";

export function verifyBearer(req: Request, envKey: string): boolean {
  const expected = process.env[envKey];
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

/** Session user from an incoming Request cookie header (API routes). */
export async function getUserFromRequest(
  req: Request
): Promise<PublicUser | null> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  return getSessionUser(token ? decodeURIComponent(token) : null);
}

/** Session user from Next.js cookies() (server components / actions). */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return getSessionUser(token);
}

export type SyncAuth =
  | { type: "session"; user: PublicUser }
  | { type: "legacy" };

/** Authorize workspace sync — logged-in user or legacy SYNC_SECRET bearer. */
export async function authorizeSync(req: Request): Promise<SyncAuth | null> {
  const user = await getUserFromRequest(req);
  if (user) return { type: "session", user };
  if (verifyBearer(req, "SYNC_SECRET")) return { type: "legacy" };
  return null;
}
