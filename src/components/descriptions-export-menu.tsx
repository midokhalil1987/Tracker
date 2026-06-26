"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { DescriptionsMarkdownPreviewModal } from "@/components/descriptions-markdown-preview-modal";
import {
  buildDescriptionsMarkdown,
  descriptionsExportFilename,
  exportDescriptionsDocx,
  exportDescriptionsMarkdown,
  exportDescriptionsPdf,
  exportDescriptionsXlsx,
  type DescriptionExportMeta,
  type DescriptionExportRow,
} from "@/lib/descriptions-export";
import {
  DEFAULT_EXPORT_FIELDS,
  EXPORT_FIELD_DEFS,
  EXPORT_FIELD_PRESETS,
  exportFieldsLabel,
  hasExportFields,
  loadExportFields,
  saveExportFields,
  type DescriptionExportFields,
} from "@/lib/descriptions-export-fields";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";

type DescriptionsExportMenuProps = {
  rows: DescriptionExportRow[];
  meta: DescriptionExportMeta;
  dateFrom: string;
  dateTo: string;
  disabled?: boolean;
};

const exportOptions = [
  { id: "xlsx" as const, label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { id: "docx" as const, label: "Word (.docx)", icon: FileType },
  { id: "pdf" as const, label: "PDF (.pdf)", icon: FileText },
  { id: "md" as const, label: "Markdown (.md)", icon: FileText },
];

export function DescriptionsExportMenu({
  rows,
  meta,
  dateFrom,
  dateTo,
  disabled,
}: DescriptionsExportMenuProps) {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [mdPreviewOpen, setMdPreviewOpen] = React.useState(false);
  const [markdown, setMarkdown] = React.useState("");
  const [fields, setFields] = React.useState<DescriptionExportFields>(
    DEFAULT_EXPORT_FIELDS
  );

  React.useEffect(() => {
    setFields(loadExportFields());
  }, []);

  const updateFields = (next: DescriptionExportFields) => {
    setFields(next);
    saveExportFields(next);
  };

  const toggleField = (id: keyof DescriptionExportFields) => {
    const next = { ...fields, [id]: !fields[id] };
    if (!hasExportFields(next)) return;
    updateFields(next);
  };

  const applyPreset = (presetFields: DescriptionExportFields) => {
    updateFields({ ...presetFields });
  };

  const fieldsLabel = exportFieldsLabel(fields);

  const mdFilename = descriptionsExportFilename(
    "work-log",
    dateFrom,
    dateTo,
    "md"
  );

  const handleExport = async (format: (typeof exportOptions)[number]["id"]) => {
    if (!hasExportFields(fields)) {
      toast({ message: "Select at least one column to export." });
      return;
    }

    setOpen(false);
    try {
      if (format === "md") {
        const md = buildDescriptionsMarkdown(rows, meta, fields);
        setMarkdown(md);
        setMdPreviewOpen(true);
        return;
      }

      const filename = descriptionsExportFilename(
        "work-log",
        dateFrom,
        dateTo,
        format
      );

      if (format === "xlsx") {
        await exportDescriptionsXlsx(rows, meta, fields, filename);
      } else if (format === "docx") {
        await exportDescriptionsDocx(rows, meta, fields, filename);
      } else if (format === "pdf") {
        await exportDescriptionsPdf(rows, meta, fields, filename);
      }

      toast({ message: `Exported ${filename}` });
    } catch {
      toast({ message: "Export failed. Please try again." });
    }
  };

  const handleMdDownload = () => {
    exportDescriptionsMarkdown(markdown, mdFilename);
    toast({ message: `Exported ${mdFilename}` });
    setMdPreviewOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" disabled={disabled}>
            <Download className="size-4" />
            Export
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <div className="p-3 border-b border-border space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Columns to include
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXPORT_FIELD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.fields)}
                    className="px-2.5 h-7 rounded-md text-xs border border-input bg-muted/40 hover:bg-muted cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 max-h-44 overflow-y-auto scrollbar-thin pr-1">
              {EXPORT_FIELD_DEFS.map(({ id, label, hint }) => (
                <label
                  key={id}
                  className={cn(
                    "flex items-start gap-2 text-sm cursor-pointer rounded-md px-1 py-0.5 hover:bg-muted/60",
                    id === "description" && "col-span-2"
                  )}
                  title={hint}
                >
                  <input
                    type="checkbox"
                    checked={fields[id]}
                    onChange={() => toggleField(id)}
                    className="size-4 mt-0.5 accent-primary shrink-0"
                  />
                  <span className="leading-snug">
                    {label}
                    {hint ? (
                      <span className="block text-[11px] text-muted-foreground font-normal">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {fieldsLabel}. Multi-line descriptions keep their line breaks in
              every format.
            </p>
          </div>
          <div className="p-1">
            {exportOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => void handleExport(id)}
                disabled={!hasExportFields(fields)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon className="size-4 text-muted-foreground shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DescriptionsMarkdownPreviewModal
        open={mdPreviewOpen}
        markdown={markdown}
        filename={mdFilename}
        onClose={() => setMdPreviewOpen(false)}
        onDownload={handleMdDownload}
      />
    </>
  );
}
