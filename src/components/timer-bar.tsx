"use client";

import * as React from "react";
import { Play, Square, DollarSign, Clock4, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  cn,
  formatDuration,
  formatTime,
  fromDateInputValue,
  parseDuration,
  toDateInputValue,
  toTimeInputValue,
  applyTimeToTimestamp,
} from "@/lib/utils";
import { ProjectPicker } from "./project-picker";
import { TagPicker } from "./tag-picker";

export function TimerBar() {
  const running = useStore((s) => s.running);
  const startTimer = useStore((s) => s.startTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const updateRunning = useStore((s) => s.updateRunning);
  const addEntry = useStore((s) => s.addEntry);

  // Draft state when no timer is running
  const [draftDesc, setDraftDesc] = React.useState("");
  const [draftProject, setDraftProject] = React.useState<string | null>(null);
  const [draftTags, setDraftTags] = React.useState<string[]>([]);
  const [draftBillable, setDraftBillable] = React.useState(false);

  // Manual time mode
  const [mode, setMode] = React.useState<"timer" | "manual">("timer");
  const [manualDuration, setManualDuration] = React.useState("01:00:00");
  const [manualDate, setManualDate] = React.useState<string>(() =>
    toDateInputValue(new Date())
  );
  const [manualStartTime, setManualStartTime] = React.useState(() =>
    toTimeInputValue(Date.now())
  );

  const [editingSince, setEditingSince] = React.useState(false);
  const [sinceTime, setSinceTime] = React.useState("");

  const beginEditSince = () => {
    if (!running) return;
    setSinceTime(toTimeInputValue(running.startedAt));
    setEditingSince(true);
  };

  React.useEffect(() => {
    if (!running) setEditingSince(false);
  }, [running]);

  // Live ticker
  const [now, setNow] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = running ? now - running.startedAt : 0;

  const description = running ? running.description : draftDesc;
  const projectId = running ? running.projectId : draftProject;
  const tagIds = running ? running.tagIds : draftTags;
  const billable = running ? running.billable : draftBillable;

  const setDescription = (v: string) =>
    running ? updateRunning({ description: v }) : setDraftDesc(v);
  const setProject = (v: string | null) =>
    running ? updateRunning({ projectId: v }) : setDraftProject(v);
  const setTags = (v: string[]) =>
    running ? updateRunning({ tagIds: v }) : setDraftTags(v);
  const setBillable = (v: boolean) =>
    running ? updateRunning({ billable: v }) : setDraftBillable(v);

  const handleStart = () => {
    startTimer({
      description: draftDesc,
      projectId: draftProject,
      tagIds: draftTags,
      billable: draftBillable,
    });
  };

  const handleStop = () => {
    stopTimer();
    setDraftDesc("");
    setDraftProject(null);
    setDraftTags([]);
    setDraftBillable(false);
  };

  const resetSince = () => {
    if (!running) return;
    setSinceTime(toTimeInputValue(running.startedAt));
    setEditingSince(false);
  };

  const commitSince = () => {
    if (!running) return;
    const startedAt = applyTimeToTimestamp(running.startedAt, sinceTime);
    if (startedAt === null || startedAt > Date.now()) {
      resetSince();
      return;
    }
    setEditingSince(false);
    if (startedAt !== running.startedAt) {
      updateRunning({ startedAt });
    }
  };

  const handleAddManual = () => {
    const ms = parseDuration(manualDuration);
    if (!ms || ms <= 0) return;
    const chosenDate = fromDateInputValue(manualDate) ?? new Date();
    const startedAt = applyTimeToTimestamp(chosenDate.getTime(), manualStartTime);
    if (startedAt === null) return;
    // endedAt = startedAt + duration. This naturally supports spanning past
    // midnight (e.g. 4:00 PM Jun 16 + 10:00:00 = 2:00 AM Jun 17).
    const endedAt = startedAt + ms;
    addEntry({
      description: draftDesc,
      projectId: draftProject,
      tagIds: draftTags,
      billable: draftBillable,
      startedAt,
      endedAt,
    });
    setDraftDesc("");
    setDraftProject(null);
    setDraftTags([]);
    setDraftBillable(false);
    setManualDuration("01:00:00");
    setManualDate(toDateInputValue(new Date()));
  };

  return (
    <div className="shrink-0 bg-card border-b border-border">
      <div className="px-4 md:px-6 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you working on?"
          className="flex-1 min-w-0 h-11 px-3 rounded-md bg-transparent border border-input focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-transparent text-sm md:text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && mode === "timer" && !running) handleStart();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ProjectPicker value={projectId} onChange={setProject} />
          <TagPicker value={tagIds} onChange={setTags} />
          <button
            type="button"
            onClick={() => setBillable(!billable)}
            className={cn(
              "h-9 w-9 grid place-items-center rounded-md border border-input bg-card hover:bg-muted/60",
              billable && "text-success border-success/40 bg-success/5"
            )}
            title={billable ? "Billable" : "Not billable"}
          >
            <DollarSign className="size-4" />
          </button>

          <div className="hidden md:block w-px h-8 bg-border" />

          {/* Mode toggle */}
          {!running ? (
            <div className="inline-flex rounded-md border border-input p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setMode("timer")}
                className={cn(
                  "px-2 h-8 rounded text-xs font-medium",
                  mode === "timer"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Timer
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={cn(
                  "px-2 h-8 rounded text-xs font-medium",
                  mode === "manual"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Manual
              </button>
            </div>
          ) : null}

          {/* Time display + action */}
          {running ? (
            <>
              <div className="flex items-center gap-2 px-3 h-11 rounded-md border border-input bg-card">
                <span className="size-2 rounded-full bg-danger animate-pulse shrink-0" />
                {editingSince ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">since</span>
                    <input
                      type="time"
                      value={sinceTime}
                      step={60}
                      onChange={(e) => setSinceTime(e.target.value)}
                      onBlur={commitSince}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitSince();
                        if (e.key === "Escape") resetSince();
                      }}
                      autoFocus
                      className="h-8 px-1.5 rounded border border-input bg-card text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring/60"
                    />
                    <button
                      type="button"
                      onClick={commitSince}
                      className="size-7 grid place-items-center rounded-md text-success hover:bg-success/10"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={resetSince}
                      className="size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={beginEditSince}
                    className="text-xs text-muted-foreground hover:text-primary shrink-0"
                    title={`Started at ${new Date(running.startedAt).toLocaleString()}`}
                  >
                    since {formatTime(running.startedAt)}
                  </button>
                )}
                <span className="font-mono tabular-nums text-base md:text-lg font-semibold">
                  {formatDuration(elapsed)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStop}
                className="h-11 px-5 rounded-md bg-danger text-white font-semibold inline-flex items-center gap-2 hover:bg-danger/90 shadow-sm"
              >
                <Square className="size-4 fill-current" />
                Stop
              </button>
            </>
          ) : mode === "timer" ? (
            <>
              <div className="flex items-center gap-2 px-3 h-11 rounded-md border border-input bg-muted/30">
                <Clock4 className="size-4 text-muted-foreground" />
                <span className="font-mono tabular-nums text-base md:text-lg font-semibold text-muted-foreground">
                  00:00:00
                </span>
              </div>
              <button
                type="button"
                onClick={handleStart}
                className="h-11 px-5 rounded-md bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 hover:bg-primary/90 shadow-sm"
              >
                <Play className="size-4 fill-current" />
                Start
              </button>
            </>
          ) : (
            <>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="h-11 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/60"
                title="Start date"
              />
              <input
                type="time"
                value={manualStartTime}
                step={60}
                onChange={(e) => setManualStartTime(e.target.value)}
                className="h-11 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/60"
                title="Start time"
              />
              <input
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                placeholder="HH:MM:SS"
                className="h-11 px-3 w-32 text-center rounded-md border border-input bg-card font-mono tabular-nums text-base focus:outline-none focus:ring-2 focus:ring-ring/60"
                title="Duration (supports spanning past midnight, e.g. 10:00:00)"
              />
              <button
                type="button"
                onClick={handleAddManual}
                disabled={!parseDuration(manualDuration)}
                className="h-11 px-5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                Add
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
