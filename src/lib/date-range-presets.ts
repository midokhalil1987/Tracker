import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";
import type { ReportsPreset } from "@/lib/store";

export const DATE_RANGE_PRESETS: { id: ReportsPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "lastWeek", label: "Last week" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
];

export function getPresetRange(
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
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "30d":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }
}

export function resolveDateRange(
  preset: ReportsPreset,
  customFrom: string,
  customTo: string,
  fromDateInputValue: (v: string) => Date | null
): { start: Date; end: Date } {
  if (preset === "custom") {
    const fromD = fromDateInputValue(customFrom) ?? startOfMonth(new Date());
    const toD = fromDateInputValue(customTo) ?? new Date();
    const [a, b] =
      fromD.getTime() <= toD.getTime() ? [fromD, toD] : [toD, fromD];
    return { start: startOfDay(a), end: endOfDay(b) };
  }
  return getPresetRange(preset);
}

export function periodLabel(preset: ReportsPreset): string {
  if (preset === "custom") return "In period";
  return DATE_RANGE_PRESETS.find((p) => p.id === preset)?.label ?? "In period";
}
