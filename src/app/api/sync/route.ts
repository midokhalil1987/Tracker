import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/server/auth";
import { writeWorkspace } from "@/lib/server/workspace-store";
import type { Project, Tag, TimeEntry } from "@/lib/types";

type SyncBody = {
  projects?: Project[];
  tags?: Tag[];
  entries?: TimeEntry[];
  emailReportsEnabled?: boolean;
  email?: string;
};

export async function POST(req: Request) {
  if (!verifyBearer(req, "SYNC_SECRET")) {
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
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim()
      : process.env.EMAIL_TO?.trim() || "midokhalil1987@gmail.com";

  const snapshot = await writeWorkspace({
    projects,
    tags,
    entries,
    emailReportsEnabled,
    email,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: snapshot.updatedAt,
    counts: {
      projects: projects.length,
      tags: tags.length,
      entries: entries.length,
    },
  });
}
