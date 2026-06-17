"use client";

import * as React from "react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
  eachDayOfInterval,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download, Calendar, ChevronDown } from "lucide-react";
import { useStore, type ReportsPreset } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectPicker } from "@/components/project-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  cn,
  computeEarnings,
  formatCurrency,
  formatDuration,
  fromDateInputValue,
  toDateInputValue,
  toDecimalHours,
} from "@/lib/utils";

function getPresetRange(
  preset: Exclude<ReportsPreset, "custom">
): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "lastWeek": {
      const lw = subDays(now, 7);
      return {
        start: startOfWeek(lw, { weekStartsOn: 1 }),
        end: endOfWeek(lw, { weekStartsOn: 1 }),
      };
    }
    case "last2Weeks": {
      // The two ISO weeks before this one — i.e. Monday 14 days ago through
      // last Sunday (the day before this Monday).
      const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
      const start = subDays(thisMonday, 14);
      const end = endOfDay(subDays(thisMonday, 1));
      return { start, end };
    }
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "30d":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }
}

const PRESETS: { id: ReportsPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "lastWeek", label: "Last week" },
  { id: "last2Weeks", label: "Last 2 weeks" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
];

export default function ReportsPage() {
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const hydrated = useStore((s) => s.hydrated);
  const filter = useStore((s) => s.reportsFilter);
  const setReportsFilter = useStore((s) => s.setReportsFilter);

  const { preset, projectId: projectFilter, billableOnly } = filter;

  // Resolve persisted "" custom dates to sensible defaults on first use.
  const customFrom =
    filter.customFrom || toDateInputValue(startOfMonth(new Date()));
  const customTo = filter.customTo || toDateInputValue(new Date());

  const range = React.useMemo(() => {
    if (preset === "custom") {
      const fromD = fromDateInputValue(customFrom) ?? startOfMonth(new Date());
      const toD = fromDateInputValue(customTo) ?? new Date();
      const [a, b] =
        fromD.getTime() <= toD.getTime() ? [fromD, toD] : [toD, fromD];
      return { start: startOfDay(a), end: endOfDay(b) };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      // Include an entry if any part of it overlaps the range — so a multi-day
      // entry that starts on day X and ends on day Y still appears when X or
      // Y (or anything in between) falls inside the chosen range.
      if (e.endedAt < range.start.getTime()) return false;
      if (e.startedAt > range.end.getTime()) return false;
      if (projectFilter && e.projectId !== projectFilter) return false;
      if (billableOnly && !e.billable) return false;
      return true;
    });
  }, [entries, range, projectFilter, billableOnly]);

  const totalMs = filtered.reduce(
    (acc, e) => acc + (e.endedAt - e.startedAt),
    0
  );
  const billableMs = filtered
    .filter((e) => e.billable)
    .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
  const earnings = React.useMemo(
    () => computeEarnings(filtered, projects),
    [filtered, projects]
  );

  // Controlled state for the custom-range popover so we can auto-close it
  // after the user commits a range.
  const [rangeOpen, setRangeOpen] = React.useState(false);

  // Daily chart data (limit to <= 60 days for clarity)
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const chartData = days.map((d) => {
    const ds = startOfDay(d).getTime();
    const de = endOfDay(d).getTime();
    const ms = filtered
      .filter((e) => e.startedAt >= ds && e.startedAt <= de)
      .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
    return {
      key: format(d, "yyyy-MM-dd"),
      label: format(d, days.length > 14 ? "MMM d" : "EEE"),
      hours: toDecimalHours(ms),
      ms,
      duration: ms > 0 ? formatDuration(ms) : "",
    };
  });

  const byProject = React.useMemo(() => {
    const m = new Map<string, number>();
    let unassigned = 0;
    for (const e of filtered) {
      const ms = e.endedAt - e.startedAt;
      if (!e.projectId) unassigned += ms;
      else m.set(e.projectId, (m.get(e.projectId) ?? 0) + ms);
    }
    const arr = Array.from(m.entries()).map(([pid, ms]) => {
      const p = projects.find((x) => x.id === pid);
      const earned = p
        ? computeEarnings(
            filtered.filter((e) => e.projectId === pid),
            [p]
          )
        : 0;
      return {
        name: p?.name ?? "Unknown",
        color: p?.color ?? "#94a3b8",
        ms,
        earned,
      };
    });
    if (unassigned > 0) {
      arr.push({
        name: "No project",
        color: "#cbd5e1",
        ms: unassigned,
        earned: 0,
      });
    }
    return arr.sort((a, b) => b.ms - a.ms);
  }, [filtered, projects]);

  const exportCsv = () => {
    const rows = [
      [
        "Description",
        "Project",
        "Client",
        "Tags",
        "Billable",
        "Start",
        "End",
        "Duration (h)",
        "Rate",
        "Earned",
      ],
    ];
    const tagsMap = new Map(useStore.getState().tags.map((t) => [t.id, t.name]));
    for (const e of filtered) {
      const p = projects.find((x) => x.id === e.projectId);
      const hours = toDecimalHours(e.endedAt - e.startedAt);
      const rate = p?.hourlyRate ?? 0;
      const earned = e.billable && rate > 0 ? hours * rate : 0;
      rows.push([
        e.description,
        p?.name ?? "",
        p?.client ?? "",
        e.tagIds.map((id) => tagsMap.get(id) ?? "").join(" "),
        e.billable ? "Yes" : "No",
        new Date(e.startedAt).toISOString(),
        new Date(e.endedAt).toISOString(),
        hours.toFixed(2),
        rate ? rate.toFixed(2) : "",
        earned ? earned.toFixed(2) : "",
      ]);
    }
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-report-${format(range.start, "yyyyMMdd")}-${format(
      range.end,
      "yyyyMMdd"
    )}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) {
    return (
      <>
        <PageHeader title="Reports" />
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Filter and analyze your tracked time."
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Filters */}
        <Card>
          <div className="p-4 md:p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="size-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReportsFilter({ preset: p.id })}
                    className={cn(
                      "px-3 h-8 rounded-md text-sm",
                      preset === p.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/70 text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}

                {/* Custom — a single trigger that opens a calendar range
                    popover. Clicking it switches the preset to "custom" so
                    the chosen range applies. */}
                <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        if (preset !== "custom")
                          setReportsFilter({ preset: "custom" });
                      }}
                      className={cn(
                        "px-3 h-8 rounded-md text-sm inline-flex items-center gap-1.5",
                        preset === "custom"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/70 text-foreground"
                      )}
                    >
                      <span>
                        {preset === "custom"
                          ? `${format(range.start, "MMM d")} – ${format(
                              range.end,
                              "MMM d, yyyy"
                            )}`
                          : "Custom"}
                      </span>
                      <ChevronDown className="size-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-3 w-auto" align="end">
                    <DateRangePicker
                      value={{
                        from: fromDateInputValue(customFrom) ?? null,
                        to: fromDateInputValue(customTo) ?? null,
                      }}
                      onChange={({ from, to }) => {
                        setReportsFilter({
                          customFrom: toDateInputValue(from),
                          customTo: toDateInputValue(to),
                        });
                        setRangeOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ProjectPicker
                value={projectFilter}
                onChange={(id) => setReportsFilter({ projectId: id })}
              />
              <label className="inline-flex items-center gap-2 text-sm h-9 px-3 rounded-md border border-input bg-card cursor-pointer">
                <input
                  type="checkbox"
                  checked={billableOnly}
                  onChange={(e) =>
                    setReportsFilter({ billableOnly: e.target.checked })
                  }
                  className="size-4 accent-primary"
                />
                Billable only
              </label>
            </div>
          </div>
          <div className="px-5 pb-4 text-xs text-muted-foreground">
            {format(range.start, "MMM d, yyyy")} —{" "}
            {format(range.end, "MMM d, yyyy")}
          </div>
        </Card>

        {/* Summary */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Total time</p>
              <p className="text-2xl font-semibold mt-1 font-mono tabular-nums">
                {formatDuration(totalMs)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {toDecimalHours(totalMs)} hours
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Billable</p>
              <p className="text-2xl font-semibold mt-1 font-mono tabular-nums">
                {formatDuration(billableMs)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalMs > 0
                  ? `${Math.round((billableMs / totalMs) * 100)}% of total`
                  : "—"}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Earnings</p>
              <p className="text-2xl font-semibold mt-1 font-mono tabular-nums text-success">
                {formatCurrency(earnings)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                billable × project rate
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">Entries</p>
              <p className="text-2xl font-semibold mt-1 font-mono tabular-nums">
                {filtered.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                across {byProject.length}{" "}
                {byProject.length === 1 ? "project" : "projects"}
              </p>
            </div>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-base font-semibold">Time over period</h2>
          </div>
          <div className="p-2 pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 28, right: 20, bottom: 0, left: -10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  interval={chartData.length > 20 ? Math.ceil(chartData.length / 10) : 0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(_value, _name, item) => [
                    item.payload.ms > 0 ? item.payload.duration : "0:00:00",
                    "Tracked",
                  ]}
                />
                <Bar
                  dataKey="hours"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  <LabelList
                    dataKey="duration"
                    position="top"
                    fill="var(--foreground)"
                    fontSize={10}
                    fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By project breakdown */}
        <Card>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold">Breakdown by project</h2>
          </div>
          <div className="divide-y divide-border">
            {byProject.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No entries match the current filters.
              </div>
            ) : (
              byProject.map((p) => {
                const pct = totalMs > 0 ? (p.ms / totalMs) * 100 : 0;
                return (
                  <div key={p.name} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ background: p.color }}
                        />
                        <span className="truncate text-sm">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm shrink-0">
                        <span className="text-muted-foreground text-xs">
                          {pct.toFixed(0)}%
                        </span>
                        {p.earned > 0 ? (
                          <span className="font-mono tabular-nums text-success text-xs w-20 text-right">
                            {formatCurrency(p.earned)}
                          </span>
                        ) : (
                          <span className="w-20" />
                        )}
                        <span className="font-mono tabular-nums font-semibold w-20 text-right">
                          {formatDuration(p.ms)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: p.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
