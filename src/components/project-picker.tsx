"use client";

import * as React from "react";
import { Plus, Check, Search, FolderKanban, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, pickDefaultColor } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type ProjectPickerProps = {
  value: string | null;
  onChange: (id: string | null) => void;
  size?: "sm" | "md";
  className?: string;
};

export function ProjectPicker({
  value,
  onChange,
  size = "md",
  className,
}: ProjectPickerProps) {
  const projects = useStore((s) => s.projects);
  const addProject = useStore((s) => s.addProject);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = projects.find((p) => p.id === value);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = () => {
    const name = query.trim();
    if (!name) return;
    const project = addProject({
      name,
      color: pickDefaultColor(projects.length),
      billable: false,
    });
    onChange(project.id);
    setQuery("");
    setOpen(false);
  };

  const heightCls = size === "sm" ? "h-8 text-xs" : "h-9 text-sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 px-3 rounded-md border border-input bg-card hover:bg-muted/60 cursor-pointer",
            heightCls,
            className
          )}
        >
          {selected ? (
            <>
              <span
                className="size-2.5 rounded-full"
                style={{ background: selected.color }}
              />
              <span className="truncate max-w-[160px]">{selected.name}</span>
            </>
          ) : (
            <>
              <FolderKanban className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Project</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create project..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 cursor-text"
            autoFocus
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-thin py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No projects found.
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left cursor-pointer"
                )}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="flex-1 truncate">
                  {p.name}
                  {p.client ? (
                    <span className="text-muted-foreground">
                      {" · "}
                      {p.client}
                    </span>
                  ) : null}
                </span>
                {value === p.id ? (
                  <Check className="size-4 text-primary" />
                ) : null}
              </button>
            ))
          )}
        </div>
        {query.trim() &&
        !projects.some(
          (p) => p.name.toLowerCase() === query.trim().toLowerCase()
        ) ? (
          <button
            type="button"
            onClick={handleCreate}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border-t border-border hover:bg-muted text-left cursor-pointer"
          >
            <Plus className="size-4 text-primary" />
            <span>
              Create{" "}
              <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span>
            </span>
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
