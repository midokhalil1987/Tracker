"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Trash2,
  DollarSign,
  Copy,
  Tag as TagIcon,
  Check,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  cn,
  formatDuration,
  formatTime,
  parseDuration,
  toTimeInputValue,
  applyTimeToTimestamp,
} from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";
import { ProjectPicker } from "./project-picker";
import { TagPicker } from "./tag-picker";

export function EntryRow({ entry }: { entry: TimeEntry }) {
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);
  const duplicateEntry = useStore((s) => s.duplicateEntry);
  const continueEntry = useStore((s) => s.continueEntry);
  const router = useRouter();

  const [editingDesc, setEditingDesc] = React.useState(false);
  const [desc, setDesc] = React.useState(entry.description);
  const [lastSyncedDesc, setLastSyncedDesc] = React.useState(
    entry.description
  );
  if (!editingDesc && entry.description !== lastSyncedDesc) {
    setLastSyncedDesc(entry.description);
    setDesc(entry.description);
  }

  const project = projects.find((p) => p.id === entry.projectId);
  const entryTags = tags.filter((t) => entry.tagIds.includes(t.id));

  const ms = entry.endedAt - entry.startedAt;

  const [editingDuration, setEditingDuration] = React.useState(false);
  const [duration, setDuration] = React.useState(() => formatDuration(ms));
  const [lastSyncedMs, setLastSyncedMs] = React.useState(ms);
  if (!editingDuration && ms !== lastSyncedMs) {
    setLastSyncedMs(ms);
    setDuration(formatDuration(ms));
  }

  const [editingTimes, setEditingTimes] = React.useState(false);
  const [startTime, setStartTime] = React.useState(() =>
    toTimeInputValue(entry.startedAt)
  );
  const [endTime, setEndTime] = React.useState(() =>
    toTimeInputValue(entry.endedAt)
  );
  const [lastSyncedStart, setLastSyncedStart] = React.useState(entry.startedAt);
  const [lastSyncedEnd, setLastSyncedEnd] = React.useState(entry.endedAt);
  if (
    !editingTimes &&
    (entry.startedAt !== lastSyncedStart || entry.endedAt !== lastSyncedEnd)
  ) {
    setLastSyncedStart(entry.startedAt);
    setLastSyncedEnd(entry.endedAt);
    setStartTime(toTimeInputValue(entry.startedAt));
    setEndTime(toTimeInputValue(entry.endedAt));
  }

  const commitDesc = () => {
    setEditingDesc(false);
    if (desc !== entry.description) updateEntry(entry.id, { description: desc });
  };

  const commitDuration = () => {
    setEditingDuration(false);
    const parsed = parseDuration(duration);
    if (parsed && parsed > 0) {
      // Adjust startedAt so endedAt stays put
      updateEntry(entry.id, { startedAt: entry.endedAt - parsed });
    } else {
      setDuration(formatDuration(ms));
    }
  };

  const resetTimes = () => {
    setStartTime(toTimeInputValue(entry.startedAt));
    setEndTime(toTimeInputValue(entry.endedAt));
    setEditingTimes(false);
  };

  const commitTimes = () => {
    const startedAt = applyTimeToTimestamp(entry.startedAt, startTime);
    let endedAt = applyTimeToTimestamp(entry.endedAt, endTime);
    if (startedAt === null || endedAt === null) {
      resetTimes();
      return;
    }
    // If end is not after start on the chosen calendar days, roll end forward
    // by whole days (supports entries that span past midnight).
    while (endedAt <= startedAt) {
      endedAt += 86400000;
    }
    setEditingTimes(false);
    if (startedAt !== entry.startedAt || endedAt !== entry.endedAt) {
      updateEntry(entry.id, { startedAt, endedAt });
    }
  };

  const daySpanBadge = (() => {
    const startDay = new Date(entry.startedAt);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(entry.endedAt);
    endDay.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (endDay.getTime() - startDay.getTime()) / 86400000
    );
    if (diff <= 0) return null;
    return (
      <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary leading-none">
        +{diff}d
      </span>
    );
  })();

  const handleContinue = () => {
    continueEntry(entry.id);
    router.push("/");
  };

  return (
    <div className="group flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 hover:bg-muted/40">
      <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3">
        {editingDesc ? (
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={commitDesc}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDesc();
              if (e.key === "Escape") {
                setDesc(entry.description);
                setEditingDesc(false);
              }
            }}
            autoFocus
            className="flex-1 min-w-0 h-9 px-2 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/60"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingDesc(true)}
            className="flex-1 min-w-0 text-left text-sm truncate hover:text-primary"
          >
            {entry.description || (
              <span className="text-muted-foreground italic">
                Add description
              </span>
            )}
          </button>
        )}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <ProjectPicker
            value={entry.projectId}
            onChange={(id) => updateEntry(entry.id, { projectId: id })}
            size="sm"
          />
        </div>
      </div>

      {/* Tags - desktop chips */}
      <div className="hidden xl:flex items-center gap-1 shrink-0 max-w-[200px]">
        {entryTags.length > 0 ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
            <TagIcon className="size-3" />
            <span className="truncate">
              {entryTags.map((t) => t.name).join(", ")}
            </span>
          </div>
        ) : (
          <TagPicker
            value={entry.tagIds}
            onChange={(ids) => updateEntry(entry.id, { tagIds: ids })}
            size="sm"
          />
        )}
      </div>

      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground tabular-nums shrink-0">
        {editingTimes ? (
          <div className="flex items-center gap-1">
            <input
              type="time"
              value={startTime}
              step={60}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-8 w-[5.5rem] px-1 text-xs rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-ring/60"
              aria-label="Start time"
            />
            <span>–</span>
            <input
              type="time"
              value={endTime}
              step={60}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-8 w-[5.5rem] px-1 text-xs rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-ring/60"
              aria-label="End time"
            />
            <button
              type="button"
              onClick={commitTimes}
              className="size-7 grid place-items-center rounded-md text-success hover:bg-success/10"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={resetTimes}
              className="size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTimes(true)}
            className="flex items-center gap-1 hover:text-primary text-left"
            title={`${new Date(entry.startedAt).toLocaleString()} → ${new Date(
              entry.endedAt
            ).toLocaleString()}`}
          >
            <span>
              {formatTime(entry.startedAt)} – {formatTime(entry.endedAt)}
            </span>
            {daySpanBadge}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => updateEntry(entry.id, { billable: !entry.billable })}
        className={cn(
          "hidden md:grid size-7 place-items-center rounded-md shrink-0",
          entry.billable
            ? "text-success bg-success/10"
            : "text-muted-foreground/40 hover:bg-muted"
        )}
        title={entry.billable ? "Billable" : "Not billable"}
      >
        <DollarSign className="size-4" />
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className="size-2 rounded-full md:hidden"
          style={{ background: project?.color ?? "transparent" }}
        />
        {editingDuration ? (
          <div className="flex items-center gap-1">
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={commitDuration}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDuration();
                if (e.key === "Escape") {
                  setDuration(formatDuration(ms));
                  setEditingDuration(false);
                }
              }}
              autoFocus
              className="h-8 w-24 px-2 text-sm rounded-md border border-input bg-card font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/60"
            />
            <button
              onClick={commitDuration}
              className="size-7 grid place-items-center rounded-md text-success hover:bg-success/10"
            >
              <Check className="size-4" />
            </button>
            <button
              onClick={() => {
                setDuration(formatDuration(ms));
                setEditingDuration(false);
              }}
              className="size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingDuration(true)}
            className="font-mono tabular-nums text-sm font-semibold w-20 text-right hover:text-primary"
          >
            {formatDuration(ms)}
          </button>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleContinue}
          className="size-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary"
          title="Continue this entry"
        >
          <Play className="size-4 fill-current" />
        </button>
        <button
          type="button"
          onClick={() => duplicateEntry(entry.id)}
          className="size-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Duplicate"
        >
          <Copy className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this time entry?")) deleteEntry(entry.id);
          }}
          className="size-8 grid place-items-center rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
