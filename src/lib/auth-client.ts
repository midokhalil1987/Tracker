import type { PublicUser } from "@/lib/auth/types";
import type { Project, Tag, TimeEntry } from "@/lib/types";

export type WorkspacePayload = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  emailReportsEnabled: boolean;
  emails: string[];
  updatedAt: string | null;
  lastEmailSentAt: string | null;
};

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  const data = await parseJson<{ user: PublicUser }>(res);
  return data.user ?? null;
}

export async function login(
  identifier: string,
  password: string
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await parseJson<{ user?: PublicUser; error?: string }>(res);
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not sign in." };
  }
  if (!data.user) {
    return { ok: false, error: "Could not sign in." };
  }
  return { ok: true, user: data.user };
}

export async function register(
  email: string,
  username: string,
  password: string
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await parseJson<{ user?: PublicUser; error?: string }>(res);
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not create account." };
  }
  if (!data.user) {
    return { ok: false, error: "Could not create account." };
  }
  return { ok: true, user: data.user };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchWorkspace(): Promise<
  | { ok: true; workspace: WorkspacePayload }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/workspace", { credentials: "include" });
  const data = await parseJson<{
    workspace?: WorkspacePayload;
    error?: string;
  }>(res);
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Failed to load workspace." };
  }
  if (!data.workspace) {
    return { ok: false, error: "Failed to load workspace." };
  }
  return { ok: true, workspace: data.workspace };
}
