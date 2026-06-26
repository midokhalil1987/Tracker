"use client";

import * as React from "react";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
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
import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { resolveDateRange } from "@/lib/date-range-presets";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectPicker } from "@/components/project-picker";
import { DateRangeFilterCard } from "@/components/date-range-filter-card";
import { EarningsSummaryCard } from "@/components/earnings-summary-card";
import { PageScroll } from "@/components/page-scroll";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  computeEarnings,
  formatCurrency,
  formatDuration,
  fromDateInputValue,
  toDateInputValue,
  toDecimalHours,
} from "@/lib/utils";

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

  const range = React.useMemo(
    () => resolveDateRange(preset, customFrom, customTo, fromDateInputValue),
    [preset, customFrom, customTo]
  );

  const filtered = React.useMemo(() => {
    const rangeStart = range.start.getTime();
    const rangeEnd = range.end.getTime();
    return entries.filter((e) => {
      // Attribute each entry to the day it started (matches the chart).
      if (e.startedAt < rangeStart) return false;
      if (e.startedAt > rangeEnd) return false;
      if (projectFilter && e.projectId !== projectFilter) return false;
      if (billableOnly && !e.billable) return false;
      return true;
    });
  }, [entries, range, projectFilter, billableOnly]);

  const entryMs = (e: (typeof filtered)[number]) => e.endedAt - e.startedAt;

  const totalMs = filtered.reduce((acc, e) => acc + entryMs(e), 0);
  const billableMs = filtered
    .filter((e) => e.billable)
    .reduce((acc, e) => acc + entryMs(e), 0);
  const earnings = React.useMemo(
    () => computeEarnings(filtered, projects),
    [filtered, projects]
  );

  const setCustomRange = (from: string, to: string) => {
    setReportsFilter({ customFrom: from, customTo: to });
  };

  // Daily chart data (limit to <= 60 days for clarity)
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const chartData = days.map((d) => {
    const ds = startOfDay(d).getTime();
    const de = endOfDay(d).getTime();
    const ms = filtered
      .filter((e) => e.startedAt >= ds && e.startedAt <= de)
      .reduce((acc, e) => acc + entryMs(e), 0);
    return {
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE, MMM d"),
      hours: toDecimalHours(ms),
      ms,
      duration: ms > 0 ? formatDuration(ms) : "",
    };
  });

  const byProject = React.useMemo(() => {
    const m = new Map<string, number>();
    let unassigned = 0;
    for (const e of filtered) {
      const ms = entryMs(e);
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
      <PageScroll className="p-4 md:p-6 space-y-5">
        <ScrollReveal>
        {/* Filters */}
        <DateRangeFilterCard
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          range={range}
          onPresetChange={(id) => setReportsFilter({ preset: id })}
          onCustomRangeChange={setCustomRange}
          extra={
            <>
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
            </>
          }
        />
        </ScrollReveal>

        <ScrollReveal delay={60}>
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
          <EarningsSummaryCard earnings={earnings} />
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
        </ScrollReveal>

        <ScrollReveal delay={120}>
        {/* Chart */}
        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-base font-semibold">Time over period</h2>
          </div>
          <div className="p-2 pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 28, right: 20, bottom: 8, left: -10 }}
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
                    String(item.payload.label ?? "Tracked"),
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
        </ScrollReveal>

        <ScrollReveal delay={180}>
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
        </ScrollReveal>
      </PageScroll>
    </>
  );
}
