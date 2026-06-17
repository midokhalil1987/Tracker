import fs from "fs/promises";
import path from "path";
import type { Project, Tag, TimeEntry } from "@/lib/types";
import { STORAGE_SETUP } from "./storage-setup";

const REDIS_KEY = "workspace:snapshot";
const BLOB_PATH = "workspace-snapshot.json";

export type WorkspaceSnapshot = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  emailReportsEnabled: boolean;
  email: string;
  updatedAt: string;
  lastEmailSentAt: string | null;
};

export type StorageMode = "redis" | "blob" | "file";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "workspace.json");

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

function redisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Which backend is active (null = not configured on Vercel). */
export function getStorageStatus(): {
  mode: StorageMode | null;
  vercel: boolean;
  redis: boolean;
  blob: boolean;
} {
  const vercel = Boolean(process.env.VERCEL);
  const redis = Boolean(redisEnv());
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

async function getRedis() {
  const env = redisEnv();
  if (!env) throw new Error("Redis is not configured.");
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url: env.url, token: env.token });
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

async function readFromFile(): Promise<WorkspaceSnapshot | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

async function writeToFile(snapshot: WorkspaceSnapshot): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

async function readFromRedis(): Promise<WorkspaceSnapshot | null> {
  const redis = await getRedis();
  const data = await redis.get<WorkspaceSnapshot>(REDIS_KEY);
  return data ?? null;
}

async function writeToRedis(snapshot: WorkspaceSnapshot): Promise<void> {
  const redis = await getRedis();
  await redis.set(REDIS_KEY, snapshot);
}

async function readFromBlob(): Promise<WorkspaceSnapshot | null> {
  const { head } = await import("@vercel/blob");
  try {
    const meta = await head(BLOB_PATH);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return (await res.json()) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

async function writeToBlob(snapshot: WorkspaceSnapshot): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, JSON.stringify(snapshot), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readByMode(mode: StorageMode): Promise<WorkspaceSnapshot | null> {
  switch (mode) {
    case "redis":
      return readFromRedis();
    case "blob":
      return readFromBlob();
    case "file":
      return readFromFile();
  }
}

async function writeByMode(
  mode: StorageMode,
  snapshot: WorkspaceSnapshot
): Promise<void> {
  switch (mode) {
    case "redis":
      await writeToRedis(snapshot);
      break;
    case "blob":
      await writeToBlob(snapshot);
      break;
    case "file":
      await writeToFile(snapshot);
      break;
  }
}

export async function readWorkspace(): Promise<WorkspaceSnapshot | null> {
  const mode = resolveStorageMode();
  return readByMode(mode);
}

export async function writeWorkspace(
  data: Omit<WorkspaceSnapshot, "updatedAt" | "lastEmailSentAt"> & {
    lastEmailSentAt?: string | null;
  }
): Promise<WorkspaceSnapshot> {
  const mode = resolveStorageMode();
  const existing = await readByMode(mode);
  const snapshot: WorkspaceSnapshot = {
    projects: data.projects,
    tags: data.tags,
    entries: data.entries,
    emailReportsEnabled: data.emailReportsEnabled,
    email: data.email.trim() || DEFAULT_EMAIL,
    updatedAt: new Date().toISOString(),
    lastEmailSentAt:
      data.lastEmailSentAt !== undefined
        ? data.lastEmailSentAt
        : (existing?.lastEmailSentAt ?? null),
  };

  try {
    await writeByMode(mode, snapshot);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) throw error;
    throw new Error(`Failed to persist workspace snapshot (${mode}).`, {
      cause: error,
    });
  }

  return snapshot;
}

export async function markEmailSent(): Promise<void> {
  const mode = resolveStorageMode();
  const existing = await readByMode(mode);
  if (!existing) return;
  existing.lastEmailSentAt = new Date().toISOString();
  await writeByMode(mode, existing);
}
