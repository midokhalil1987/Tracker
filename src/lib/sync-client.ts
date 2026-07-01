import type { Project, Tag, TimeEntry } from "./types";
import { normalizeEmailRecipients } from "./email-recipients";

type SyncPayload = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  emailReportsEnabled: boolean;
  emails: string[];
};

type SyncOptions = {
  /** Legacy Settings → sync secret flow */
  syncSecret?: string;
  /** Use session cookie (logged-in user) */
  useSession?: boolean;
};

type SyncFailure = {
  ok: false;
  error: string;
  setup?: { title: string; steps: readonly string[] };
};

async function postSync(
  payload: SyncPayload,
  headers: Record<string, string>
): Promise<{ ok: true; updatedAt: string } | SyncFailure> {
  const res = await fetch("/api/sync", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
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

export async function syncWorkspace(
  payload: SyncPayload,
  syncSecretOrOptions?: string | SyncOptions
): Promise<{ ok: true; updatedAt: string } | SyncFailure> {
  const options: SyncOptions =
    typeof syncSecretOrOptions === "string"
      ? { syncSecret: syncSecretOrOptions }
      : (syncSecretOrOptions ?? {});

  if (options.useSession) {
    return postSync(payload, {});
  }

  const secret = options.syncSecret?.trim() ?? "";
  if (!secret) {
    return { ok: false, error: "Sync secret is required." };
  }

  return postSync(payload, {
    Authorization: `Bearer ${secret}`,
  });
}

export async function sendTestEmail(
  payload: SyncPayload,
  syncSecretOrOptions?: string | SyncOptions
): Promise<{ ok: true } | SyncFailure> {
  const options: SyncOptions =
    typeof syncSecretOrOptions === "string"
      ? { syncSecret: syncSecretOrOptions }
      : (syncSecretOrOptions ?? {});

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.useSession) {
    // session only
  } else {
    const secret = options.syncSecret?.trim() ?? "";
    if (!secret) {
      return { ok: false, error: "Sync secret is required." };
    }
    headers.Authorization = `Bearer ${secret}`;
  }

  const res = await fetch("/api/email/test", {
    method: "POST",
    credentials: "include",
    headers,
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
