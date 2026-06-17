import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration in milliseconds as HH:MM:SS.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

/**
 * Decimal hours, e.g. 1.5 for 90 minutes.
 */
export function toDecimalHours(ms: number): number {
  return Math.round((ms / 3600000) * 100) / 100;
}

/**
 * Parse a HH:MM:SS or HH:MM string into a duration in ms.
 */
export function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  let h = 0,
    m = 0,
    s = 0;
  if (nums.length === 3) [h, m, s] = nums;
  else if (nums.length === 2) [h, m] = nums;
  else if (nums.length === 1) [m] = nums;
  else return null;
  if (m >= 60 || s >= 60) return null;
  return ((h * 60 + m) * 60 + s) * 1000;
}

/**
 * Format a Date as a 12-hour clock with AM/PM, e.g. "9:30 AM", "10:45 PM".
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a timestamp as HH:MM for <input type="time"> (local time).
 */
export function toTimeInputValue(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Apply an HH:MM value to the calendar day of `baseTs` (local time).
 */
export function applyTimeToTimestamp(
  baseTs: number,
  timeInput: string
): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeInput.trim());
  if (!m) return null;
  const hours = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const minutes = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  const base = new Date(baseTs);
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    minutes,
    0,
    0
  ).getTime();
}

/**
 * Generate a short, sortable ID.
 */
export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

/**
 * Format a number as USD currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compute earnings for a set of entries using each entry's project rate.
 * Only billable entries with an assigned, rated project earn money.
 */
export function computeEarnings(
  entries: Array<{
    startedAt: number;
    endedAt: number;
    billable: boolean;
    projectId: string | null;
  }>,
  projects: Array<{ id: string; hourlyRate?: number }>
): number {
  const rateById = new Map<string, number>();
  for (const p of projects) {
    if (p.hourlyRate && p.hourlyRate > 0) rateById.set(p.id, p.hourlyRate);
  }
  let total = 0;
  for (const e of entries) {
    if (!e.billable || !e.projectId) continue;
    const rate = rateById.get(e.projectId);
    if (!rate) continue;
    const hours = (e.endedAt - e.startedAt) / 3600000;
    total += hours * rate;
  }
  return total;
}

/**
 * Format a Date as YYYY-MM-DD using local time (suitable for <input type="date">).
 */
export function toDateInputValue(date: Date | number): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date in local time. Returns null on invalid input.
 */
export function fromDateInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  )
    return null;
  return d;
}
