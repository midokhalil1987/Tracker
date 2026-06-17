"use client";

import ExcelJS from "exceljs";
import type { Project, Tag, TimeEntry } from "./types";
import { uid } from "./utils";
import {
  buildXlsxBuffer,
  xlsxFilenameForDate,
  type ExportInput,
} from "./xlsx-export";
import { XLSX_SHEETS } from "./xlsx-constants";

/** Excel date/time epoch (UTC). */
const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function dateOnly(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

/**
 * Read an ExcelJS cell value as a plain JS primitive. Handles rich text,
 * hyperlinks, formula cells and shared-string objects.
 */
function cellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    // Rich text
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    // Hyperlink
    if ("text" in value && typeof value.text === "string") return value.text;
    // Formula result
    if ("result" in value && value.result !== undefined) {
      return cellValue(value.result as ExcelJS.CellValue);
    }
    // Shared string {text: "..."}
    if ("hyperlink" in value && "text" in value) {
      return (value as { text: string }).text;
    }
  }
  return value;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const s = asString(value).toLowerCase();
  return ["yes", "y", "true", "1", "billable", "x", "✓"].includes(s);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = asString(value).replace(/[$, ]/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    // ExcelJS returns UTC midnight for date-only cells — use UTC parts so the
    // calendar day doesn't shift in positive-offset timezones (e.g. UTC+3).
    return new Date(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      0,
      0,
      0,
      0
    );
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 1e6) {
      const epoch = Date.UTC(1899, 11, 30);
      const ms = epoch + value * 86400000;
      const utc = new Date(ms);
      return new Date(
        utc.getUTCFullYear(),
        utc.getUTCMonth(),
        utc.getUTCDate(),
        0,
        0,
        0,
        0
      );
    }
    return dateOnly(new Date(value));
  }
  const s = asString(value);
  if (!s) return undefined;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const d = new Date(
      parseInt(iso[1], 10),
      parseInt(iso[2], 10) - 1,
      parseInt(iso[3], 10)
    );
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : dateOnly(d);
}

function parseTimeOfDay(
  value: unknown
): { hours: number; minutes: number } | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) {
    // Excel time cells are UTC-anchored (e.g. 4:00 PM → 1899-12-30T16:00:00Z).
    // Local getters shift the wall-clock time in non-UTC zones.
    return { hours: value.getUTCHours(), minutes: value.getUTCMinutes() };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Time fraction (0..1) or datetime serial — take the fractional day part.
    const fraction = value >= 1 ? value % 1 : value;
    if (fraction >= 0 && fraction < 1) {
      const totalSeconds = Math.round(fraction * 86400);
      return {
        hours: Math.floor(totalSeconds / 3600) % 24,
        minutes: Math.floor((totalSeconds % 3600) / 60),
      };
    }
    if (value >= 0 && value < 24) {
      return { hours: Math.floor(value), minutes: 0 };
    }
  }
  const s = asString(value);
  if (!s) return undefined;
  // Skip ISO datetime strings — only parse clock times.
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return undefined;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(s);
  if (!m) return undefined;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const ampm = m[4]?.toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  return { hours, minutes };
}

function durationMsFromHms(
  hours: number,
  minutes: number,
  seconds: number
): number | undefined {
  if (minutes >= 60 || seconds >= 60 || hours < 0) return undefined;
  const ms = ((hours * 60 + minutes) * 60 + seconds) * 1000;
  return ms > 0 ? ms : undefined;
}

function parseDurationMs(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  if (value instanceof Date) {
    // Duration/time cells are anchored to 1899-12-30 UTC in Excel.
    const fromEpoch = value.getTime() - EXCEL_EPOCH_UTC_MS;
    if (fromEpoch > 0) return Math.round(fromEpoch);
    return durationMsFromHms(
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds()
    );
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    // Excel stores durations as fractions of a 24-hour day (can exceed 1.0).
    return Math.round(value * 86400000);
  }

  const s = typeof value === "string" ? value.trim() : asString(value).trim();
  if (!s) return undefined;

  // HH:MM:SS or HH:MM — optional AM/PM suffix is an Excel display artifact;
  // treat the numbers as a duration, not a clock time (no 12h conversion).
  const hms = /^(\d+):(\d{1,2})(?::(\d{1,2}))?\s*(?:am|pm)?$/i.exec(s);
  if (hms) {
    return durationMsFromHms(
      parseInt(hms[1], 10),
      parseInt(hms[2], 10),
      hms[3] ? parseInt(hms[3], 10) : 0
    );
  }

  const decimal = Number(s);
  if (Number.isFinite(decimal) && decimal > 0) {
    // Plain decimal hours (e.g. "1.5" = 1h 30m).
    return Math.round(decimal * 3600 * 1000);
  }

  return undefined;
}

function splitTags(value: unknown): string[] {
  const s = asString(value);
  if (!s) return [];
  return s
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function combineDateAndTime(
  date: Date,
  time: { hours: number; minutes: number }
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.hours,
    time.minutes,
    0,
    0
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                             */
/* ------------------------------------------------------------------ */

/** Build workbook and trigger a browser download. */
export async function exportToXlsx(input: ExportInput): Promise<void> {
  const buffer = await buildXlsxBuffer(input);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = xlsxFilenameForDate(new Date());
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Import                                                             */
/* ------------------------------------------------------------------ */

export type ImportResult = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  warnings: string[];
};

const ALIASES = {
  name: ["name", "project", "project name", "tag", "label"],
  client: ["client", "customer"],
  rate: [
    "hourly rate",
    "rate",
    "hourly rate (usd)",
    "rate (usd)",
    "hourly",
    "hourlyrate",
  ],
  color: ["color", "colour"],

  date: ["date", "day"],
  start: [
    "start",
    "start time",
    "starttime",
    "from",
    "begin",
    "started at",
    "started",
  ],
  end: [
    "end",
    "end time",
    "endtime",
    "to",
    "finish",
    "stop",
    "ended at",
    "ended",
  ],
  duration: [
    "duration",
    "duration (hours)",
    "hours",
    "time",
    "time (hours)",
    "length",
  ],
  description: ["description", "task", "what", "notes", "activity"],
  project: ["project", "project name"],
  tags: ["tags", "tag", "labels"],
  billable: [
    "billable",
    "is billable",
    "billable?",
    "billable default",
    "billable by default",
  ],
};

type RawRow = Record<string, unknown>;

function pick(row: RawRow, aliases: readonly string[]): unknown {
  for (const key of Object.keys(row)) {
    if (aliases.includes(key.trim().toLowerCase())) return row[key];
  }
  return undefined;
}

/**
 * Build a `{ headerName: value }` map for each data row in the worksheet,
 * mimicking the SheetJS sheet_to_json shape so the rest of the parsing logic
 * stays unchanged.
 */
function worksheetToRows(ws: ExcelJS.Worksheet): RawRow[] {
  // Row 1 is the header row.
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = asString(cellValue(cell.value));
  });

  const rows: RawRow[] = [];
  const lastRow = ws.actualRowCount;
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const out: RawRow = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const v = cellValue(cell.value);
      if (v !== "" && v !== null && v !== undefined) hasValue = true;
      out[header] = v;
    });
    if (hasValue) rows.push(out);
  }
  return rows;
}

function findSheet(
  wb: ExcelJS.Workbook,
  name: string
): ExcelJS.Worksheet | undefined {
  const lower = name.trim().toLowerCase();
  return wb.worksheets.find((w) => w.name.trim().toLowerCase() === lower);
}

export async function importFromXlsx(
  buffer: ArrayBuffer
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const warnings: string[] = [];

  /* ---------- Projects ---------- */
  const projects: Project[] = [];
  const projectsByName = new Map<string, Project>();

  function ensureProject(name: string): Project {
    const key = name.trim().toLowerCase();
    const existing = projectsByName.get(key);
    if (existing) return existing;
    const p: Project = {
      id: uid(),
      name: name.trim(),
      color: "#6366f1",
      billable: false,
      createdAt: Date.now(),
    };
    projects.push(p);
    projectsByName.set(key, p);
    return p;
  }

  const projectsSheet = findSheet(wb, XLSX_SHEETS.PROJECTS);
  if (projectsSheet) {
    const rows = worksheetToRows(projectsSheet);
    for (const row of rows) {
      const name = asString(pick(row, ALIASES.name));
      if (!name) continue;
      const p = ensureProject(name);
      const client = asString(pick(row, ALIASES.client));
      if (client) p.client = client;
      const color = asString(pick(row, ALIASES.color));
      if (color) p.color = color;
      const rate = asNumber(pick(row, ALIASES.rate));
      if (rate && rate > 0) p.hourlyRate = rate;
      const billableCell = pick(row, ALIASES.billable);
      if (billableCell !== undefined && billableCell !== "") {
        p.billable = asBoolean(billableCell);
      }
    }
  }

  /* ---------- Tags ---------- */
  const tags: Tag[] = [];
  const tagsByName = new Map<string, Tag>();
  function ensureTag(name: string): Tag {
    const key = name.trim().toLowerCase();
    const existing = tagsByName.get(key);
    if (existing) return existing;
    const t: Tag = { id: uid(), name: name.trim() };
    tags.push(t);
    tagsByName.set(key, t);
    return t;
  }
  const tagsSheet = findSheet(wb, XLSX_SHEETS.TAGS);
  if (tagsSheet) {
    const rows = worksheetToRows(tagsSheet);
    for (const row of rows) {
      const name = asString(pick(row, ALIASES.name));
      if (name) ensureTag(name);
    }
  }

  /* ---------- Time Entries ---------- */
  const entries: TimeEntry[] = [];
  const entriesSheet = findSheet(wb, XLSX_SHEETS.ENTRIES);
  if (entriesSheet) {
    const rows = worksheetToRows(entriesSheet);
    rows.forEach((row, i) => {
      const rowNum = i + 2;

      const date = parseDate(pick(row, ALIASES.date));
      const startTOD = parseTimeOfDay(pick(row, ALIASES.start));
      const endTOD = parseTimeOfDay(pick(row, ALIASES.end));
      const durationMs = parseDurationMs(pick(row, ALIASES.duration));

      let started: Date | undefined;
      if (date) {
        started = combineDateAndTime(date, startTOD ?? { hours: 9, minutes: 0 });
      } else {
        const startRaw = pick(row, ALIASES.start);
        if (startRaw instanceof Date) started = startRaw;
      }
      if (!started) {
        warnings.push(
          `Time Entries row ${rowNum}: missing Date / Start — skipped.`
        );
        return;
      }

      let ended: Date | undefined;
      if (endTOD && date) {
        ended = combineDateAndTime(date, endTOD);
        if (ended.getTime() < started.getTime()) {
          const nextDay = new Date(ended);
          nextDay.setDate(nextDay.getDate() + 1);
          ended = nextDay;
        }
      } else if (durationMs && durationMs > 0) {
        ended = new Date(started.getTime() + durationMs);
      } else {
        const endRaw = pick(row, ALIASES.end);
        if (endRaw instanceof Date) ended = endRaw;
      }
      if (!ended) {
        warnings.push(
          `Time Entries row ${rowNum}: needs Duration or End — skipped.`
        );
        return;
      }
      if (ended.getTime() <= started.getTime()) {
        warnings.push(
          `Time Entries row ${rowNum}: Duration is zero or negative — skipped.`
        );
        return;
      }

      const description = asString(pick(row, ALIASES.description));
      const projectName = asString(pick(row, ALIASES.project));
      const projectId = projectName ? ensureProject(projectName).id : null;
      const tagNames = splitTags(pick(row, ALIASES.tags));
      const tagIds = tagNames.map((n) => ensureTag(n).id);
      const billable = asBoolean(pick(row, ALIASES.billable));

      entries.push({
        id: uid(),
        description,
        projectId,
        tagIds,
        billable,
        startedAt: started.getTime(),
        endedAt: ended.getTime(),
      });
    });
  } else {
    warnings.push(`Sheet "${XLSX_SHEETS.ENTRIES}" not found — no entries imported.`);
  }

  return { projects, tags, entries, warnings };
}
