import ExcelJS from "exceljs";
import { APP_FULL_TITLE } from "@/lib/brand";
import {
  descriptionLineCount,
  exportFieldHeader,
  exportRowCellValue,
  getActiveExportFields,
  prefersBlockExportLayout,
  type DescriptionExportFieldId,
  type DescriptionExportFields,
  type DescriptionExportRow,
} from "@/lib/descriptions-export-fields";

export type { DescriptionExportRow, DescriptionExportFields };

export type DescriptionExportMeta = {
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
};

function formatExportPeriod(meta: DescriptionExportMeta): string {
  return `${meta.periodLabel} (${meta.dateFrom} — ${meta.dateTo})`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function entryMetaBullets(
  row: DescriptionExportRow,
  fields: DescriptionExportFields
): string[] {
  const bullets: string[] = [];
  if (fields.project && row.projectName) {
    bullets.push(`**Project:** ${row.projectName}`);
  }
  if (fields.client && row.client) {
    bullets.push(`**Client:** ${row.client}`);
  }
  if (fields.tags && row.tags) {
    bullets.push(`**Tags:** ${row.tags}`);
  }
  if (fields.startTime && fields.endTime) {
    bullets.push(`**Time:** ${row.startTime} – ${row.endTime}`);
  } else {
    if (fields.startTime) bullets.push(`**Start:** ${row.startTime}`);
    if (fields.endTime) bullets.push(`**End:** ${row.endTime}`);
  }
  if (fields.duration) bullets.push(`**Duration:** ${row.duration}`);
  if (fields.hours) bullets.push(`**Hours:** ${row.durationHours.toFixed(2)}`);
  if (fields.billable) {
    bullets.push(`**Billable:** ${row.billable ? "Yes" : "No"}`);
  }
  if (fields.earned && row.earned > 0) {
    bullets.push(`**Earned:** $${row.earned.toFixed(2)}`);
  }
  return bullets;
}

export function buildDescriptionsMarkdown(
  rows: DescriptionExportRow[],
  meta: DescriptionExportMeta,
  fields: DescriptionExportFields
): string {
  const lines: string[] = [
    `**Period:** ${formatExportPeriod(meta)}`,
    "",
    "---",
    "",
  ];

  if (rows.length === 0) {
    lines.push("_No descriptions found for this period._");
    return lines.join("\n");
  }

  const useBlocks = prefersBlockExportLayout(fields);
  const groupByProject = fields.project && !useBlocks;

  let currentProject = "";
  for (const row of rows) {
    if (groupByProject) {
      const projectKey = row.projectName || "No project";
      if (projectKey !== currentProject) {
        if (currentProject) lines.push("");
        currentProject = projectKey;
        lines.push(
          `## ${projectKey}${row.client && fields.client ? ` · ${row.client}` : ""}`,
          ""
        );
      }
    }

    if (useBlocks) {
      if (fields.date) {
        lines.push(`## ${row.dateLabel}`, "");
      }

      const inlineMeta: string[] = [];
      if (fields.duration) inlineMeta.push(row.duration);
      if (fields.hours) inlineMeta.push(`${row.durationHours.toFixed(2)}h`);
      if (fields.project && row.projectName) inlineMeta.push(row.projectName);
      if (inlineMeta.length > 0) {
        lines.push(`*${inlineMeta.join(" · ")}*`, "");
      }

      if (fields.description) {
        lines.push(row.description.trim() || "_No description_", "");
      }

      const bullets = entryMetaBullets(row, fields).filter(
        (b) =>
          !b.startsWith("**Duration:**") &&
          !b.startsWith("**Hours:**") &&
          !b.startsWith("**Project:**")
      );
      if (bullets.length > 0) {
        lines.push(...bullets.map((b) => `- ${b}`), "");
      }
    } else {
      const headingParts: string[] = [];
      if (fields.date) headingParts.push(row.dateLabel);
      if (fields.duration) headingParts.push(row.duration);
      lines.push(`### ${headingParts.join(" · ") || "Entry"}`, "");

      if (fields.description) {
        lines.push(row.description.trim() || "_No description_", "");
      }

      const bullets = entryMetaBullets(row, fields);
      if (bullets.length > 0) {
        lines.push(...bullets.map((b) => `- ${b}`), "");
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function exportDescriptionsMarkdown(
  markdown: string,
  filename: string
) {
  downloadBlob(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    filename
  );
}

export async function exportDescriptionsXlsx(
  rows: DescriptionExportRow[],
  meta: DescriptionExportMeta,
  fields: DescriptionExportFields,
  filename: string
) {
  const active = getActiveExportFields(fields);
  const wb = new ExcelJS.Workbook();
  wb.creator = APP_FULL_TITLE;
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 22 },
    { header: "Value", key: "value", width: 40 },
  ];
  summary.addRows([{ field: "Period", value: formatExportPeriod(meta) }]);
  summary.getRow(1).font = { bold: true };

  const ws = wb.addWorksheet("Descriptions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = active.map((field) => ({
    header: exportFieldHeader(field),
    key: field,
    width: field === "description" ? 64 : field === "date" ? 16 : 14,
  }));

  for (const row of rows) {
    const record: Record<string, string | number> = {};
    for (const field of active) {
      record[field] = exportRowCellValue(row, field);
    }
    const added = ws.addRow(record);
    const descIdx = active.indexOf("description");
    if (descIdx >= 0) {
      const cell = added.getCell(descIdx + 1);
      cell.alignment = { wrapText: true, vertical: "top" };
      const lines = descriptionLineCount(row.description);
      added.height = Math.min(409, Math.max(18, lines * 15));
    }
  }

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}

function docxDescriptionParagraphs(
  Paragraph: typeof import("docx").Paragraph,
  TextRun: typeof import("docx").TextRun,
  text: string
) {
  const trimmed = text.trim();
  if (!trimmed) {
    return [new Paragraph({ children: [new TextRun("—")] })];
  }
  return trimmed.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line || " ")],
        spacing: { after: 80 },
      })
  );
}

function docxTableCell(
  field: DescriptionExportFieldId,
  row: DescriptionExportRow,
  Paragraph: typeof import("docx").Paragraph,
  TextRun: typeof import("docx").TextRun,
  TableCell: typeof import("docx").TableCell
) {
  if (field === "description") {
    return new TableCell({
      children: docxDescriptionParagraphs(Paragraph, TextRun, row.description),
    });
  }
  return new TableCell({
    children: [
      new Paragraph(String(exportRowCellValue(row, field))),
    ],
  });
}

export async function exportDescriptionsDocx(
  rows: DescriptionExportRow[],
  meta: DescriptionExportMeta,
  fields: DescriptionExportFields,
  filename: string
) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
  } = await import("docx");

  const active = getActiveExportFields(fields);

  const children: (
    | InstanceType<typeof Paragraph>
    | InstanceType<typeof Table>
  )[] = [
    new Paragraph({
      children: [
        new TextRun({ text: "Period: ", bold: true }),
        new TextRun(formatExportPeriod(meta)),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  if (rows.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "No descriptions found.", italics: true }),
        ],
      })
    );
  } else if (prefersBlockExportLayout(fields)) {
    for (const row of rows) {
      if (fields.date) {
        children.push(
          new Paragraph({
            text: row.dateLabel,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      }

      const inline: string[] = [];
      if (fields.duration) inline.push(row.duration);
      if (fields.hours) inline.push(`${row.durationHours.toFixed(2)}h`);
      if (fields.project && row.projectName) inline.push(row.projectName);
      if (inline.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: inline.join(" · "), italics: true })],
            spacing: { after: 120 },
          })
        );
      }

      if (fields.description) {
        children.push(
          ...docxDescriptionParagraphs(Paragraph, TextRun, row.description)
        );
      }

      for (const bullet of entryMetaBullets(row, fields)) {
        if (
          bullet.startsWith("**Duration:**") ||
          bullet.startsWith("**Hours:**") ||
          (bullet.startsWith("**Project:**") && inline.includes(row.projectName))
        ) {
          continue;
        }
        children.push(
          new Paragraph({
            text: bullet.replace(/\*\*/g, ""),
            bullet: { level: 0 },
          })
        );
      }

      children.push(new Paragraph({ text: "" }));
    }
  } else {
    const tableRows = [
      new TableRow({
        children: active.map(
          (field) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: exportFieldHeader(field), bold: true }),
                  ],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: active.map((field) =>
              docxTableCell(field, row, Paragraph, TextRun, TableCell)
            ),
          })
      ),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

export async function exportDescriptionsPdf(
  rows: DescriptionExportRow[],
  meta: DescriptionExportMeta,
  fields: DescriptionExportFields,
  filename: string
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const active = getActiveExportFields(fields);

  const doc = new jsPDF({
    orientation: active.includes("description") ? "landscape" : "portrait",
  });
  doc.setFontSize(10);
  doc.text(`Period: ${formatExportPeriod(meta)}`, 14, 16);

  if (rows.length === 0) {
    doc.text("No descriptions found for this period.", 14, 26);
  } else {
    const descIdx = active.indexOf("description");
    const columnStyles: Record<number, { cellWidth?: number | "auto" | "wrap" }> =
      {};
    if (descIdx >= 0) {
      columnStyles[descIdx] = { cellWidth: "wrap" };
    }

    autoTable(doc, {
      startY: 24,
      head: [active.map((field) => exportFieldHeader(field))],
      body: rows.map((row) =>
        active.map((field) => exportRowCellValue(row, field))
      ),
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: { fillColor: [99, 102, 241] },
      columnStyles,
    });
  }

  doc.save(filename);
}

export function descriptionsExportFilename(
  prefix: string,
  dateFrom: string,
  dateTo: string,
  ext: string
) {
  const from = dateFrom.replace(/-/g, "");
  const to = dateTo.replace(/-/g, "");
  return `${prefix}-${from}-${to}.${ext}`;
}
