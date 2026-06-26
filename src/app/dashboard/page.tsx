"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  eachDayOfInterval,
  format,
  isWithinInterval,
} from "date-fns";
import { TrendingUp, Clock, Target, Wallet } from "lucide-react";
import { useStore, type ReportsPreset } from "@/lib/store";
import { periodLabel, resolveDateRange } from "@/lib/date-range-presets";
import { PageHeader } from "@/components/page-header";
import { PageScroll } from "@/components/page-scroll";
import { ScrollReveal } from "@/components/scroll-reveal";
import { DateRangeFilterCard } from "@/components/date-range-filter-card";
import { EarningsSummaryCard } from "@/components/earnings-summary-card";
import { Card } from "@/components/ui/card";
import {
  computeEarnings,
  formatCurrency,
  formatDuration,
  fromDateInputValue,
  toDateInputValue,
  toDecimalHours,
} from "@/lib/utils";

export default function DashboardPage() {
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const freelanceGoals = useStore((s) => s.freelanceGoals);
  const hydrated = useStore((s) => s.hydrated);

  const [preset, setPreset] = React.useState<ReportsPreset>("week");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");

  const resolvedCustomFrom =
    customFrom || toDateInputValue(startOfMonth(new Date()));
  const resolvedCustomTo = customTo || toDateInputValue(new Date());

  const range = React.useMemo(
    () =>
      resolveDateRange(
        preset,
        resolvedCustomFrom,
        resolvedCustomTo,
        fromDateInputValue
      ),
    [preset, resolvedCustomFrom, resolvedCustomTo]
  );

  const now = React.useMemo(() => new Date(), []);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const inRange = React.useMemo(() => {
    const rangeStart = range.start.getTime();
    const rangeEnd = range.end.getTime();
    return entries.filter(
      (e) => e.startedAt >= rangeStart && e.startedAt <= rangeEnd
    );
  }, [entries, range]);

  const today = React.useMemo(
    () =>
      entries.filter((e) =>
        isWithinInterval(new Date(e.startedAt), {
          start: todayStart,
          end: todayEnd,
        })
      ),
    [entries, todayStart, todayEnd]
  );

  const periodTotalMs = inRange.reduce(
    (acc, e) => acc + (e.endedAt - e.startedAt),
    0
  );
  const todayTotalMs = today.reduce(
    (acc, e) => acc + (e.endedAt - e.startedAt),
    0
  );
  const billableMs = inRange
    .filter((e) => e.billable)
    .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
  const periodEarnings = React.useMemo(
    () => computeEarnings(inRange, projects),
    [inRange, projects]
  );

  const weeklyTarget = freelanceGoals.weeklyHoursTarget * 3600 * 1000;
  const targetPercent = Math.min(
    100,
    Math.round((billableMs / weeklyTarget) * 100)
  );
  const earningsTarget = freelanceGoals.weeklyEarningsTarget;
  const earningsPercent =
    earningsTarget > 0
      ? Math.min(100, Math.round((periodEarnings / earningsTarget) * 100))
      : 0;

  const rangeLabel = periodLabel(preset);

  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const dayData = days.map((d) => {
    const ds = startOfDay(d).getTime();
    const de = endOfDay(d).getTime();
    const ms = inRange
      .filter((e) => e.startedAt >= ds && e.startedAt <= de)
      .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
    return {
      label: format(d, "EEE, MMM d"),
      hours: toDecimalHours(ms),
      ms,
    };
  });

  const byProject = React.useMemo(() => {
    const m = new Map<string, number>();
    let unassigned = 0;
    for (const e of inRange) {
      const ms = e.endedAt - e.startedAt;
      if (!e.projectId) {
        unassigned += ms;
      } else {
        m.set(e.projectId, (m.get(e.projectId) ?? 0) + ms);
      }
    }
    const arr = Array.from(m.entries()).map(([pid, ms]) => {
      const p = projects.find((x) => x.id === pid);
      return {
        name: p?.name ?? "Unknown",
        color: p?.color ?? "#94a3b8",
        ms,
        hours: toDecimalHours(ms),
      };
    });
    if (unassigned > 0) {
      arr.push({
        name: "No project",
        color: "#cbd5e1",
        ms: unassigned,
        hours: toDecimalHours(unassigned),
      });
    }
    return arr.sort((a, b) => b.ms - a.ms);
  }, [inRange, projects]);

  if (!hydrated) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <PageScroll className="p-4 md:p-6 space-y-5">
        <ScrollReveal>
          <DateRangeFilterCard
            preset={preset}
            customFrom={resolvedCustomFrom}
            customTo={resolvedCustomTo}
            range={range}
            onPresetChange={setPreset}
            onCustomRangeChange={(from, to) => {
              setCustomFrom(from);
              setCustomTo(to);
            }}
          />
        </ScrollReveal>

        <ScrollReveal delay={40}>
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <Kpi
            icon={<Clock className="size-5" />}
            label="Today"
            value={formatDuration(todayTotalMs)}
            sub={`${today.length} ${today.length === 1 ? "entry" : "entries"}`}
            tint="indigo"
          />
          <Kpi
            icon={<TrendingUp className="size-5" />}
            label={rangeLabel}
            value={formatDuration(periodTotalMs)}
            sub={`${inRange.length} ${inRange.length === 1 ? "entry" : "entries"}`}
            tint="emerald"
          />
          <Kpi
            icon={<Wallet className="size-5" />}
            label={`Billable (${rangeLabel.toLowerCase()})`}
            value={formatDuration(billableMs)}
            sub={
              periodTotalMs > 0
                ? `${Math.round((billableMs / periodTotalMs) * 100)}% of tracked`
                : "0%"
            }
            tint="amber"
          />
          <EarningsSummaryCard
            earnings={periodEarnings}
            label={`Earnings (${rangeLabel.toLowerCase()})`}
          />
          <Kpi
            icon={<Target className="size-5" />}
            label="Hours goal"
            value={`${targetPercent}%`}
            sub={`${toDecimalHours(billableMs)} / ${freelanceGoals.weeklyHoursTarget}h billable`}
            tint="violet"
            progress={targetPercent}
          />
          {earningsTarget > 0 ? (
            <Kpi
              icon={<Target className="size-5" />}
              label="Earnings goal"
              value={`${earningsPercent}%`}
              sub={`${formatCurrency(periodEarnings)} / ${formatCurrency(earningsTarget)}`}
              tint="violet"
              progress={earningsPercent}
            />
          ) : null}
        </div>
        </ScrollReveal>

        <ScrollReveal delay={80}>
        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="p-5 pb-0">
              <h2 className="text-base font-semibold">Hours per day</h2>
              <p className="text-sm text-muted-foreground">
                Daily breakdown for {rangeLabel.toLowerCase()}
              </p>
            </div>
            <div className="p-2 pt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayData}
                  margin={{ top: 10, right: 20, bottom: 8, left: -10 }}
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
                    interval={dayData.length > 20 ? Math.ceil(dayData.length / 10) : 0}
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
                    formatter={(value, _name, item) => [
                      `${value}h`,
                      String(item.payload.label ?? "Tracked"),
                    ]}
                  />
                  <Bar
                    dataKey="hours"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="p-5 pb-0">
              <h2 className="text-base font-semibold">Time by project</h2>
              <p className="text-sm text-muted-foreground">{rangeLabel}</p>
            </div>
            <div className="p-2 pt-2 h-72">
              {byProject.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  No data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byProject}
                      dataKey="ms"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {byProject.map((p, i) => (
                        <Cell key={i} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [
                        formatDuration(Number(value)),
                        String(name),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="px-5 pb-5 space-y-1.5">
              {byProject.slice(0, 5).map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatDuration(p.ms)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        </ScrollReveal>
      </PageScroll>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tint,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: "indigo" | "emerald" | "amber" | "violet";
  progress?: number;
}) {
  const tints: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card>
      <div className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1 font-mono tabular-nums">
            {value}
          </p>
          {sub ? (
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          ) : null}
        </div>
        <div
          className={`size-10 rounded-lg grid place-items-center ${tints[tint]}`}
        >
          {icon}
        </div>
      </div>
      {progress !== undefined ? (
        <div className="px-5 pb-5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
