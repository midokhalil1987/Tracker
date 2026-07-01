import { NextResponse } from "next/server";
import { authorizeSync } from "@/lib/server/auth";
import { normalizeEmailRecipients } from "@/lib/email-recipients";
import { isEmailConfigured, sendXlsxEmailToRecipients } from "@/lib/server/email";
import { buildEmailReportSummary } from "@/lib/server/email-template";
import { readWorkspace } from "@/lib/server/workspace-store";
import { buildXlsxBuffer, xlsxFilenameForDate } from "@/lib/xlsx-export";
import type { Project, Tag, TimeEntry } from "@/lib/types";

export const runtime = "nodejs";

type TestBody = {
  projects?: Project[];
  tags?: Tag[];
  entries?: TimeEntry[];
  emails?: string[];
  /** @deprecated */
  email?: string;
};

export async function POST(req: Request) {
  const auth = await authorizeSync(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "SMTP is not configured on the server." },
      { status: 503 }
    );
  }

  let body: TestBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as TestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fromBody =
    Array.isArray(body.projects) &&
    Array.isArray(body.tags) &&
    Array.isArray(body.entries);

  const userId = auth.type === "session" ? auth.user.id : undefined;
  const fallback =
    auth.type === "session" && auth.user.email
      ? auth.user.email
      : process.env.EMAIL_TO?.trim() || "midokhalil1987@gmail.com";

  const workspace = fromBody
    ? {
        projects: body.projects!,
        tags: body.tags!,
        entries: body.entries!,
        emails: normalizeEmailRecipients(body.emails ?? body.email, fallback),
      }
    : await readWorkspace(userId).then((w) =>
        w
          ? {
              projects: w.projects,
              tags: w.tags,
              entries: w.entries,
              emails: w.emailReportsEnabled
                ? w.emails
                : normalizeEmailRecipients(w.emails, fallback),
            }
          : null
      );

  if (!workspace || workspace.emails.length === 0) {
    return NextResponse.json(
      {
        error:
          "No workspace data or valid recipient emails. Add at least one email in Settings.",
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

  return NextResponse.json({
    ok: true,
    to: workspace.emails,
    filename,
  });
}
