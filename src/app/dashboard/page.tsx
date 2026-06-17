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
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  isWithinInterval,
} from "date-fns";
import { TrendingUp, Clock, Target, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  computeEarnings,
  formatCurrency,
  formatDuration,
  toDecimalHours,
} from "@/lib/utils";

export default function DashboardPage() {
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const hydrated = useStore((s) => s.hydrated);

  const now = React.useMemo(() => new Date(), []);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const inWeek = React.useMemo(
    () =>
      entries.filter((e) =>
        isWithinInterval(new Date(e.startedAt), {
          start: weekStart,
          end: weekEnd,
        })
      ),
    [entries, weekStart, weekEnd]
  );
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

  const weekTotalMs = inWeek.reduce(
    (acc, e) => acc + (e.endedAt - e.startedAt),
    0
  );
  const todayTotalMs = today.reduce(
    (acc, e) => acc + (e.endedAt - e.startedAt),
    0
  );
  const billableMs = inWeek
    .filter((e) => e.billable)
    .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
  const weekEarnings = React.useMemo(
    () => computeEarnings(inWeek, projects),
    [inWeek, projects]
  );

  const weeklyTarget = 40 * 3600 * 1000;
  const targetPercent = Math.min(
    100,
    Math.round((weekTotalMs / weeklyTarget) * 100)
  );

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dayData = days.map((d) => {
    const ds = startOfDay(d).getTime();
    const de = endOfDay(d).getTime();
    const ms = entries
      .filter((e) => e.startedAt >= ds && e.startedAt <= de)
      .reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
    return {
      day: format(d, "EEE"),
      date: format(d, "MMM d"),
      hours: toDecimalHours(ms),
      ms,
    };
  });

  const byProject = React.useMemo(() => {
    const m = new Map<string, number>();
    let unassigned = 0;
    for (const e of inWeek) {
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
  }, [inWeek, projects]);

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
      <PageHeader
        title="Dashboard"
        description={`Week of ${format(weekStart, "MMM d")} – ${format(
          weekEnd,
          "MMM d, yyyy"
        )}`}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
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
            label="This week"
            value={formatDuration(weekTotalMs)}
            sub={`${inWeek.length} ${inWeek.length === 1 ? "entry" : "entries"}`}
            tint="emerald"
          />
          <Kpi
            icon={<Wallet className="size-5" />}
            label="Billable (week)"
            value={formatDuration(billableMs)}
            sub={
              weekTotalMs > 0
                ? `${Math.round((billableMs / weekTotalMs) * 100)}% of tracked`
                : "0%"
            }
            tint="amber"
          />
          <Kpi
            icon={<Wallet className="size-5" />}
            label="Earnings (week)"
            value={formatCurrency(weekEarnings)}
            sub="billable × project rate"
            tint="emerald"
          />
          <Kpi
            icon={<Target className="size-5" />}
            label="Weekly target"
            value={`${targetPercent}%`}
            sub={`${toDecimalHours(weekTotalMs)} / 40h`}
            tint="violet"
            progress={targetPercent}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="p-5 pb-0">
              <h2 className="text-base font-semibold">Hours per day</h2>
              <p className="text-sm text-muted-foreground">
                Daily breakdown for this week
              </p>
            </div>
            <div className="p-2 pt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayData}
                  margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
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
                    formatter={(value) => [`${value}h`, "Tracked"]}
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
              <p className="text-sm text-muted-foreground">This week</p>
            </div>
            <div className="p-2 pt-2 h-72">
              {byProject.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  No data this week.
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
      </div>
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
