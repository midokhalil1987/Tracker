"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DescriptionsMarkdownPreviewModalProps = {
  open: boolean;
  markdown: string;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
};

export function DescriptionsMarkdownPreviewModal({
  open,
  markdown,
  filename,
  onClose,
  onDownload,
}: DescriptionsMarkdownPreviewModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<"preview" | "source">("preview");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setTab("preview");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-pointer"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-preview-title"
        className="relative z-10 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2
              id="md-preview-title"
              className="text-base font-semibold truncate"
            >
              Markdown preview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {filename}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <div className="inline-flex rounded-md border border-input p-0.5 bg-muted/40">
            {(["preview", "source"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "px-3 h-8 rounded text-xs font-medium cursor-pointer capitalize",
                  tab === id
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 scrollbar-thin">
          {tab === "preview" ? (
            <article className="text-sm space-y-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_p]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-muted-foreground [&_hr]:border-border">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </article>
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-muted/40 rounded-lg p-4 border border-border">
              {markdown}
            </pre>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onDownload}>
            <Download className="size-4" />
            Download .md
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
