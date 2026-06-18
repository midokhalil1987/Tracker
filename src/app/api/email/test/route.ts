import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/server/auth";
import { isEmailConfigured, sendXlsxEmail } from "@/lib/server/email";
import { buildEmailReportSummary } from "@/lib/server/email-template";
import { readWorkspace } from "@/lib/server/workspace-store";
import { buildXlsxBuffer, xlsxFilenameForDate } from "@/lib/xlsx-export";
import type { Project, Tag, TimeEntry } from "@/lib/types";

export const runtime = "nodejs";

type TestBody = {
  projects?: Project[];
  tags?: Tag[];
  entries?: TimeEntry[];
  email?: string;
};

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

  const workspace = fromBody
    ? {
        projects: body.projects!,
        tags: body.tags!,
        entries: body.entries!,
        email:
          typeof body.email === "string" && body.email.trim()
            ? body.email.trim()
            : process.env.EMAIL_TO?.trim() || "midokhalil1987@gmail.com",
      }
    : await readWorkspace().then((w) =>
        w
          ? {
              projects: w.projects,
              tags: w.tags,
              entries: w.entries,
              email: w.emailReportsEnabled
                ? w.email
                : process.env.EMAIL_TO?.trim() || w.email,
            }
          : null
      );

  if (!workspace) {
    return NextResponse.json(
      {
        error:
          "No workspace data. Send a test from Settings (includes your data) or sync to the server first.",
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

  await sendXlsxEmail({
    to: workspace.email,
    filename,
    buffer,
    summary,
  });

  return NextResponse.json({ ok: true, to: workspace.email, filename });
}
