"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Range = { from: Date | null; to: Date | null };

type Props = {
  value: Range;
  onChange: (next: { from: Date; to: Date }) => void;
  className?: string;
};

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function monthGridDays(month: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

function MonthPanel({
  month,
  rangeStart,
  rangeEnd,
  pending,
  onDayClick,
  onDayHover,
}: {
  month: Date;
  rangeStart: Date | null | undefined;
  rangeEnd: Date | null | undefined;
  pending: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date) => void;
}) {
  const days = React.useMemo(() => monthGridDays(month), [month]);
  const hasRange =
    !!rangeStart &&
    !!rangeEnd &&
    rangeStart.getTime() !== rangeEnd.getTime();

  return (
    <div className="w-[17.5rem]">
      <div className="text-sm font-semibold text-center mb-2">
        {format(month, "MMMM yyyy")}
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-[10px] font-medium text-center text-muted-foreground py-1 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const isStart = !!rangeStart && isSameDay(d, rangeStart);
          const isEnd = !!rangeEnd && isSameDay(d, rangeEnd);
          const isInside =
            !!rangeStart &&
            !!rangeEnd &&
            d.getTime() > rangeStart.getTime() &&
            d.getTime() < rangeEnd.getTime();
          const isEndpoint = isStart || isEnd;

          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              onMouseEnter={() => {
                if (pending) onDayHover(d);
              }}
              className={cn(
                "relative h-8 text-xs flex items-center justify-center cursor-pointer",
                !inMonth && "text-muted-foreground/40",
                inMonth && !isEndpoint && !isInside && "hover:bg-muted rounded",
                isInside && "bg-primary/10",
                isEndpoint && hasRange && "bg-primary/10",
                isStart && hasRange && "rounded-l",
                isEnd && hasRange && "rounded-r"
              )}
            >
              {isEndpoint ? (
                <span className="absolute inset-0.5 grid place-items-center rounded bg-primary text-primary-foreground font-semibold">
                  {d.getDate()}
                </span>
              ) : (
                <span>{d.getDate()}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Dual-month range calendar — pick start, then end; hover previews the range.
 */
export function DateRangePicker({ value, onChange, className }: Props) {
  const [viewMonth, setViewMonth] = React.useState<Date>(() =>
    startOfMonth(value.from ?? value.to ?? new Date())
  );
  const [pending, setPending] = React.useState<Date | null>(null);
  const [hover, setHover] = React.useState<Date | null>(null);

  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);

  const previewStart = pending ?? value.from;
  const previewEnd = pending ? (hover ?? pending) : value.to;

  const [rangeStart, rangeEnd] = React.useMemo(() => {
    if (!previewStart || !previewEnd) return [previewStart, previewEnd] as const;
    return previewStart.getTime() <= previewEnd.getTime()
      ? ([previewStart, previewEnd] as const)
      : ([previewEnd, previewStart] as const);
  }, [previewStart, previewEnd]);

  const handleDayClick = (d: Date) => {
    if (!pending) {
      setPending(d);
      setHover(d);
      return;
    }
    const [from, to] =
      d.getTime() >= pending.getTime() ? [pending, d] : [d, pending];
    onChange({ from, to });
    setPending(null);
    setHover(null);
  };

  return (
    <div className={cn("select-none", className)}>
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          className="size-7 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-xs font-medium text-muted-foreground">
          {format(leftMonth, "MMM yyyy")} – {format(rightMonth, "MMM yyyy")}
        </div>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="size-7 grid place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex gap-4">
        <MonthPanel
          month={leftMonth}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          pending={pending}
          onDayClick={handleDayClick}
          onDayHover={setHover}
        />
        <MonthPanel
          month={rightMonth}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          pending={pending}
          onDayClick={handleDayClick}
          onDayHover={setHover}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
        <div className="text-muted-foreground">
          {rangeStart && rangeEnd ? (
            <>
              {format(rangeStart, "MMM d, yyyy")}
              {" – "}
              {format(rangeEnd, "MMM d, yyyy")}
            </>
          ) : pending ? (
            <>
              <span className="text-foreground font-medium">
                {format(pending, "MMM d")}
              </span>
              {" — pick end date"}
            </>
          ) : (
            "Pick a start date"
          )}
        </div>
        {pending ? (
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setHover(null);
            }}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
