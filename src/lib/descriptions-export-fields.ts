export type DescriptionExportFieldId =
  | "description"
  | "date"
  | "project"
  | "client"
  | "tags"
  | "startTime"
  | "endTime"
  | "duration"
  | "hours"
  | "billable"
  | "earned";

export type DescriptionExportFields = Record<DescriptionExportFieldId, boolean>;

export const EXPORT_FIELD_ORDER: DescriptionExportFieldId[] = [
  "date",
  "description",
  "project",
  "client",
  "tags",
  "startTime",
  "endTime",
  "duration",
  "hours",
  "billable",
  "earned",
];

export const EXPORT_FIELD_DEFS: {
  id: DescriptionExportFieldId;
  label: string;
  hint?: string;
}[] = [
  {
    id: "description",
    label: "Description",
    hint: "Full work summary — keeps line breaks",
  },
  { id: "date", label: "Date" },
  { id: "project", label: "Project" },
  { id: "client", label: "Client" },
  { id: "tags", label: "Tags" },
  { id: "startTime", label: "Start time" },
  { id: "endTime", label: "End time" },
  { id: "duration", label: "Duration (HH:MM:SS)" },
  { id: "hours", label: "Hours (decimal)" },
  { id: "billable", label: "Billable" },
  { id: "earned", label: "Earned" },
];

export const DEFAULT_EXPORT_FIELDS: DescriptionExportFields = {
  description: true,
  date: true,
  project: false,
  client: false,
  tags: false,
  startTime: false,
  endTime: false,
  duration: false,
  hours: false,
  billable: false,
  earned: false,
};

export const EXPORT_FIELD_PRESETS: {
  id: string;
  label: string;
  fields: DescriptionExportFields;
}[] = [
  {
    id: "description-date",
    label: "Description + date",
    fields: {
      description: true,
      date: true,
      project: false,
      client: false,
      tags: false,
      startTime: false,
      endTime: false,
      duration: false,
      hours: false,
      billable: false,
      earned: false,
    },
  },
  {
    id: "client-report",
    label: "Client report",
    fields: {
      description: true,
      date: true,
      project: true,
      client: true,
      tags: false,
      startTime: false,
      endTime: false,
      duration: true,
      hours: true,
      billable: true,
      earned: true,
    },
  },
  {
    id: "full",
    label: "All fields",
    fields: {
      description: true,
      date: true,
      project: true,
      client: true,
      tags: true,
      startTime: true,
      endTime: true,
      duration: true,
      hours: true,
      billable: true,
      earned: true,
    },
  },
];

const STORAGE_KEY = "timely-work-log-export-fields";

export function getActiveExportFields(
  fields: DescriptionExportFields
): DescriptionExportFieldId[] {
  return EXPORT_FIELD_ORDER.filter((id) => fields[id]);
}

export function exportFieldsLabel(fields: DescriptionExportFields): string {
  const active = getActiveExportFields(fields);
  if (active.length === 0) return "No fields selected";
  return active
    .map((id) => EXPORT_FIELD_DEFS.find((d) => d.id === id)?.label ?? id)
    .join(", ");
}

export function hasExportFields(fields: DescriptionExportFields): boolean {
  return getActiveExportFields(fields).length > 0;
}

export function loadExportFields(): DescriptionExportFields {
  if (typeof window === "undefined") return { ...DEFAULT_EXPORT_FIELDS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EXPORT_FIELDS };
    const parsed = JSON.parse(raw) as Partial<DescriptionExportFields>;
    return { ...DEFAULT_EXPORT_FIELDS, ...parsed };
  } catch {
    return { ...DEFAULT_EXPORT_FIELDS };
  }
}

export function saveExportFields(fields: DescriptionExportFields) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {
    /* ignore */
  }
}

export type DescriptionExportRow = {
  description: string;
  projectName: string;
  client: string;
  tags: string;
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationHours: number;
  billable: boolean;
  earned: number;
};

export function exportRowCellValue(
  row: DescriptionExportRow,
  field: DescriptionExportFieldId
): string {
  switch (field) {
    case "description":
      return row.description;
    case "date":
      return row.dateLabel;
    case "project":
      return row.projectName || "—";
    case "client":
      return row.client || "—";
    case "tags":
      return row.tags || "—";
    case "startTime":
      return row.startTime;
    case "endTime":
      return row.endTime;
    case "duration":
      return row.duration;
    case "hours":
      return row.durationHours.toFixed(2);
    case "billable":
      return row.billable ? "Yes" : "No";
    case "earned":
      return row.earned > 0 ? row.earned.toFixed(2) : "—";
  }
}

export function exportFieldHeader(field: DescriptionExportFieldId): string {
  return EXPORT_FIELD_DEFS.find((d) => d.id === field)?.label ?? field;
}

/** Prefer block layout (better for multi-line day summaries) in MD/DOCX. */
export function prefersBlockExportLayout(
  fields: DescriptionExportFields
): boolean {
  const active = getActiveExportFields(fields);
  return active.includes("description") && active.length <= 4;
}

export function descriptionLineCount(text: string): number {
  if (!text.trim()) return 1;
  return text.split("\n").length;
}
