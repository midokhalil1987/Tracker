import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/server/auth";
import {
  alreadySentToday,
  isWeekday,
  todayKey,
} from "@/lib/server/cron";
import { isEmailConfigured, sendXlsxEmail } from "@/lib/server/email";
import { buildEmailReportSummary } from "@/lib/server/email-template";
import {
  markEmailSent,
  readWorkspace,
} from "@/lib/server/workspace-store";
import { buildXlsxBuffer, xlsxFilenameForDate } from "@/lib/xlsx-export";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!verifyBearer(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isWeekday()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "weekend",
    });
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
      { error: "No synced workspace data yet." },
      { status: 404 }
    );
  }

  if (!workspace.emailReportsEnabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "email_reports_disabled",
    });
  }

  if (alreadySentToday(workspace.lastEmailSentAt)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "already_sent_today",
      day: todayKey(),
    });
  }

  const filename = xlsxFilenameForDate(new Date());
  const buffer = await buildXlsxBuffer({
    projects: workspace.projects,
    tags: workspace.tags,
    entries: workspace.entries,
  });

  const summary = buildEmailReportSummary(
    workspace.projects,
    workspace.tags,
    workspace.entries
  );

  await sendXlsxEmail({
    to: workspace.email,
    filename,
    buffer,
    summary,
  });
  await markEmailSent();

  return NextResponse.json({
    ok: true,
    sent: true,
    to: workspace.email,
    filename,
    counts: {
      projects: workspace.projects.length,
      tags: workspace.tags.length,
      entries: workspace.entries.length,
    },
  });
}
