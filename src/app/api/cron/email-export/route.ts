import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/server/auth";
import {
  alreadySentToday,
  isWeekday,
  todayKey,
} from "@/lib/server/cron";
import { isEmailConfigured, sendXlsxEmailToRecipients } from "@/lib/server/email";
import { buildEmailReportSummary } from "@/lib/server/email-template";
import {
  listCronWorkspaces,
  markEmailSent,
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

  const workspaces = await listCronWorkspaces();
  if (workspaces.length === 0) {
    return NextResponse.json(
      { error: "No synced workspace data yet." },
      { status: 404 }
    );
  }

  const filename = xlsxFilenameForDate(new Date());
  const sent: Array<{ userId: string | null; to: string; filename: string }> =
    [];
  const skipped: Array<{ userId: string | null; reason: string }> = [];

  for (const { userId, workspace } of workspaces) {
    if (!workspace.emailReportsEnabled) {
      skipped.push({ userId, reason: "email_reports_disabled" });
      continue;
    }

    if (alreadySentToday(workspace.lastEmailSentAt)) {
      skipped.push({ userId, reason: "already_sent_today" });
      continue;
    }

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

    await sendXlsxEmailToRecipients({
      to: workspace.emails,
      filename,
      buffer,
      summary,
    });
    await markEmailSent(userId ?? undefined);

    sent.push({
      userId,
      to: workspace.emails.join(", "),
      filename,
    });
  }

  if (sent.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: skipped[0]?.reason ?? "no_eligible_workspaces",
      day: todayKey(),
      skippedDetails: skipped,
    });
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    day: todayKey(),
    deliveries: sent,
    skippedDetails: skipped,
  });
}
