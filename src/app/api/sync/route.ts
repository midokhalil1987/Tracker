import { NextResponse } from "next/server";
import { authorizeSync } from "@/lib/server/auth";
import { normalizeEmailRecipients } from "@/lib/email-recipients";
import { writeWorkspace, StorageNotConfiguredError } from "@/lib/server/workspace-store";
import type { Project, Tag, TimeEntry } from "@/lib/types";

export const runtime = "nodejs";

type SyncBody = {
  projects?: Project[];
  tags?: Tag[];
  entries?: TimeEntry[];
  emailReportsEnabled?: boolean;
  emails?: string[];
  /** @deprecated */
  email?: string;
};

export async function POST(req: Request) {
  const auth = await authorizeSync(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: SyncBody;
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const projects = Array.isArray(body.projects) ? body.projects : [];
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const entries = Array.isArray(body.entries) ? body.entries : [];
  const emailReportsEnabled = Boolean(body.emailReportsEnabled);
  const fallback =
    auth.type === "session" && auth.user.email
      ? auth.user.email
      : process.env.EMAIL_TO?.trim() || "midokhalil1987@gmail.com";
  const emails = normalizeEmailRecipients(
    body.emails ?? body.email,
    fallback
  );

  const userId = auth.type === "session" ? auth.user.id : undefined;

  try {
    const snapshot = await writeWorkspace(
      {
        projects,
        tags,
        entries,
        emailReportsEnabled,
        emails,
      },
      userId
    );

    return NextResponse.json({
      ok: true,
      updatedAt: snapshot.updatedAt,
      counts: {
        projects: projects.length,
        tags: tags.length,
        entries: entries.length,
      },
    });
  } catch (error) {
    console.error("[api/sync]", error);
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: error.message, setup: error.setup },
        { status: 503 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to save workspace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
