"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DescriptionEditorModal,
  type DescriptionEditorMode,
} from "@/components/description-editor-modal";

export type DescriptionFieldProps = {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  projectId?: string | null;
  projectName?: string;
  durationMs?: number;
  /** Timer bar: larger touch target. Entry row: compact inline. */
  variant?: "bar" | "row";
  className?: string;
  onEnter?: () => void;
};

export function DescriptionField({
  value,
  onSave,
  placeholder = "What are you working on?",
  projectId,
  projectName,
  durationMs,
  variant = "bar",
  className,
  onEnter,
}: DescriptionFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<DescriptionEditorMode>("edit");

  const openModal = (nextMode: DescriptionEditorMode) => {
    setMode(nextMode);
    setOpen(true);
  };

  const handleClose = React.useCallback(() => setOpen(false), []);

  const isBar = variant === "bar";
  const hasDescription = Boolean(value.trim());

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 min-w-0",
          isBar ? "flex-1" : "flex-1",
          className
        )}
      >
        <button
          type="button"
          onClick={() => openModal(hasDescription ? "edit" : "add")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={cn(
            "flex-1 min-w-0 text-left rounded-md border border-transparent hover:border-input focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer transition-colors",
            isBar
              ? "h-11 px-3 text-sm md:text-base hover:bg-muted/30"
              : "h-9 px-2 text-sm hover:bg-muted/40",
            !hasDescription && "text-muted-foreground"
          )}
        >
          <span className="block truncate">
            {hasDescription ? (
              value.trim()
            ) : (
              <span className="italic">{placeholder}</span>
            )}
          </span>
        </button>

        {hasDescription ? (
          <button
            type="button"
            onClick={() => openModal("edit")}
            title="Edit description"
            aria-label="Edit description"
            className={cn(
              "grid place-items-center rounded-md border border-input bg-muted/30 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer transition-colors",
              isBar ? "h-11 w-11" : "size-8",
              open && mode === "edit" && "bg-primary text-primary-foreground border-primary"
            )}
          >
            <Pencil className={isBar ? "size-4" : "size-3.5"} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openModal("add")}
            title="Add description"
            aria-label="Add description"
            className={cn(
              "grid place-items-center rounded-md border border-input bg-muted/30 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer transition-colors",
              isBar ? "h-11 w-11" : "size-8",
              open && mode === "add" && "bg-primary text-primary-foreground border-primary"
            )}
          >
            <Plus className={isBar ? "size-4" : "size-3.5"} />
          </button>
        )}
      </div>

      <DescriptionEditorModal
        open={open}
        mode={mode}
        value={value}
        onClose={handleClose}
        onSave={onSave}
        projectId={projectId}
        projectName={projectName}
        durationMs={durationMs}
      />
    </>
  );
}
