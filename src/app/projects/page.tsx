"use client";

import * as React from "react";
import { Plus, Trash2, DollarSign, FolderKanban } from "lucide-react";
import { useStore, pickDefaultColor } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { PageScroll } from "@/components/page-scroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import {
  cn,
  computeEarnings,
  formatCurrency,
  formatDuration,
} from "@/lib/utils";

const PALETTE = [
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#22c55e",
  "#64748b",
  "#0f172a",
];

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const addProject = useStore((s) => s.addProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const restoreProject = useStore((s) => s.restoreProject);
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [client, setClient] = React.useState("");
  const [color, setColor] = React.useState(pickDefaultColor(projects.length));
  const [billable, setBillable] = React.useState(false);
  const [rate, setRate] = React.useState("");

  const totals = React.useMemo(() => {
    const m = new Map<string, { ms: number; earnings: number }>();
    for (const e of entries) {
      if (!e.projectId) continue;
      const cur = m.get(e.projectId) ?? { ms: 0, earnings: 0 };
      cur.ms += e.endedAt - e.startedAt;
      m.set(e.projectId, cur);
    }
    for (const p of projects) {
      const cur = m.get(p.id);
      if (!cur) continue;
      cur.earnings = computeEarnings(
        entries.filter((e) => e.projectId === p.id),
        [p]
      );
    }
    return m;
  }, [entries, projects]);

  const handleAdd = () => {
    if (!name.trim()) return;
    const parsedRate = rate.trim() ? Number(rate) : NaN;
    addProject({
      name: name.trim(),
      client: client.trim() || undefined,
      color,
      billable,
      hourlyRate:
        Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : undefined,
    });
    setName("");
    setClient("");
    setColor(pickDefaultColor(projects.length + 1));
    setBillable(false);
    setRate("");
    setShowForm(false);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Organize your time by client and project."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> New project
          </Button>
        }
      />
      <PageScroll className="p-4 md:p-6">
        {showForm ? (
          <Card className="mb-5">
            <div className="p-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Website Redesign"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Client (optional)
                </label>
                <Input
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Acme Inc."
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "size-7 rounded-full ring-offset-2 ring-offset-card transition-all cursor-pointer",
                        color === c
                          ? "ring-2 ring-foreground"
                          : "hover:scale-110"
                      )}
                      style={{ background: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Hourly rate (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Defaults
                </label>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer h-9">
                  <input
                    type="checkbox"
                    checked={billable}
                    onChange={(e) => setBillable(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  <span>Billable by default</span>
                </label>
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!name.trim()}>
                  Create project
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <FolderKanban className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first project to organize your time.
            </p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="col-span-5">Project</div>
                <div className="col-span-3">Client</div>
                <div className="col-span-1 text-right">Rate</div>
                <div className="col-span-1 text-right">Tracked</div>
                <div className="col-span-1 text-right">Earned</div>
                <div className="col-span-1"></div>
              </div>
              {projects.map((p) => {
                const totalEntry = totals.get(p.id);
                const total = totalEntry?.ms ?? 0;
                const earned = totalEntry?.earnings ?? 0;
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 px-5 py-3 items-center hover:bg-muted/40 group"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <input
                          type="color"
                          value={p.color}
                          onChange={(e) =>
                            updateProject(p.id, { color: e.target.value })
                          }
                          className="size-6 rounded-full border-2 border-border cursor-pointer opacity-0 absolute inset-0"
                          title="Change color"
                        />
                        <div
                          className="size-6 rounded-full border-2 border-border pointer-events-none"
                          style={{ background: p.color }}
                        />
                      </div>
                      <input
                        defaultValue={p.name}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== p.name)
                            updateProject(p.id, { name: v });
                          else e.target.value = p.name;
                        }}
                        className="flex-1 bg-transparent text-sm font-medium px-2 py-1 -mx-2 rounded hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/60 min-w-0 cursor-text"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateProject(p.id, { billable: !p.billable })
                        }
                        className={cn(
                          "size-7 grid place-items-center rounded-md shrink-0 cursor-pointer",
                          p.billable
                            ? "text-success bg-success/10"
                            : "text-muted-foreground/40 hover:bg-muted"
                        )}
                        title={p.billable ? "Billable" : "Not billable"}
                      >
                        <DollarSign className="size-4" />
                      </button>
                    </div>
                    <div className="col-span-3 text-sm">
                      <input
                        defaultValue={p.client ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (p.client ?? ""))
                            updateProject(p.id, { client: v || undefined });
                        }}
                        placeholder="No client"
                        className="w-full bg-transparent px-2 py-1 -mx-2 rounded text-muted-foreground hover:bg-card focus:bg-card focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 cursor-text"
                      />
                    </div>
                    <div className="col-span-1 text-right text-sm">
                      <div className="relative inline-block">
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          defaultValue={p.hourlyRate ?? ""}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const num = raw ? Number(raw) : NaN;
                            const next =
                              Number.isFinite(num) && num > 0 ? num : undefined;
                            if (next !== p.hourlyRate)
                              updateProject(p.id, { hourlyRate: next });
                            e.target.value =
                              next !== undefined ? String(next) : "";
                          }}
                          placeholder="—"
                          className="w-20 pl-4 pr-1 py-1 text-right rounded bg-transparent hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/60 font-mono tabular-nums cursor-text"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-right font-mono tabular-nums text-sm">
                      {formatDuration(total)}
                    </div>
                    <div className="col-span-1 text-right font-mono tabular-nums text-sm text-success">
                      {earned > 0 ? formatCurrency(earned) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `Delete project "${p.name}"?`,
                              description:
                                "Its time entries will be kept but unassigned.",
                              confirmLabel: "Delete",
                              destructive: true,
                            })
                          ) {
                            const snapshot = { ...p };
                            deleteProject(p.id);
                            toast({
                              message: `Project "${p.name}" deleted`,
                              undo: () => restoreProject(snapshot),
                            });
                          }
                        }}
                        className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </PageScroll>
    </>
  );
}
