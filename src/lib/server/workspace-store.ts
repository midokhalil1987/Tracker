import fs from "fs/promises";
import path from "path";
import type { Project, Tag, TimeEntry } from "@/lib/types";

const REDIS_KEY = "workspace:snapshot";

export type WorkspaceSnapshot = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  emailReportsEnabled: boolean;
  email: string;
  updatedAt: string;
  lastEmailSentAt: string | null;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "workspace.json");

const DEFAULT_EMAIL =
  process.env.EMAIL_TO?.trim() || "midokhalil1987@gmail.com";

function redisEnv():
  | { url: string; token: string }
  | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function storageMode(): "redis" | "file" {
  return redisEnv() ? "redis" : "file";
}

async function getRedis() {
  const env = redisEnv();
  if (!env) throw new Error("Redis is not configured.");
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url: env.url, token: env.token });
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

export async function readWorkspace(): Promise<WorkspaceSnapshot | null> {
  if (storageMode() === "redis") {
    return readFromRedis();
  }
  return readFromFile();
}

export async function writeWorkspace(
  data: Omit<WorkspaceSnapshot, "updatedAt" | "lastEmailSentAt"> & {
    lastEmailSentAt?: string | null;
  }
): Promise<WorkspaceSnapshot> {
  const existing = await readWorkspace();
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
    if (storageMode() === "redis") {
      await writeToRedis(snapshot);
    } else {
      await writeToFile(snapshot);
    }
  } catch (error) {
    const hint =
      process.env.VERCEL && storageMode() === "file"
        ? " On Vercel, add Upstash Redis (Marketplace → Storage → Redis) and connect it to this project."
        : "";
    throw new Error(
      `Failed to persist workspace snapshot (${storageMode()}).${hint}`,
      { cause: error }
    );
  }

  return snapshot;
}

export async function markEmailSent(): Promise<void> {
  const existing = await readWorkspace();
  if (!existing) return;
  existing.lastEmailSentAt = new Date().toISOString();

  if (storageMode() === "redis") {
    await writeToRedis(existing);
  } else {
    await writeToFile(existing);
  }
}
