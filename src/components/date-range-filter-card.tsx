"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import type { ReportsPreset } from "@/lib/store";
import { DATE_RANGE_PRESETS } from "@/lib/date-range-presets";
import { cn, fromDateInputValue, toDateInputValue } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { DateRangePicker } from "@/components/date-range-picker";

export type DateRangeFilterCardProps = {
  preset: ReportsPreset;
  customFrom: string;
  customTo: string;
  range: { start: Date; end: Date };
  onPresetChange: (preset: ReportsPreset) => void;
  onCustomRangeChange: (customFrom: string, customTo: string) => void;
  extra?: React.ReactNode;
};

export function DateRangeFilterCard({
  preset,
  customFrom,
  customTo,
  range,
  onPresetChange,
  onCustomRangeChange,
  extra,
}: DateRangeFilterCardProps) {
  const [rangeOpen, setRangeOpen] = React.useState(false);

  return (
    <Card>
      <div className="p-4 md:p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="size-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {DATE_RANGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetChange(p.id)}
                className={cn(
                  "px-3 h-8 rounded-md text-sm cursor-pointer",
                  preset === p.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70 text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}

            <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (preset !== "custom") onPresetChange("custom");
                  }}
                  className={cn(
                    "px-3 h-8 rounded-md text-sm inline-flex items-center gap-1.5 cursor-pointer",
                    preset === "custom"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/70 text-foreground"
                  )}
                >
                  <span>
                    {`${format(range.start, "MMM d")} – ${format(
                      range.end,
                      "MMM d, yyyy"
                    )}`}
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
                    onCustomRangeChange(
                      toDateInputValue(from),
                      toDateInputValue(to)
                    );
                    setRangeOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {extra ? (
          <div className="flex items-center gap-2 flex-wrap">{extra}</div>
        ) : null}
      </div>
      <div className="px-5 pb-4 text-xs text-muted-foreground">
        {format(range.start, "MMM d, yyyy")} —{" "}
        {format(range.end, "MMM d, yyyy")}
      </div>
    </Card>
  );
}
