import type { Project, Tag, TimeEntry } from "./types";

type SyncPayload = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  emailReportsEnabled: boolean;
  email: string;
};

export async function syncWorkspace(
  payload: SyncPayload,
  syncSecret: string
): Promise<
  | { ok: true; updatedAt: string }
  | {
      ok: false;
      error: string;
      setup?: { title: string; steps: readonly string[] };
    }
> {
  if (!syncSecret.trim()) {
    return { ok: false, error: "Sync secret is required." };
  }

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncSecret.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    updatedAt?: string;
    setup?: { title: string; steps: readonly string[] };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? `Sync failed (${res.status}).`,
      setup: data.setup,
    };
  }

  return { ok: true, updatedAt: data.updatedAt ?? new Date().toISOString() };
}

export async function sendTestEmail(
  payload: SyncPayload,
  syncSecret: string
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: string;
      setup?: { title: string; steps: readonly string[] };
    }
> {
  if (!syncSecret.trim()) {
    return { ok: false, error: "Sync secret is required." };
  }

  const res = await fetch("/api/email/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncSecret.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    setup?: { title: string; steps: readonly string[] };
  };
  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? `Test email failed (${res.status}).`,
      setup: data.setup,
    };
  }
  return { ok: true };
}
