import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/server/auth";
import { isEmailConfigured, sendXlsxEmail } from "@/lib/server/email";
import { readWorkspace } from "@/lib/server/workspace-store";
import { buildXlsxBuffer, xlsxFilenameForDate } from "@/lib/xlsx-export";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!verifyBearer(req, "SYNC_SECRET")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "SMTP is not configured on the server." },
      { status: 503 }
    );
  }

  const workspace = await readWorkspace();
  if (!workspace) {
    return NextResponse.json(
      {
        error:
          "No synced data yet. Enable email reports and sync your workspace first.",
      },
      { status: 404 }
    );
  }

  const filename = xlsxFilenameForDate(new Date());
  const buffer = await buildXlsxBuffer({
    projects: workspace.projects,
    tags: workspace.tags,
    entries: workspace.entries,
  });

  const to = workspace.emailReportsEnabled
    ? workspace.email
    : process.env.EMAIL_TO?.trim() || workspace.email;

  await sendXlsxEmail({ to, filename, buffer });

  return NextResponse.json({ ok: true, to, filename });
}
