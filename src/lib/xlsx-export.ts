import ExcelJS from "exceljs";
import { APP_FULL_TITLE } from "@/lib/brand";
import type { Project, Tag, TimeEntry } from "./types";
import { toDateInputValue } from "./utils";
import {
  XLSX_DROPDOWN_ROWS,
  XLSX_ENTRY_HEADERS,
  XLSX_LOOKUP_RANGE_ROWS,
  XLSX_PROJECT_HEADERS,
  XLSX_SHEETS,
  XLSX_TAG_HEADERS,
} from "./xlsx-constants";

export type ExportInput = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
};

function timeOfDay(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function applyHeaderStyle(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
}

function applyDropdown(
  ws: ExcelJS.Worksheet,
  colIndex: number,
  formula: string,
  strict: boolean
) {
  for (let r = 2; r <= XLSX_DROPDOWN_ROWS + 1; r++) {
    ws.getCell(r, colIndex).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: strict,
      errorStyle: strict ? "stop" : "information",
      errorTitle: strict ? "Invalid value" : undefined,
      error: strict ? "Please choose a value from the list." : undefined,
    };
  }
}

/** Build an .xlsx workbook buffer (Node / server safe). */
export async function buildXlsxBuffer({
  projects,
  tags,
  entries,
}: ExportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = APP_FULL_TITLE;
  wb.created = new Date();

  const wsProjects = wb.addWorksheet(XLSX_SHEETS.PROJECTS, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wsProjects.columns = [
    { header: XLSX_PROJECT_HEADERS[0], key: "name", width: 28 },
    { header: XLSX_PROJECT_HEADERS[1], key: "client", width: 22 },
    { header: XLSX_PROJECT_HEADERS[2], key: "rate", width: 14 },
    { header: XLSX_PROJECT_HEADERS[3], key: "billable", width: 12 },
    { header: XLSX_PROJECT_HEADERS[4], key: "color", width: 12 },
  ];
  applyHeaderStyle(wsProjects);
  for (const p of projects) {
    const row = wsProjects.addRow({
      name: p.name,
      client: p.client ?? "",
      rate: p.hourlyRate ?? null,
      billable: p.billable ? "Yes" : "No",
      color: p.color,
    });
    row.getCell("rate").numFmt = '"$"#,##0.00;""';
  }
  applyDropdown(wsProjects, 4, '"Yes,No"', true);

  const wsTags = wb.addWorksheet(XLSX_SHEETS.TAGS, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wsTags.columns = [{ header: XLSX_TAG_HEADERS[0], key: "name", width: 28 }];
  applyHeaderStyle(wsTags);
  for (const t of tags) wsTags.addRow({ name: t.name });

  const wsEntries = wb.addWorksheet(XLSX_SHEETS.ENTRIES, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wsEntries.columns = [
    { header: XLSX_ENTRY_HEADERS[0], key: "date", width: 14 },
    { header: XLSX_ENTRY_HEADERS[1], key: "start", width: 12 },
    { header: XLSX_ENTRY_HEADERS[2], key: "duration", width: 12 },
    { header: XLSX_ENTRY_HEADERS[3], key: "description", width: 38 },
    { header: XLSX_ENTRY_HEADERS[4], key: "project", width: 22 },
    { header: XLSX_ENTRY_HEADERS[5], key: "tags", width: 22 },
    { header: XLSX_ENTRY_HEADERS[6], key: "billable", width: 10 },
  ];
  applyHeaderStyle(wsEntries);
  wsEntries.getColumn("date").numFmt = "@";
  wsEntries.getColumn("start").numFmt = "@";
  wsEntries.getColumn("duration").numFmt = "[h]:mm:ss";

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const tagsById = new Map(tags.map((t) => [t.id, t.name]));
  const sortedEntries = [...entries].sort((a, b) => a.startedAt - b.startedAt);
  for (const e of sortedEntries) {
    const start = new Date(e.startedAt);
    const durationMs = e.endedAt - e.startedAt;
    const project = e.projectId ? projectsById.get(e.projectId) : undefined;
    const row = wsEntries.addRow({
      date: toDateInputValue(start),
      start: timeOfDay(start),
      duration: durationMs / 86400000,
      description: e.description,
      project: project?.name ?? "",
      tags: e.tagIds
        .map((id) => tagsById.get(id) ?? "")
        .filter(Boolean)
        .join(", "),
      billable: e.billable ? "Yes" : "No",
    });
    row.getCell("duration").numFmt = "[h]:mm:ss";
  }

  applyDropdown(
    wsEntries,
    5,
    `=${XLSX_SHEETS.PROJECTS}!$A$2:$A$${XLSX_LOOKUP_RANGE_ROWS + 1}`,
    true
  );
  applyDropdown(
    wsEntries,
    6,
    `=${XLSX_SHEETS.TAGS}!$A$2:$A$${XLSX_LOOKUP_RANGE_ROWS + 1}`,
    false
  );
  applyDropdown(wsEntries, 7, '"Yes,No"', true);

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function xlsxFilenameForDate(date = new Date()): string {
  return `time-tracker-${toDateInputValue(date)}.xlsx`;
}
