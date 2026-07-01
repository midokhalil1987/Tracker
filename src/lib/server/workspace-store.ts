import fs from "fs/promises";
import path from "path";
import type { Project, Tag, TimeEntry } from "@/lib/types";
import { envPresent } from "@/lib/server/env";
import { normalizeEmailRecipients } from "@/lib/email-recipients";
import { getRedis, isRedisConfigured, redisEnv } from "@/lib/server/redis-client";
import { STORAGE_SETUP } from "./storage-setup";

const LEGACY_REDIS_KEY = "workspace:snapshot";
const LEGACY_BLOB_PATH = "workspace-snapshot.json";

export type WorkspaceSnapshot = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  emailReportsEnabled: boolean;
  emails: string[];
  /** @deprecated Legacy single recipient — normalized to `emails` on read/write */
  email?: string;
  updatedAt: string;
  lastEmailSentAt: string | null;
};

export type StorageMode = "redis" | "blob" | "file";

const DATA_DIR = path.join(process.cwd(), ".data");
const LEGACY_DATA_FILE = path.join(DATA_DIR, "workspace.json");
const WORKSPACES_DIR = path.join(DATA_DIR, "workspaces");

const DEFAULT_EMAIL =
  process.env.EMAIL_TO?.trim() || "midokhalil1987@gmail.com";

export class StorageNotConfiguredError extends Error {
  readonly setup = STORAGE_SETUP;

  constructor() {
    super(
      "Server storage is not configured. Add Upstash Redis env vars on Vercel and redeploy."
    );
    this.name = "StorageNotConfiguredError";
  }
}

function workspaceRedisKey(userId?: string): string {
  return userId ? `workspace:${userId}` : LEGACY_REDIS_KEY;
}

function workspaceBlobPath(userId?: string): string {
  return userId ? `workspace-${userId}.json` : LEGACY_BLOB_PATH;
}

function workspaceFilePath(userId?: string): string {
  return userId
    ? path.join(WORKSPACES_DIR, `${userId}.json`)
    : LEGACY_DATA_FILE;
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Safe diagnostics — key names only, never values. */
export function getEnvDiagnostics() {
  return {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    UPSTASH_REDIS_REST_URL: envPresent("UPSTASH_REDIS_REST_URL"),
    UPSTASH_REDIS_REST_TOKEN: envPresent("UPSTASH_REDIS_REST_TOKEN"),
    KV_REST_API_URL: envPresent("KV_REST_API_URL"),
    KV_REST_API_TOKEN: envPresent("KV_REST_API_TOKEN"),
    BLOB_READ_WRITE_TOKEN: envPresent("BLOB_READ_WRITE_TOKEN"),
    SYNC_SECRET: envPresent("SYNC_SECRET"),
    SMTP_PASS: envPresent("SMTP_PASS"),
  };
}

/** Which backend is active (null = not configured on Vercel). */
export function getStorageStatus(): {
  mode: StorageMode | null;
  vercel: boolean;
  redis: boolean;
  blob: boolean;
} {
  const vercel = Boolean(process.env.VERCEL);
  const redis = isRedisConfigured();
  const blob = blobConfigured();

  let mode: StorageMode | null;
  if (redis) mode = "redis";
  else if (blob) mode = "blob";
  else if (vercel) mode = null;
  else mode = "file";

  return { mode, vercel, redis, blob };
}

function resolveStorageMode(): StorageMode {
  const { mode } = getStorageStatus();
  if (!mode) throw new StorageNotConfiguredError();
  return mode;
}

/** Returns true if Redis env vars are set and a ping succeeds. */
export async function pingRedis(): Promise<boolean> {
  if (!redisEnv()) return false;
  try {
    const redis = await getRedis();
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

async function readFromFile(userId?: string): Promise<WorkspaceSnapshot | null> {
  try {
    const raw = await fs.readFile(workspaceFilePath(userId), "utf8");
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

async function writeToFile(
  snapshot: WorkspaceSnapshot,
  userId?: string
): Promise<void> {
  const filePath = workspaceFilePath(userId);
  if (userId) {
    await fs.mkdir(WORKSPACES_DIR, { recursive: true });
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

async function readFromRedis(userId?: string): Promise<WorkspaceSnapshot | null> {
  const redis = await getRedis();
  const data = await redis.get<WorkspaceSnapshot>(workspaceRedisKey(userId));
  return data ?? null;
}

async function writeToRedis(
  snapshot: WorkspaceSnapshot,
  userId?: string
): Promise<void> {
  const redis = await getRedis();
  await redis.set(workspaceRedisKey(userId), snapshot);
}

async function readFromBlob(userId?: string): Promise<WorkspaceSnapshot | null> {
  const { head } = await import("@vercel/blob");
  try {
    const meta = await head(workspaceBlobPath(userId));
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return (await res.json()) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

async function writeToBlob(
  snapshot: WorkspaceSnapshot,
  userId?: string
): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(workspaceBlobPath(userId), JSON.stringify(snapshot), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

function normalizeSnapshot(
  snapshot: WorkspaceSnapshot,
  fallbackEmail = DEFAULT_EMAIL
): WorkspaceSnapshot {
  const emails = normalizeEmailRecipients(
    snapshot.emails ?? snapshot.email,
    fallbackEmail
  );
  return { ...snapshot, emails };
}

async function readByMode(
  mode: StorageMode,
  userId?: string
): Promise<WorkspaceSnapshot | null> {
  switch (mode) {
    case "redis":
      return readFromRedis(userId);
    case "blob":
      return readFromBlob(userId);
    case "file":
      return readFromFile(userId);
  }
}

async function writeByMode(
  mode: StorageMode,
  snapshot: WorkspaceSnapshot,
  userId?: string
): Promise<void> {
  switch (mode) {
    case "redis":
      await writeToRedis(snapshot, userId);
      break;
    case "blob":
      await writeToBlob(snapshot, userId);
      break;
    case "file":
      await writeToFile(snapshot, userId);
      break;
  }
}

/** Read workspace for a user, or the legacy global snapshot when userId is omitted. */
export async function readWorkspace(
  userId?: string
): Promise<WorkspaceSnapshot | null> {
  const mode = resolveStorageMode();
  const snapshot = await readByMode(mode, userId);
  if (!snapshot) return null;
  return normalizeSnapshot(snapshot);
}

export async function writeWorkspace(
  data: Omit<WorkspaceSnapshot, "updatedAt" | "lastEmailSentAt" | "email"> & {
    lastEmailSentAt?: string | null;
    email?: string;
  },
  userId?: string
): Promise<WorkspaceSnapshot> {
  const mode = resolveStorageMode();
  const existing = await readByMode(mode, userId);
  const emails = normalizeEmailRecipients(
    data.emails ?? data.email ?? existing?.emails ?? existing?.email,
    DEFAULT_EMAIL
  );
  const snapshot: WorkspaceSnapshot = {
    projects: data.projects,
    tags: data.tags,
    entries: data.entries,
    emailReportsEnabled: data.emailReportsEnabled,
    emails,
    updatedAt: new Date().toISOString(),
    lastEmailSentAt:
      data.lastEmailSentAt !== undefined
        ? data.lastEmailSentAt
        : (existing?.lastEmailSentAt ?? null),
  };

  try {
    await writeByMode(mode, snapshot, userId);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) throw error;
    throw new Error(`Failed to persist workspace snapshot (${mode}).`, {
      cause: error,
    });
  }

  return snapshot;
}

export async function markEmailSent(userId?: string): Promise<void> {
  const mode = resolveStorageMode();
  const existing = await readByMode(mode, userId);
  if (!existing) return;
  existing.lastEmailSentAt = new Date().toISOString();
  await writeByMode(mode, existing, userId);
}

/** Workspaces eligible for weekday cron emails (per-user + legacy global). */
export async function listCronWorkspaces(): Promise<
  Array<{ userId: string | null; workspace: WorkspaceSnapshot }>
> {
  const mode = resolveStorageMode();
  const results: Array<{ userId: string | null; workspace: WorkspaceSnapshot }> =
    [];

  const { listUserIds } = await import("@/lib/server/user-store");
  const userIds = await listUserIds();

  for (const userId of userIds) {
    const raw = await readByMode(mode, userId);
    if (!raw) continue;
    const workspace = normalizeSnapshot(raw);
    results.push({ userId, workspace });
  }

  const legacyRaw = await readByMode(mode);
  if (legacyRaw) {
    results.push({ userId: null, workspace: normalizeSnapshot(legacyRaw) });
  }

  return results;
}
