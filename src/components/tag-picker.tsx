"use client";

import * as React from "react";
import { Plus, Check, Search, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type TagPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  size?: "sm" | "md";
  className?: string;
};

export function TagPicker({
  value,
  onChange,
  size = "md",
  className,
}: TagPickerProps) {
  const tags = useStore((s) => s.tags);
  const addTag = useStore((s) => s.addTag);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = tags.filter((t) => value.includes(t.id));
  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const handleCreate = () => {
    const name = query.trim();
    if (!name) return;
    const tag = addTag(name);
    if (!value.includes(tag.id)) onChange([...value, tag.id]);
    setQuery("");
  };

  const heightCls = size === "sm" ? "h-8 text-xs" : "h-9 text-sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 px-3 rounded-md border border-input bg-card hover:bg-muted/60 max-w-[260px]",
            heightCls,
            className
          )}
        >
          <TagIcon className="size-4 text-muted-foreground shrink-0" />
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Tags</span>
          ) : (
            <span className="truncate">
              {selected.map((t) => t.name).join(", ")}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create tag..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (
                  query.trim() &&
                  !tags.some(
                    (t) => t.name.toLowerCase() === query.trim().toLowerCase()
                  )
                ) {
                  handleCreate();
                }
              }
            }}
          />
        </div>
        <div className="max-h-56 overflow-y-auto scrollbar-thin py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No tags found.
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
              >
                <span
                  className={cn(
                    "size-4 rounded border grid place-items-center",
                    value.includes(t.id)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {value.includes(t.id) ? <Check className="size-3" /> : null}
                </span>
                <span className="flex-1 truncate">{t.name}</span>
              </button>
            ))
          )}
        </div>
        {query.trim() &&
        !tags.some(
          (t) => t.name.toLowerCase() === query.trim().toLowerCase()
        ) ? (
          <button
            type="button"
            onClick={handleCreate}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border-t border-border hover:bg-muted text-left"
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
