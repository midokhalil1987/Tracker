import fs from "fs/promises";
import path from "path";
import type { Project, Tag, TimeEntry } from "@/lib/types";

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

export async function readWorkspace(): Promise<WorkspaceSnapshot | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

export async function writeWorkspace(
  data: Omit<WorkspaceSnapshot, "updatedAt" | "lastEmailSentAt"> & {
    lastEmailSentAt?: string | null;
  }
): Promise<WorkspaceSnapshot> {
  await fs.mkdir(DATA_DIR, { recursive: true });
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
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  return snapshot;
}

export async function markEmailSent(): Promise<void> {
  const existing = await readWorkspace();
  if (!existing) return;
  existing.lastEmailSentAt = new Date().toISOString();
  await fs.writeFile(DATA_FILE, JSON.stringify(existing, null, 2), "utf8");
}
