"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Loader2,
  Clock,
  Lightbulb,
  X,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  getDescriptionSuggestions,
  getDescriptionTemplates,
} from "@/lib/description-hints";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/toast";

export type DescriptionEditorMode = "add" | "edit";

export type DescriptionEditorModalProps = {
  open: boolean;
  mode: DescriptionEditorMode;
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
  projectId?: string | null;
  projectName?: string;
  durationMs?: number;
};

export function DescriptionEditorModal({
  open,
  mode,
  value,
  onClose,
  onSave,
  projectId,
  projectName,
  durationMs,
}: DescriptionEditorModalProps) {
  const entries = useStore((s) => s.entries);
  const toast = useToast();

  const [draft, setDraft] = React.useState(value);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiSuggestions, setAiSuggestions] = React.useState<string[]>([]);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = React.useState<boolean | null>(null);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const listId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setDraft(mode === "add" ? "" : value);
    setAiSuggestions([]);
    setAiError(null);
    setHighlightIndex(-1);
  }, [open, mode, value]);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/ai/improve-description")
      .then((r) => r.json())
      .then((data: { enabled?: boolean }) => setAiEnabled(Boolean(data.enabled)))
      .catch(() => setAiEnabled(false));
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  const autocomplete = React.useMemo(
    () =>
      getDescriptionSuggestions(entries, {
        query: draft,
        projectId,
        limit: 6,
      }),
    [entries, draft, projectId]
  );

  const quickPicks = React.useMemo(() => {
    const fromHistory = getDescriptionSuggestions(entries, {
      projectId,
      limit: 4,
    });
    const templates = getDescriptionTemplates(projectName).slice(0, 3);
    const merged = [...fromHistory];
    for (const t of templates) {
      if (!merged.some((m) => m.toLowerCase() === t.toLowerCase())) {
        merged.push(t);
      }
    }
    return merged.slice(0, 6);
  }, [entries, projectId, projectName]);

  const showAutocomplete =
    draft.trim().length > 0 &&
    autocomplete.length > 0 &&
    autocomplete.some(
      (s) => s.toLowerCase() !== draft.trim().toLowerCase()
    );

  const commit = () => {
    onSave(draft.trim());
    onClose();
  };

  const applySuggestion = (text: string) => {
    setDraft(text);
    setHighlightIndex(-1);
    textareaRef.current?.focus();
  };

  const improveWithAi = async () => {
    setAiLoading(true);
    setAiSuggestions([]);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/improve-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: draft,
          projectName,
          durationLabel:
            durationMs && durationMs > 0
              ? formatDuration(durationMs)
              : undefined,
        }),
      });
      const data = (await res.json()) as {
        suggestions?: string[];
        error?: string;
      };
      if (!res.ok) {
        const message = data.error ?? "AI suggestions unavailable.";
        setAiError(message);
        toast({ message });
        return;
      }
      setAiError(null);
      setAiSuggestions(data.suggestions ?? []);
    } catch {
      toast({ message: "Could not reach AI service." });
    } finally {
      setAiLoading(false);
    }
  };

  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }

    if (!showAutocomplete || autocomplete.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, autocomplete.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      applySuggestion(autocomplete[highlightIndex]!);
    } else if (e.key === "Tab" && highlightIndex >= 0) {
      e.preventDefault();
      applySuggestion(autocomplete[highlightIndex]!);
    }
  };

  if (!open || !mounted) return null;

  const title = mode === "add" ? "Add description" : "Edit description";

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dialog-overlay-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="description-editor-title"
        className="relative w-full sm:max-w-lg max-h-[min(92vh,640px)] flex flex-col rounded-t-2xl sm:rounded-xl border border-border bg-card shadow-2xl dialog-content-in"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2
              id="description-editor-title"
              className="text-base font-semibold leading-snug"
            >
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {projectName ? (
                <>
                  <span className="font-medium text-foreground">
                    {projectName}
                  </span>
                  {durationMs && durationMs > 0 ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(durationMs)}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                "Describe what you worked on — used in reports and exports."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 shrink-0 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="relative">
            <label htmlFor="description-editor-input" className="sr-only">
              Description
            </label>
            <textarea
              ref={textareaRef}
              id="description-editor-input"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setHighlightIndex(-1);
                setAiSuggestions([]);
                setAiError(null);
              }}
              onKeyDown={onTextareaKeyDown}
              rows={4}
              placeholder="e.g. Implemented checkout flow and fixed payment webhook retries"
              className="w-full min-h-[7rem] px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring/60"
              aria-autocomplete="list"
              aria-controls={showAutocomplete ? listId : undefined}
              aria-expanded={showAutocomplete}
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>⌘↵ to save</span>
              <span>{draft.length} chars</span>
            </div>

            {showAutocomplete ? (
              <ul
                id={listId}
                role="listbox"
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-card shadow-lg py-1"
              >
                {autocomplete.map((suggestion, i) => (
                  <li key={suggestion} role="option" aria-selected={i === highlightIndex}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(suggestion)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm truncate hover:bg-muted",
                        i === highlightIndex && "bg-muted"
                      )}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {quickPicks.length > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                <Lightbulb className="size-3.5" />
                Quick picks
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPicks.map((pick) => (
                  <button
                    key={pick}
                    type="button"
                    onClick={() => applySuggestion(pick)}
                    className="px-2.5 py-1 rounded-full text-xs border border-border bg-muted/40 hover:bg-muted text-foreground max-w-full truncate"
                  >
                    {pick}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="size-3.5 text-primary" />
                AI assistant
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={aiLoading || aiEnabled === false}
                onClick={improveWithAi}
                title={
                  aiEnabled === false
                    ? "Add GEMINI_API_KEY to enable AI suggestions"
                    : "Generate improved descriptions"
                }
              >
                {aiLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {draft.trim() ? "Improve" : "Suggest"}
              </Button>
            </div>
            {aiError ? (
              <p className="text-xs text-danger leading-relaxed">{aiError}</p>
            ) : null}
            {aiEnabled === false ? (
              <p className="text-xs text-muted-foreground">
                Add{" "}
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                  GEMINI_API_KEY
                </code>{" "}
                from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
                . Quick picks from your history still work offline.
              </p>
            ) : null}
            {aiSuggestions.length > 0 ? (
              <div className="space-y-1.5">
                {aiSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 pt-3 border-t border-border shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={commit}>
            Save description
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
