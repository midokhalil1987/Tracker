"use client";

import * as React from "react";
import {
  endOfWeek,
  format,
  isSameWeek,
  isToday,
  isYesterday,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useStore, pickDefaultColor } from "@/lib/store";
import { Inbox, ChevronDown } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { EntryRow } from "./entry-row";
import type { TimeEntry } from "@/lib/types";

type DayBucket = { day: number; items: TimeEntry[] };
type WeekBucket = { week: number; days: DayBucket[] };

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
    const wk = startOfWeek(new Date(day), { weekStartsOn: 1 }).getTime();
    const arr = weekMap.get(wk) ?? [];
    arr.push({
      day,
      items: items.sort((a, b) => b.startedAt - a.startedAt),
    });
    weekMap.set(wk, arr);
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([week, days]) => ({
      week,
      days: days.sort((a, b) => b.day - a.day),
    }));
}

function dayLabel(day: number) {
  const d = new Date(day);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

function weekLabel(week: number) {
  const start = new Date(week);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const now = new Date();
  if (isSameWeek(start, now, { weekStartsOn: 1 })) return "This week";
  if (isSameWeek(start, subWeeks(now, 1), { weekStartsOn: 1 }))
    return "Last week";
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  if (sameYear) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

function sumMs(items: TimeEntry[]): number {
  return items.reduce((acc, e) => acc + (e.endedAt - e.startedAt), 0);
}

/** Append an alpha channel to a #RRGGBB color. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function WeekSection({
  week,
  days,
  isCollapsed,
  onToggle,
  accentColor,
}: {
  week: number;
  days: DayBucket[];
  isCollapsed: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  const weekTotal = days.reduce((acc, d) => acc + sumMs(d.items), 0);
  const entryCount = days.reduce((acc, d) => acc + d.items.length, 0);

  return (
    <section
      className="bg-card rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${withAlpha(accentColor, 0.38)}`,
        boxShadow: `0 0 0 1px ${withAlpha(accentColor, 0.12)}, 0 8px 28px -10px ${withAlpha(accentColor, 0.45)}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 md:px-5 h-12",
          "hover:brightness-[1.03] transition-all text-left"
        )}
        style={{
          background: `linear-gradient(90deg, ${withAlpha(accentColor, 0.2)} 0%, ${withAlpha(accentColor, 0.06)} 55%, transparent 100%)`,
          borderBottom: `1px solid ${isCollapsed ? "transparent" : withAlpha(accentColor, 0.22)}`,
          transition: "border-color 300ms ease, filter 200ms ease",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2 rounded-full shrink-0 transition-transform duration-300"
            style={{
              background: accentColor,
              boxShadow: `0 0 8px ${withAlpha(accentColor, isCollapsed ? 0.5 : 0.85)}`,
              transform: isCollapsed ? "scale(0.85)" : "scale(1)",
            }}
          />
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-300 ease-out",
              isCollapsed && "-rotate-90"
            )}
            style={{ color: accentColor }}
          />
          <span className="text-sm font-semibold truncate">{weekLabel(week)}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
            · {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span className="hidden md:inline">Week total</span>
          <span className="font-mono tabular-nums text-sm font-semibold text-foreground">
            {formatDuration(weekTotal)}
          </span>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={cn(
              "divide-y divide-border transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none",
              isCollapsed
                ? "opacity-0 -translate-y-1"
                : "opacity-100 translate-y-0"
            )}
          >
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
        </div>
      </div>
    </section>
  );
}

export function EntriesList() {
  const entries = useStore((s) => s.entries);
  const hydrated = useStore((s) => s.hydrated);

  const grouped = React.useMemo(() => groupByWeekAndDay(entries), [entries]);

  // Empty set = all weeks expanded by default.
  const [collapsed, setCollapsed] = React.useState<Set<number>>(() => new Set());

  const toggleWeek = (week: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
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
      {grouped.map(({ week, days }, index) => (
        <WeekSection
          key={week}
          week={week}
          days={days}
          isCollapsed={collapsed.has(week)}
          onToggle={() => toggleWeek(week)}
          accentColor={pickDefaultColor(index)}
        />
      ))}
    </div>
  );
}
