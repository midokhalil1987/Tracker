import { randomBytes } from "node:crypto";
import fs from "fs/promises";
import path from "path";
import type { PublicUser } from "@/lib/auth/types";
import { AUTH_KEYS, SESSION_MAX_AGE_SEC } from "@/lib/server/auth-keys";
import { getRedis, isRedisConfigured } from "@/lib/server/redis-client";
import { getUserById } from "@/lib/server/user-store";

type SessionRecord = {
  userId: string;
  expiresAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data", "auth");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function shouldUseFileAuth(): boolean {
  return !isRedisConfigured() && !process.env.VERCEL;
}

function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

async function readSessionsFile(): Promise<Record<string, SessionRecord>> {
  try {
    const raw = await fs.readFile(SESSIONS_FILE, "utf8");
    return JSON.parse(raw) as Record<string, SessionRecord>;
  } catch {
    return {};
  }
}

async function writeSessionsFile(
  sessions: Record<string, SessionRecord>
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SEC * 1000
  ).toISOString();
  const record: SessionRecord = { userId, expiresAt };

  if (shouldUseFileAuth()) {
    const sessions = await readSessionsFile();
    sessions[token] = record;
    await writeSessionsFile(sessions);
    return token;
  }

  const redis = await getRedis();
  await redis.set(AUTH_KEYS.session(token), record, {
    ex: SESSION_MAX_AGE_SEC,
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;

  if (shouldUseFileAuth()) {
    const sessions = await readSessionsFile();
    delete sessions[token];
    await writeSessionsFile(sessions);
    return;
  }

  if (!isRedisConfigured()) return;
  const redis = await getRedis();
  await redis.del(AUTH_KEYS.session(token));
}

export async function getSessionUser(
  token: string | undefined | null
): Promise<PublicUser | null> {
  if (!token) return null;

  let record: SessionRecord | null = null;

  if (shouldUseFileAuth()) {
    const sessions = await readSessionsFile();
    record = sessions[token] ?? null;
    if (record && isExpired(record.expiresAt)) {
      delete sessions[token];
      await writeSessionsFile(sessions);
      return null;
    }
  } else if (isRedisConfigured()) {
    const redis = await getRedis();
    record = await redis.get<SessionRecord>(AUTH_KEYS.session(token));
  }

  if (!record || isExpired(record.expiresAt)) return null;
  return getUserById(record.userId);
}
