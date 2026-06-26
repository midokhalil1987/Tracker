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
import type { TimeEntry } from "@/lib/types";

export const WEEK_STARTS_ON = 1 as const;
const WEEK_MS = 7 * 86_400_000;

/** Minimum hue separation (degrees) so adjacent weeks never look alike. */
const MIN_HUE_GAP = 28;

export function getWeekStartMs(timestamp: number): number {
  return startOfWeek(new Date(timestamp), {
    weekStartsOn: WEEK_STARTS_ON,
  }).getTime();
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function parseHsl(color: string): { h: number; s: number; l: number } | null {
  const m = /^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/.exec(color);
  if (!m) return null;
  return {
    h: parseFloat(m[1]),
    s: parseFloat(m[2]),
    l: parseFloat(m[3]),
  };
}

function colorsTooClose(a: string, b: string): boolean {
  const ca = parseHsl(a);
  const cb = parseHsl(b);
  if (!ca || !cb) return a === b;
  if (a === b) return true;
  const hueGap = hueDistance(ca.h, cb.h);
  if (hueGap >= MIN_HUE_GAP) return false;
  return Math.abs(ca.s - cb.s) < 10 && Math.abs(ca.l - cb.l) < 10;
}

function hslColor(h: number, s: number, l: number): string {
  const hue = ((Math.round(h) % 360) + 360) % 360;
  return `hsl(${hue} ${Math.round(s)}% ${Math.round(l)}%)`;
}

/**
 * Assign unique, well-separated accent colors to arbitrary group keys.
 */
export function assignDistinctGroupColors(keys: string[]): Map<string, string> {
  const sorted = [...new Set(keys)].sort();
  const n = sorted.length;
  const map = new Map<string, string>();
  const assigned: string[] = [];

  if (n === 0) return map;

  const hueStep = 360 / n;
  const sats = [50, 62, 48, 58, 66, 44];
  const lights = [44, 52, 40, 48, 56, 36];

  for (let i = 0; i < n; i++) {
    let hue = (i * hueStep + hueStep / 2) % 360;
    let sat = sats[i % sats.length];
    let light = lights[Math.floor(i / sats.length) % lights.length];
    let color = hslColor(hue, sat, light);

    let guard = 0;
    while (assigned.some((c) => colorsTooClose(c, color)) && guard < 48) {
      hue = (hue + MIN_HUE_GAP) % 360;
      color = hslColor(hue, sat, light);
      guard++;
    }

    guard = 0;
    while (assigned.some((c) => colorsTooClose(c, color)) && guard < 12) {
      sat = sats[(i + guard + 1) % sats.length];
      light = lights[(Math.floor(i / sats.length) + guard + 1) % lights.length];
      color = hslColor(hue, sat, light);
      guard++;
    }

    map.set(sorted[i], color);
    assigned.push(color);
  }

  return map;
}

/**
 * Assign a unique, well-separated accent to each week in the visible set.
 */
export function assignDistinctWeekColors(
  weekStartMsList: number[]
): Map<number, string> {
  const colorByKey = assignDistinctGroupColors(
    weekStartMsList.map(String)
  );
  const map = new Map<number, string>();
  for (const weekStart of weekStartMsList) {
    const color = colorByKey.get(String(weekStart));
    if (color) map.set(weekStart, color);
  }
  return map;
}

/** Fallback when a single week is rendered without a shared color map. */
export function weekAccentColor(
  weekStartMs: number,
  colorMap?: Map<number, string>
): string {
  if (colorMap?.has(weekStartMs)) {
    return colorMap.get(weekStartMs)!;
  }
  const ord = Math.floor(weekStartMs / WEEK_MS);
  const hue = (ord * 277) % 360;
  const sat = 48 + (ord * 37) % 22;
  const light = 42 + (ord * 53) % 20;
  return hslColor(hue, sat, light);
}

/** Apply alpha to #RRGGBB or modern hsl() colors. */
export function withColorAlpha(color: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  if (color.startsWith("hsl(")) {
    return color.replace("hsl(", "hsla(").replace(")", ` / ${a})`);
  }
  if (color.startsWith("hsla(")) {
    return color.replace(/\/\s*[\d.]+\)$/, `/ ${a})`);
  }
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const alphaHex = Math.round(a * 255)
      .toString(16)
      .padStart(2, "0");
    return `${hex}${alphaHex}`;
  }
  return color;
}

export function formatWeekRangeLabel(
  weekStartMs: number,
  now: Date = new Date()
): string {
  const start = new Date(weekStartMs);
  const end = endOfWeek(start, { weekStartsOn: WEEK_STARTS_ON });
  const range = `${format(start, "EEEE, MMM d")} – ${format(end, "EEEE, MMM d, yyyy")}`;

  if (isSameWeek(start, now, { weekStartsOn: WEEK_STARTS_ON })) {
    return `This week · ${range}`;
  }
  if (isSameWeek(start, subWeeks(now, 1), { weekStartsOn: WEEK_STARTS_ON })) {
    return `Last week · ${range}`;
  }
  return range;
}

export function isRecentWeek(
  weekStartMs: number,
  now: Date = new Date()
): boolean {
  const start = new Date(weekStartMs);
  return (
    isSameWeek(start, now, { weekStartsOn: WEEK_STARTS_ON }) ||
    isSameWeek(start, subWeeks(now, 1), { weekStartsOn: WEEK_STARTS_ON })
  );
}

export function formatDayLabel(dayStartMs: number): string {
  const d = new Date(dayStartMs);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d, yyyy");
}

export type DayEntryGroup = {
  dayStart: number;
  label: string;
  accentColor: string;
  items: TimeEntry[];
};

export function groupEntriesByDay(entries: TimeEntry[]): DayEntryGroup[] {
  const map = new Map<number, TimeEntry[]>();

  for (const entry of entries) {
    const dayStart = startOfDay(new Date(entry.startedAt)).getTime();
    const list = map.get(dayStart) ?? [];
    list.push(entry);
    map.set(dayStart, list);
  }

  const dayStarts = Array.from(map.keys());
  const colorMap = assignDistinctGroupColors(dayStarts.map(String));

  return dayStarts
    .sort((a, b) => b - a)
    .map((dayStart) => ({
      dayStart,
      label: formatDayLabel(dayStart),
      accentColor: colorMap.get(String(dayStart))!,
      items: (map.get(dayStart) ?? []).sort(
        (a, b) => b.startedAt - a.startedAt
      ),
    }));
}

export type WeekEntryGroup = {
  weekStart: number;
  label: string;
  accentColor: string;
  items: TimeEntry[];
};

export function groupEntriesByWeek(entries: TimeEntry[]): WeekEntryGroup[] {
  const map = new Map<number, TimeEntry[]>();

  for (const entry of entries) {
    const weekStart = getWeekStartMs(entry.startedAt);
    const list = map.get(weekStart) ?? [];
    list.push(entry);
    map.set(weekStart, list);
  }

  const weekStarts = Array.from(map.keys());
  const colorMap = assignDistinctWeekColors(weekStarts);

  return weekStarts
    .sort((a, b) => b - a)
    .map((weekStart) => ({
      weekStart,
      label: formatWeekRangeLabel(weekStart),
      accentColor: colorMap.get(weekStart)!,
      items: (map.get(weekStart) ?? []).sort(
        (a, b) => b.startedAt - a.startedAt
      ),
    }));
}

export type WeekSectionStyleSet = {
  section: Record<string, string>;
  header: Record<string, string>;
  dot: Record<string, string>;
};

function getAccentGlowStyles(accentColor: string): Record<string, string> {
  return {
    border: `1px solid ${withColorAlpha(accentColor, 0.38)}`,
    boxShadow: `0 0 0 1px ${withColorAlpha(accentColor, 0.12)}, 0 2px 8px -2px ${withColorAlpha(accentColor, 0.28)}`,
  };
}

export function getWeekCardAccentStyles(
  accentColor: string
): Record<string, string> {
  return getAccentGlowStyles(accentColor);
}

export function getWeekSectionStyles(accentColor: string): WeekSectionStyleSet {
  return {
    section: getAccentGlowStyles(accentColor),
    header: {
      background: `linear-gradient(90deg, ${withColorAlpha(accentColor, 0.2)} 0%, ${withColorAlpha(accentColor, 0.06)} 55%, transparent 100%)`,
      borderBottom: `1px solid ${withColorAlpha(accentColor, 0.22)}`,
    },
    dot: {
      background: accentColor,
      boxShadow: `0 0 8px ${withColorAlpha(accentColor, 0.85)}`,
    },
  };
}
