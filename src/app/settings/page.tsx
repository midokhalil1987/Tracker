"use client";

import * as React from "react";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { PageScroll } from "@/components/page-scroll";
import { ScrollRevealGroup } from "@/components/scroll-reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FieldLabel } from "@/components/ui/field-label";
import { ThemeSelector } from "@/components/theme-selector";
import { cn } from "@/lib/utils";
import { exportToXlsx, importFromXlsx, type ImportResult } from "@/lib/xlsx";
import { sendTestEmail, syncWorkspace } from "@/lib/sync-client";
import { useConfirm } from "@/components/confirm-dialog";
import { useAuth } from "@/components/auth-provider";
import { EmailRecipientsEditor } from "@/components/email-recipients-editor";
import {
  formatRecipientList,
  isValidEmail,
  normalizeEmailRecipients,
} from "@/lib/email-recipients";

type ImportSummary = {
  warnings: string[];
  mode: "replace" | "merge";
  counts: {
    projects: number;
    tags: number;
    entries: number;
  };
};

export default function SettingsPage() {
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const entries = useStore((s) => s.entries);
  const replaceAll = useStore((s) => s.replaceAll);
  const mergeImport = useStore((s) => s.mergeImport);
  const hydrated = useStore((s) => s.hydrated);
  const emailReports = useStore((s) => s.emailReports);
  const setEmailReports = useStore((s) => s.setEmailReports);
  const freelanceGoals = useStore((s) => s.freelanceGoals);
  const setFreelanceGoals = useStore((s) => s.setFreelanceGoals);
  const confirm = useConfirm();
  const { user } = useAuth();

  const [mode, setMode] = React.useState<"merge" | "replace">("merge");
  const [busy, setBusy] = React.useState<
    "export" | "import" | "sync" | "test-email" | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);
  const [emailMessage, setEmailMessage] = React.useState<string | null>(null);
  const [storageSetup, setStorageSetup] = React.useState<string[] | null>(null);
  const [success, setSuccess] = React.useState<ImportSummary | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    setError(null);
    setEmailMessage(null);
    setBusy("export");
    try {
      await exportToXlsx({ projects, tags, entries });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to export workbook."
      );
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setEmailMessage(null);
    setSuccess(null);
    setBusy("import");
    try {
      const buffer = await file.arrayBuffer();
      const parsed: ImportResult = await importFromXlsx(buffer);

      if (
        parsed.projects.length === 0 &&
        parsed.tags.length === 0 &&
        parsed.entries.length === 0
      ) {
        setError(
          "No recognizable data found. Expected sheets named “Projects”, “Tags” and “Time Entries”."
        );
        return;
      }

      let counts = {
        projects: parsed.projects.length,
        tags: parsed.tags.length,
        entries: parsed.entries.length,
      };

      if (mode === "replace") {
        const ok = await confirm({
          title: "Replace all existing data?",
          description:
            `This will overwrite ${projects.length} projects, ${tags.length} tags ` +
            `and ${entries.length} entries with the data from this file ` +
            `(${counts.projects} projects, ${counts.tags} tags, ${counts.entries} entries).`,
          confirmLabel: "Replace all",
          destructive: true,
        });
        if (!ok) return;
        replaceAll(parsed);
      } else {
        const result = mergeImport(parsed);
        counts = {
          projects: result.addedProjects,
          tags: result.addedTags,
          entries: result.addedEntries,
        };
      }

      setSuccess({
        warnings: parsed.warnings,
        mode,
        counts,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to read the file. Is it a valid .xlsx workbook?"
      );
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runSync = React.useCallback(async () => {
    const emails = normalizeEmailRecipients(
      emailReports.emails,
      user?.email ?? emailReports.emails[0] ?? ""
    );
    if (emails.length === 0) {
      throw new Error("Add at least one valid recipient email.");
    }

    const syncOptions = user
      ? { useSession: true as const }
      : emailReports.syncSecret;

    const result = await syncWorkspace(
      {
        projects,
        tags,
        entries,
        emailReportsEnabled: emailReports.enabled,
        emails,
      },
      syncOptions
    );
    if (!result.ok) {
      const err = new Error(result.error) as Error & {
        setup?: { steps: readonly string[] };
      };
      if (result.setup) err.setup = result.setup;
      throw err;
    }
    setEmailReports({ lastSyncedAt: Date.now() });
    return result;
  }, [
    projects,
    tags,
    entries,
    emailReports.enabled,
    emailReports.emails,
    emailReports.syncSecret,
    setEmailReports,
    user,
  ]);

  const handleSyncNow = async () => {
    setError(null);
    setEmailMessage(null);
    setStorageSetup(null);
    setBusy("sync");
    try {
      await runSync();
      setEmailMessage("Workspace synced to the server.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
      const setup = (e as Error & { setup?: { steps: readonly string[] } })
        .setup?.steps;
      if (setup) setStorageSetup([...setup]);
    } finally {
      setBusy(null);
    }
  };

  const handleTestEmail = async () => {
    setError(null);
    setEmailMessage(null);
    setStorageSetup(null);
    if (!user && !emailReports.syncSecret.trim()) {
      setError(
        "Enter the sync secret first (must match SYNC_SECRET on the server)."
      );
      return;
    }

    const emails = normalizeEmailRecipients(
      emailReports.emails,
      user?.email ?? emailReports.emails[0] ?? ""
    );
    if (emails.length === 0) {
      setError("Add at least one valid recipient email.");
      return;
    }
    if (emailReports.emails.some((e) => e.trim() && !isValidEmail(e))) {
      setError("Fix invalid email addresses before sending.");
      return;
    }

    setBusy("test-email");
    try {
      const result = await sendTestEmail(
        {
          projects,
          tags,
          entries,
          emailReportsEnabled: emailReports.enabled,
          emails,
        },
        user ? { useSession: true } : emailReports.syncSecret
      );
      if (!result.ok) {
        setError(result.error);
        if (result.setup?.steps) setStorageSetup([...result.setup.steps]);
        return;
      }
      setEmailMessage(`Test email sent to ${formatRecipientList(emails)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test email failed.");
    } finally {
      setBusy(null);
    }
  };

  const lastSyncedLabel =
    emailReports.lastSyncedAt != null
      ? new Date(emailReports.lastSyncedAt).toLocaleString()
      : "Never";

  return (
    <>
      <PageHeader
        title="Settings"
        description="Backup, restore and bulk-edit your data."
      />
      <PageScroll className="p-4 md:p-6">
        <ScrollRevealGroup className="space-y-5">
        {/* Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Current workspace</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Stat label="Projects" value={hydrated ? projects.length : "—"} />
            <Stat label="Tags" value={hydrated ? tags.length : "—"} />
            <Stat label="Time entries" value={hydrated ? entries.length : "—"} />
          </CardContent>
        </Card>

        {/* Freelance goals */}
        <Card>
          <CardHeader>
            <CardTitle>Freelance goals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly targets for billable hours and earnings. Shown on the timer
              and dashboard.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FieldLabel>Billable hours / week</FieldLabel>
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                value={freelanceGoals.weeklyHoursTarget}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) {
                    setFreelanceGoals({ weeklyHoursTarget: n });
                  }
                }}
              />
            </FormField>
            <FormField>
              <FieldLabel>Earnings goal / week (optional)</FieldLabel>
              <Input
                type="number"
                min={0}
                step={50}
                placeholder="0 = hidden"
                value={
                  freelanceGoals.weeklyEarningsTarget || ""
                }
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setFreelanceGoals({
                    weeklyEarningsTarget:
                      Number.isFinite(n) && n >= 0 ? n : 0,
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Uses project hourly rates on billable entries.
              </p>
            </FormField>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose light, dark, or follow your system preference. Your choice
              is saved on this device.
            </p>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Weekday email export */}
        <Card>
          <CardHeader>
            <CardTitle>Weekday email export</CardTitle>
            <p className="text-sm text-muted-foreground">
              Email your full <code className="text-xs">.xlsx</code> export to
              up to three addresses every Monday–Friday morning (8:00 AM Cairo
              time when deployed on Vercel). Your browser syncs data to the
              server so the scheduled job can attach the latest workbook.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input accent-primary"
                checked={emailReports.enabled}
                onChange={(e) =>
                  setEmailReports({ enabled: e.target.checked })
                }
              />
              <span>
                <span className="text-sm font-medium block">
                  Send weekday email reports
                </span>
                <span className="text-xs text-muted-foreground">
                  When enabled, changes sync to the server automatically.
                </span>
              </span>
            </label>

            <EmailRecipientsEditor
              emails={emailReports.emails}
              onChange={(emails) => setEmailReports({ emails })}
              disabled={busy !== null}
            />

            {user ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                Signed in as <span className="font-medium">{user.username}</span>
                . Your workspace syncs automatically to your private cloud
                storage — no sync secret needed.
              </p>
            ) : (
              <FormField>
                <FieldLabel section>Sync secret</FieldLabel>
                <Input
                  type="password"
                  value={emailReports.syncSecret}
                  onChange={(e) =>
                    setEmailReports({ syncSecret: e.target.value })
                  }
                  placeholder="Same value as SYNC_SECRET in .env.local"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Set <code className="text-xs">SYNC_SECRET</code> in Vercel →
                  Settings → Environment Variables (same value here). Or{" "}
                  <a href="/register" className="text-primary underline">
                    create an account
                  </a>{" "}
                  to skip this step.
                </p>
              </FormField>
            )}

            <details className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                Vercel: connect Upstash Redis (required for Sync)
              </summary>
              <ol className="mt-2 ml-4 list-decimal space-y-1.5 leading-relaxed">
                <li>
                  <a
                    className="text-primary underline"
                    href="https://console.upstash.com/redis"
                    target="_blank"
                    rel="noreferrer"
                  >
                    console.upstash.com/redis
                  </a>{" "}
                  → Create database
                </li>
                <li>Copy REST URL and REST TOKEN</li>
                <li>
                  Vercel → Tracker → Settings → Environment Variables → add{" "}
                  <code>UPSTASH_REDIS_REST_URL</code> and{" "}
                  <code>UPSTASH_REDIS_REST_TOKEN</code>
                </li>
                <li>Redeploy, then check /api/health/storage (ready: true)</li>
              </ol>
            </details>

            <p className="text-xs text-muted-foreground">
              Last synced: <span className="font-mono">{lastSyncedLabel}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void handleSyncNow()}
                disabled={busy !== null}
              >
                {busy === "sync" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                Sync now
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleTestEmail()}
                disabled={busy !== null}
              >
                {busy === "test-email" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                Send test email
              </Button>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <span>{error}</span>
                  {storageSetup ? (
                    <ol className="ml-4 list-decimal text-xs space-y-1 text-danger/90">
                      {storageSetup.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </div>
            ) : null}

            {emailMessage ? (
              <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                <span>{emailMessage}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle>Export to Excel</CardTitle>
            <p className="text-sm text-muted-foreground">
              Download a single <code className="text-xs">.xlsx</code>{" "}
              workbook with three sheets — <b>Projects</b>, <b>Tags</b> and{" "}
              <b>Time Entries</b>. The <b>Project</b>, <b>Tags</b> and{" "}
              <b>Billable</b> columns are real Excel dropdowns sourced from
              the Projects and Tags sheets, so editing rows in Excel /
              Google Sheets is effortless and validated.
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={busy !== null}>
              {busy === "export" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download time-tracker.xlsx
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle>Import from Excel</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload an <code className="text-xs">.xlsx</code> file produced by
              this app (or with matching sheet names / column headers).
              Unknown projects and tags will be created automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField>
              <FieldLabel section>Import mode</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <ModeOption
                  active={mode === "merge"}
                  onClick={() => setMode("merge")}
                  title="Merge"
                  description="Add new items; skip duplicates by ID or name."
                />
                <ModeOption
                  active={mode === "replace"}
                  onClick={() => setMode("replace")}
                  title="Replace all"
                  description="Wipe existing data and use only what's in the file."
                  destructive
                />
              </div>
            </FormField>

            <label
              className={cn(
                "flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center",
                busy === "import"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/60 hover:bg-muted/40"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              {busy === "import" ? (
                <Loader2 className="size-7 text-primary animate-spin" />
              ) : (
                <FileSpreadsheet className="size-7 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {busy === "import"
                    ? "Reading workbook..."
                    : "Click to choose an .xlsx file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Up to ~10 000 rows tested. Drag a file to your Downloads first if needed.
                </p>
              </div>
            </label>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {success ? (
              <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm space-y-2">
                <div className="flex items-start gap-2 text-success">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                  <span>
                    {success.mode === "replace"
                      ? `Data replaced — now ${success.counts.projects} projects, ${success.counts.tags} tags, ${success.counts.entries} entries.`
                      : `Merged — added ${success.counts.projects} project(s), ${success.counts.tags} tag(s) and ${success.counts.entries} entry/entries.`}
                  </span>
                </div>
                {success.warnings.length > 0 ? (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none">
                      {success.warnings.length} warning(s)
                    </summary>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      {success.warnings.slice(0, 20).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {success.warnings.length > 20 ? (
                        <li>
                          ...and {success.warnings.length - 20} more (hidden).
                        </li>
                      ) : null}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workbook format</CardTitle>
            <p className="text-sm text-muted-foreground">
              Three sheets, only the columns you actually edit. No internal IDs
              or derived columns.
            </p>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <FormatBlock
              title="Projects"
              columns="Name · Client · Hourly Rate · Billable · Color"
            />
            <FormatBlock title="Tags" columns="Name" />
            <FormatBlock
              title="Time Entries"
              columns="Date · Start · Duration · Description · Project ▾ · Tags ▾ · Billable ▾"
            />
            <p className="text-xs text-muted-foreground">
              ▾ = dropdown. <b>Project</b> and <b>Billable</b> only accept
              listed values; <b>Tags</b> suggests known tag names but still
              lets you type comma-separated multi-tag values.
            </p>
            <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <p>
                <b>Date</b> — a calendar day (any Excel date cell or{" "}
                <code className="text-xs">YYYY-MM-DD</code>).
              </p>
              <p>
                <b>Start</b> — time of day, e.g.{" "}
                <code className="text-xs">9:00 AM</code> or{" "}
                <code className="text-xs">14:30</code> (24-hour also
                accepted). Defaults to <code className="text-xs">9:00 AM</code>{" "}
                if blank.
              </p>
              <p>
                <b>Duration</b> —{" "}
                <code className="text-xs">HH:MM:SS</code> (e.g.{" "}
                <code className="text-xs">09:54:49</code>),{" "}
                <code className="text-xs">HH:MM</code> (e.g.{" "}
                <code className="text-xs">1:30</code>) or decimal hours (e.g.{" "}
                <code className="text-xs">1.5</code>). Excel may display{" "}
                <code className="text-xs">9:54:49 AM</code> for time-formatted
                cells — that is accepted on import. Exported files use Excel{" "}
                <code className="text-xs">[h]:mm:ss</code> (no AM/PM). You can
                also supply an <code className="text-xs">End</code> column
                instead.
              </p>
              <p>
                <b>Project</b> &amp; <b>Tags</b> — referenced by name. Unknown
                names are created automatically.
              </p>
              <p>
                <b>Billable</b> — <code className="text-xs">Yes</code> /{" "}
                <code className="text-xs">No</code> (also accepts{" "}
                <code className="text-xs">true/false</code>,{" "}
                <code className="text-xs">1/0</code>).
              </p>
              <p>
                Tags column accepts comma, semicolon or pipe separators.
                Headers and sheet names are matched case-insensitively, with
                aliases (e.g. <code className="text-xs">Started At</code>,{" "}
                <code className="text-xs">From</code> for{" "}
                <code className="text-xs">Start</code>).
              </p>
            </div>
          </CardContent>
        </Card>
        </ScrollRevealGroup>
      </PageScroll>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-0.5 font-mono tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  description,
  destructive,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[200px] text-left px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer",
        active
          ? destructive
            ? "border-danger bg-danger/5"
            : "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 bg-card"
      )}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className={cn(
            "size-3 rounded-full border-2",
            active
              ? destructive
                ? "border-danger bg-danger"
                : "border-primary bg-primary"
              : "border-border"
          )}
        />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground ml-5">{description}</p>
    </button>
  );
}

function FormatBlock({
  title,
  columns,
}: {
  title: string;
  columns: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </p>
      <p className="text-xs font-mono text-foreground/80 break-all">
        {columns}
      </p>
    </div>
  );
}
