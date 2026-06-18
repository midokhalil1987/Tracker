import { APP_NAME, APP_FULL_TITLE } from "@/lib/brand";
import { computeEarnings, toDecimalHours } from "@/lib/utils";
import type { Project, Tag, TimeEntry } from "@/lib/types";

export type EmailReportSummary = {
  entryCount: number;
  projectCount: number;
  tagCount: number;
  totalHours: number;
  billableHours: number;
  earnings: number;
};

export function buildEmailReportSummary(
  projects: Project[],
  tags: Tag[],
  entries: TimeEntry[]
): EmailReportSummary {
  const totalMs = entries.reduce(
    (acc, e) => acc + (e.endedAt - e.startedAt),
    0
  );
  const billableMs = entries
    .filter((e) => e.billable)
    .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);

  return {
    entryCount: entries.length,
    projectCount: projects.length,
    tagCount: tags.length,
    totalHours: toDecimalHours(totalMs),
    billableHours: toDecimalHours(billableMs),
    earnings: computeEarnings(entries, projects),
  };
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTimeReportEmailText({
  filename,
  summary,
}: {
  filename: string;
  summary: EmailReportSummary;
}): string {
  return [
    `${APP_FULL_TITLE}`,
    "",
    "Your weekday time report is attached.",
    "",
    `File: ${filename}`,
    `Entries: ${summary.entryCount}`,
    `Projects: ${summary.projectCount}`,
    `Tags: ${summary.tagCount}`,
    `Total tracked: ${summary.totalHours}h`,
    `Billable: ${summary.billableHours}h`,
    `Earnings (billable × rate): ${formatUsd(summary.earnings)}`,
    "",
    "Open the .xlsx attachment for full project and entry detail.",
    "",
    "—",
    `Sent automatically by ${APP_NAME} on weekdays when email reports are enabled.`,
  ].join("\n");
}

export function buildTimeReportEmailHtml({
  filename,
  summary,
  sentAt = new Date(),
}: {
  filename: string;
  summary: EmailReportSummary;
  sentAt?: Date;
}): string {
  const dateLabel = sentAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const safeFilename = escapeHtml(filename);

  const stat = (label: string, value: string, accent?: boolean) => `
    <td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;width:50%;">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">${escapeHtml(label)}</div>
      <div style="font-size:20px;font-weight:700;color:${accent ? "#059669" : "#0f172a"};font-family:ui-monospace,Menlo,monospace;">${escapeHtml(value)}</div>
    </td>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(APP_NAME)} time report</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="padding:28px 28px 20px;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);">
              <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.15);text-align:center;line-height:40px;font-size:20px;">⏱</div>
              <h1 style="margin:16px 0 6px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${escapeHtml(APP_NAME)}</h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.88);">Your time report is ready</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#334155;">
                Hi — your latest export is attached. Here's a quick snapshot of what's inside.
              </p>
              <p style="margin:0;font-size:13px;color:#64748b;">${escapeHtml(dateLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${stat("Total tracked", `${summary.totalHours}h`)}
                  <td width="8"></td>
                  ${stat("Billable", `${summary.billableHours}h`)}
                </tr>
                <tr><td colspan="3" height="8"></td></tr>
                <tr>
                  ${stat("Earnings", formatUsd(summary.earnings), true)}
                  <td width="8"></td>
                  ${stat("Entries", String(summary.entryCount))}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Attachment</div>
                    <div style="font-size:14px;font-weight:600;color:#0f172a;word-break:break-all;">📎 ${safeFilename}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:6px;">${summary.projectCount} projects · ${summary.tagCount} tags</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                Sent automatically on weekdays when email reports are enabled in ${escapeHtml(APP_NAME)} Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
