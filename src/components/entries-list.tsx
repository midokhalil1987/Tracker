"use client";

import * as React from "react";
import {
  format,
  isToday,
  isYesterday,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { useStore } from "@/lib/store";
import { Inbox } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { EntryRow } from "./entry-row";
import { WeekGroupSection } from "./week-group-section";
import {
  assignDistinctWeekColors,
  isRecentWeek,
  WEEK_STARTS_ON,
} from "@/lib/week-groups";
import type { TimeEntry } from "@/lib/types";

type DayBucket = { day: number; items: TimeEntry[] };
type WeekBucket = { weekStart: number; days: DayBucket[] };

function groupByWeekAndDay(entries: TimeEntry[]): WeekBucket[] {
  const dayMap = new Map<number, TimeEntry[]>();
  for (const e of entries) {
    const key = startOfDay(new Date(e.startedAt)).getTime();
    const arr = dayMap.get(key) ?? [];
    arr.push(e);
    dayMap.set(key, arr);
  }

  const weekMap = new Map<number, DayBucket[]>();
  for (const [day, items] of dayMap.entries()) {
    const wk = startOfWeek(new Date(day), { weekStartsOn: WEEK_STARTS_ON }).getTime();
    const arr = weekMap.get(wk) ?? [];
    arr.push({
      day,
      items: items.sort((a, b) => b.startedAt - a.startedAt),
    });
    weekMap.set(wk, arr);
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([weekStart, days]) => ({
      weekStart,
      days: days.sort((a, b) => b.day - a.day),
    }));
}

function dayLabel(day: number) {
  const d = new Date(day);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

function sumMs(items: TimeEntry[]): number {
  return items.reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
}

function WeekEntriesSection({
  weekStart,
  days,
  isCollapsed,
  onToggle,
  accentColor,
}: {
  weekStart: number;
  days: DayBucket[];
  isCollapsed: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  const weekTotal = days.reduce((acc, d) => acc + sumMs(d.items), 0);
  const entryCount = days.reduce((acc, d) => acc + d.items.length, 0);

  return (
    <WeekGroupSection
      weekStart={weekStart}
      accentColor={accentColor}
      entryCount={entryCount}
      collapsed={isCollapsed}
      onToggle={onToggle}
      headerTrailing={
        <>
          <span className="hidden md:inline">Week total</span>
          <span className="font-mono tabular-nums text-sm font-semibold text-foreground">
            {formatDuration(weekTotal)}
          </span>
        </>
      }
    >
      <div className="divide-y divide-border">
        {days.map(({ day, items }) => {
          const dayTotal = sumMs(items);
          return (
            <div key={day}>
              <div className="flex items-center justify-between px-4 md:px-5 py-2.5 bg-background/80">
                <span className="text-sm font-medium text-foreground/90">
                  {dayLabel(day)}
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {formatDuration(dayTotal)}
                  </span>
                </span>
              </div>
              <div className="divide-y divide-border border-t border-border/60">
                {items.map((e) => (
                  <EntryRow key={e.id} entry={e} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </WeekGroupSection>
  );
}

export function EntriesList() {
  const entries = useStore((s) => s.entries);
  const hydrated = useStore((s) => s.hydrated);

  const grouped = React.useMemo(() => groupByWeekAndDay(entries), [entries]);

  const weekColorMap = React.useMemo(
    () => assignDistinctWeekColors(grouped.map((g) => g.weekStart)),
    [grouped]
  );

  const [collapseOverrides, setCollapseOverrides] = React.useState<
    Map<number, boolean>
  >(() => new Map());

  const isWeekCollapsed = React.useCallback(
    (weekStart: number) => {
      const override = collapseOverrides.get(weekStart);
      if (override !== undefined) return override;
      return !isRecentWeek(weekStart);
    },
    [collapseOverrides]
  );

  const toggleWeek = (weekStart: number) => {
    setCollapseOverrides((prev) => {
      const next = new Map(prev);
      const current = prev.get(weekStart) ?? !isRecentWeek(weekStart);
      next.set(weekStart, !current);
      return next;
    });
  };

  if (!hydrated) {
    return (
      <div className="px-4 md:px-6 py-10 text-center text-sm text-muted-foreground">
        Loading entries...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 md:px-6 py-16 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted mb-4">
          <Inbox className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1">No time entries yet</h3>
        <p className="text-sm text-muted-foreground">
          Start the timer above to log your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:p-6">
      {grouped.map(({ weekStart, days }) => (
        <WeekEntriesSection
          key={weekStart}
          weekStart={weekStart}
          days={days}
          accentColor={weekColorMap.get(weekStart)!}
          isCollapsed={isWeekCollapsed(weekStart)}
          onToggle={() => toggleWeek(weekStart)}
        />
      ))}
    </div>
  );
}
