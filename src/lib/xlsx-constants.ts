/** Shared workbook sheet names for import and export. */
export const XLSX_SHEETS = {
  PROJECTS: "Projects",
  TAGS: "Tags",
  ENTRIES: "Time Entries",
} as const;

export const XLSX_PROJECT_HEADERS = [
  "Name",
  "Client",
  "Hourly Rate",
  "Billable",
  "Color",
] as const;

export const XLSX_TAG_HEADERS = ["Name"] as const;

export const XLSX_ENTRY_HEADERS = [
  "Date",
  "Start",
  "Duration",
  "Description",
  "Project",
  "Tags",
  "Billable",
] as const;

/** Rows pre-armed with data-validation dropdowns on the Entries sheet. */
export const XLSX_DROPDOWN_ROWS = 1000;

/** Lookup range height for project / tag dropdown sources. */
export const XLSX_LOOKUP_RANGE_ROWS = 1000;
