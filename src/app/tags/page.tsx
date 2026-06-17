"use client";

import * as React from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function TagsPage() {
  const tags = useStore((s) => s.tags);
  const entries = useStore((s) => s.entries);
  const addTag = useStore((s) => s.addTag);
  const deleteTag = useStore((s) => s.deleteTag);

  const [name, setName] = React.useState("");

  const usage = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.tagIds) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [entries]);

  const handleAdd = () => {
    if (!name.trim()) return;
    addTag(name.trim());
    setName("");
  };

  return (
    <>
      <PageHeader
        title="Tags"
        description="Add tags to organize and filter your time entries."
      />
      <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
        <Card>
          <div className="p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                New tag
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                placeholder="e.g. urgent, research, qa"
              />
            </div>
            <Button onClick={handleAdd} disabled={!name.trim()}>
              <Plus className="size-4" /> Add tag
            </Button>
          </div>
        </Card>

        {tags.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <TagIcon className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No tags yet</h3>
            <p className="text-sm text-muted-foreground">
              Create tags to categorize your time entries.
            </p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {tags.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm">
                      <TagIcon className="size-3.5 text-muted-foreground" />
                      <span>{t.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {usage.get(t.id) ?? 0} entries
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete tag "${t.name}"?`)) deleteTag(t.id);
                    }}
                    className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
