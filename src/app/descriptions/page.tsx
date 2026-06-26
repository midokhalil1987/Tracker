"use client";

import * as React from "react";
import { format, startOfDay, startOfMonth } from "date-fns";
import {
  LayoutGrid,
  Table2,
  Search,
  Copy,
  Check,
  FileText,
  Clock,
  Hash,
} from "lucide-react";
import { useStore, type ReportsPreset } from "@/lib/store";
import { periodLabel, resolveDateRange } from "@/lib/date-range-presets";
import { PageHeader } from "@/components/page-header";
import { PageScroll } from "@/components/page-scroll";
import { ScrollReveal } from "@/components/scroll-reveal";
import { DescriptionExpandableText } from "@/components/description-expandable-text";
import { DateRangeFilterCard } from "@/components/date-range-filter-card";
import { DescriptionsExportMenu } from "@/components/descriptions-export-menu";
import { ProjectPicker } from "@/components/project-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cn,
  computeEarnings,
  formatDuration,
  formatTime,
  fromDateInputValue,
  toDateInputValue,
  toDecimalHours,
} from "@/lib/utils";
import type { Project, TimeEntry } from "@/lib/types";
import {
  AccentGroupHeader,
  AccentGroupCollapsibleBody,
  AccentGroupSection,
  WeekGroupSection,
} from "@/components/week-group-section";
import {
  assignDistinctGroupColors,
  getWeekCardAccentStyles,
  groupEntriesByDay,
  groupEntriesByWeek,
  isRecentWeek,
} from "@/lib/week-groups";
import type { DescriptionExportRow } from "@/lib/descriptions-export-fields";

type ViewMode = "cards" | "table";
type SortKey = "newest" | "oldest" | "duration" | "project";
type GroupKey = "none" | "project" | "week";

function entryMs(e: TimeEntry) {
  return e.endedAt - e.startedAt;
}

export default function DescriptionsPage() {
  const entries = useStore((s) => s.entries);
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const hydrated = useStore((s) => s.hydrated);

  const [preset, setPreset] = React.useState<ReportsPreset>("month");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState<string | null>(
    null,
  );
  const [billableOnly, setBillableOnly] = React.useState(false);
  const [hideEmpty, setHideEmpty] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [groupBy, setGroupBy] = React.useState<GroupKey>("none");
  const [view, setView] = React.useState<ViewMode>("cards");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [weekCollapseOverrides, setWeekCollapseOverrides] = React.useState<
    Map<number, boolean>
  >(() => new Map());

  const resolvedCustomFrom =
    customFrom || toDateInputValue(startOfMonth(new Date()));
  const resolvedCustomTo = customTo || toDateInputValue(new Date());

  const range = React.useMemo(
    () =>
      resolveDateRange(
        preset,
        resolvedCustomFrom,
        resolvedCustomTo,
        fromDateInputValue,
      ),
    [preset, resolvedCustomFrom, resolvedCustomTo],
  );

  const tagMap = React.useMemo(
    () => new Map(tags.map((t) => [t.id, t.name])),
    [tags],
  );

  const filtered = React.useMemo(() => {
    const rangeStart = range.start.getTime();
    const rangeEnd = range.end.getTime();
    const q = search.trim().toLowerCase();

    return entries.filter((e) => {
      if (e.startedAt < rangeStart || e.startedAt > rangeEnd) return false;
      if (projectFilter && e.projectId !== projectFilter) return false;
      if (billableOnly && !e.billable) return false;
      if (hideEmpty && !e.description.trim()) return false;
      if (q) {
        const p = projects.find((x) => x.id === e.projectId);
        const tagNames = e.tagIds
          .map((id) => tagMap.get(id) ?? "")
          .join(" ");
        const haystack = [
          e.description,
          p?.name ?? "",
          p?.client ?? "",
          tagNames,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    entries,
    range,
    projectFilter,
    billableOnly,
    hideEmpty,
    search,
    projects,
    tagMap,
  ]);

  const sorted = React.useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.startedAt - b.startedAt;
        case "duration":
          return entryMs(b) - entryMs(a);
        case "project": {
          const pa =
            projects.find((p) => p.id === a.projectId)?.name ?? "";
          const pb =
            projects.find((p) => p.id === b.projectId)?.name ?? "";
          return pa.localeCompare(pb) || b.startedAt - a.startedAt;
        }
        case "newest":
        default:
          return b.startedAt - a.startedAt;
      }
    });
    return list;
  }, [filtered, sort, projects]);

  const weekGroups = React.useMemo(
    () => groupEntriesByWeek(sorted),
    [sorted],
  );

  const dayColorMap = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const group of groupEntriesByDay(sorted)) {
      map.set(group.dayStart, group.accentColor);
    }
    return map;
  }, [sorted]);

  const cardGroups = React.useMemo(
    () =>
      groupBy === "none" ? [] : buildGroups(sorted, groupBy, projects),
    [sorted, groupBy, projects],
  );

  const isWeekCollapsed = React.useCallback(
    (weekStart: number) => {
      const override = weekCollapseOverrides.get(weekStart);
      if (override !== undefined) return override;
      return !isRecentWeek(weekStart);
    },
    [weekCollapseOverrides],
  );

  const toggleWeek = (weekStart: number) => {
    setWeekCollapseOverrides((prev) => {
      const next = new Map(prev);
      const current = prev.get(weekStart) ?? !isRecentWeek(weekStart);
      next.set(weekStart, !current);
      return next;
    });
  };

  const totalMs = sorted.reduce((acc, e) => acc + entryMs(e), 0);
  const uniqueDescriptions = React.useMemo(
    () =>
      new Set(
        sorted
          .map((e) => e.description.trim().toLowerCase())
          .filter(Boolean),
      ).size,
    [sorted],
  );

  const exportRows = React.useMemo((): DescriptionExportRow[] => {
    return sorted.map((e) => {
      const p = projects.find((x) => x.id === e.projectId);
      const ms = entryMs(e);
      const hours = toDecimalHours(ms);
      const rate = p?.hourlyRate ?? 0;
      const earned =
        e.billable && rate > 0 && p ? computeEarnings([e], [p]) : 0;
      return {
        description: e.description,
        projectName: p?.name ?? "",
        client: p?.client ?? "",
        tags: e.tagIds
          .map((id) => tagMap.get(id) ?? "")
          .filter(Boolean)
          .join(", "),
        date: format(new Date(e.startedAt), "yyyy-MM-dd"),
        dateLabel: format(new Date(e.startedAt), "EEEE, MMM d, yyyy"),
        startTime: formatTime(e.startedAt),
        endTime: formatTime(e.endedAt),
        duration: formatDuration(ms),
        durationHours: hours,
        billable: e.billable,
        earned,
      };
    });
  }, [sorted, projects, tagMap]);

  const exportMeta = React.useMemo(
    () => ({
      periodLabel: periodLabel(preset),
      dateFrom: format(range.start, "MMM d, yyyy"),
      dateTo: format(range.end, "MMM d, yyyy"),
    }),
    [preset, range],
  );

  const copyDescription = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!hydrated) {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <PageHeader title="Work Log" />
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <PageHeader
        title="Work Log"
        description="Browse, search, and export your time entry descriptions."
        actions={
          <DescriptionsExportMenu
            rows={exportRows}
            meta={exportMeta}
            dateFrom={format(range.start, "yyyy-MM-dd")}
            dateTo={format(range.end, "yyyy-MM-dd")}
            disabled={sorted.length === 0}
          />
        }
      />
      <div className="shrink-0 space-y-5 px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-5 border-b border-border bg-background">
        <DateRangeFilterCard
          preset={preset}
          customFrom={resolvedCustomFrom}
          customTo={resolvedCustomTo}
          range={range}
          onPresetChange={setPreset}
          onCustomRangeChange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
          }}
          extra={
            <>
              <ProjectPicker
                value={projectFilter}
                onChange={setProjectFilter}
              />
              <label className="inline-flex items-center gap-2 text-sm h-9 px-3 rounded-md border border-input bg-card cursor-pointer">
                <input
                  type="checkbox"
                  checked={billableOnly}
                  onChange={(e) => setBillableOnly(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Billable only
              </label>
              <label className="inline-flex items-center gap-2 text-sm h-9 px-3 rounded-md border border-input bg-card cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => setHideEmpty(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Hide empty
              </label>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="size-4" />
                <p className="text-sm">Entries</p>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {sorted.length}
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="size-4" />
                <p className="text-sm">Total time</p>
              </div>
              <p className="text-2xl font-semibold font-mono tabular-nums">
                {formatDuration(totalMs)}
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Hash className="size-4" />
                <p className="text-sm">Unique descriptions</p>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {uniqueDescriptions}
              </p>
            </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search descriptions, projects, tags…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-9 px-3 rounded-md border border-input bg-card text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/60"
                aria-label="Sort by"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="duration">Longest duration</option>
                <option value="project">Project A–Z</option>
              </select>
              {view === "cards" ? (
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupKey)}
                  className="h-9 px-3 rounded-md border border-input bg-card text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/60"
                  aria-label="Group by"
                >
                  <option value="none">No grouping</option>
                  <option value="project">Group by project</option>
                  <option value="week">Group by week</option>
                </select>
              ) : null}
              <div className="inline-flex rounded-md border border-input p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={cn(
                    "size-8 grid place-items-center rounded cursor-pointer",
                    view === "cards"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Card view"
                  aria-label="Card view"
                  aria-pressed={view === "cards"}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={cn(
                    "size-8 grid place-items-center rounded cursor-pointer",
                    view === "table"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Table view"
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                >
                  <Table2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
      </div>

      <PageScroll className="px-4 md:px-6 py-4 md:py-5">
        <ScrollReveal>
          {sorted.length === 0 ? (
            <Card className="p-10 text-center">
              <FileText className="size-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No descriptions match your filters for this period.
              </p>
            </Card>
          ) : view === "table" ? (
            <Card className="overflow-hidden">
              <DescriptionWeekGroupedTable
                weekGroups={weekGroups}
                projects={projects}
                tagMap={tagMap}
                copiedId={copiedId}
                onCopy={copyDescription}
                isWeekCollapsed={isWeekCollapsed}
                onToggleWeek={toggleWeek}
              />
            </Card>
          ) : groupBy === "none" ? (
            <div className="columns-1 gap-4 lg:columns-3 lg:gap-4">
              {sorted.map((e) => (
                <div key={e.id} className="mb-4 break-inside-avoid">
                  <DescriptionEntryCard
                    entry={e}
                    project={projects.find((x) => x.id === e.projectId)}
                    tagMap={tagMap}
                    copiedId={copiedId}
                    onCopy={copyDescription}
                    accentColor={dayColorMap.get(
                      startOfDay(new Date(e.startedAt)).getTime(),
                    )}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {cardGroups.map((group) => {
                const cards = (
                  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 p-4 md:p-5">
                    {group.items.map((e) => (
                      <DescriptionEntryCard
                        key={e.id}
                        entry={e}
                        project={projects.find(
                          (x) => x.id === e.projectId,
                        )}
                        tagMap={tagMap}
                        copiedId={copiedId}
                        onCopy={copyDescription}
                      />
                    ))}
                  </div>
                );

                if (group.accentColor && group.label) {
                  if (group.weekStart !== undefined) {
                    return (
                      <WeekGroupSection
                        key={group.key}
                        weekStart={group.weekStart}
                        label={group.label}
                        accentColor={group.accentColor}
                        entryCount={group.items.length}
                      >
                        {cards}
                      </WeekGroupSection>
                    );
                  }

                  return (
                    <AccentGroupSection
                      key={group.key}
                      label={group.label}
                      accentColor={group.accentColor}
                      entryCount={group.items.length}
                    >
                      {cards}
                    </AccentGroupSection>
                  );
                }

                return (
                  <div key={group.key}>
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                      {group.items.map((e) => (
                        <DescriptionEntryCard
                          key={e.id}
                          entry={e}
                          project={projects.find(
                            (x) => x.id === e.projectId,
                          )}
                          tagMap={tagMap}
                          copiedId={copiedId}
                          onCopy={copyDescription}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollReveal>
      </PageScroll>
    </div>
  );
}

function buildGroups(
  items: TimeEntry[],
  groupBy: GroupKey,
  projects: Project[],
): Array<{
  key: string;
  label: string;
  items: TimeEntry[];
  weekStart?: number;
  dayStart?: number;
  accentColor?: string;
}> {
  if (groupBy === "week") {
    return groupEntriesByWeek(items).map((g) => ({
      key: String(g.weekStart),
      label: g.label,
      items: g.items,
      weekStart: g.weekStart,
      accentColor: g.accentColor,
    }));
  }

  const map = new Map<string, { label: string; items: TimeEntry[] }>();

  for (const e of items) {
    const p = projects.find((x) => x.id === e.projectId);
    const key = e.projectId ?? "none";
    const label = p
      ? `${p.name}${p.client ? ` · ${p.client}` : ""}`
      : "No project";
    const cur = map.get(key) ?? { label, items: [] };
    cur.items.push(e);
    map.set(key, cur);
  }

  const keys = Array.from(map.keys());
  const colorMap = assignDistinctGroupColors(keys);

  return Array.from(map.entries())
    .sort((a, b) => a[1].label.localeCompare(b[1].label))
    .map(([key, { label, items: groupItems }]) => ({
      key,
      label,
      items: groupItems.sort((a, b) => b.startedAt - a.startedAt),
      weekStart: undefined,
      accentColor: colorMap.get(key),
    }));
}

function DescriptionEntryCard({
  entry,
  project,
  tagMap,
  copiedId,
  onCopy,
  accentColor,
}: {
  entry: TimeEntry;
  project?: Project;
  tagMap: Map<string, string>;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  accentColor?: string;
}) {
  const ms = entryMs(entry);
  const entryTags = entry.tagIds
    .map((id) => tagMap.get(id))
    .filter(Boolean);
  const accentStyles = accentColor
    ? getWeekCardAccentStyles(accentColor)
    : null;

  return (
    <Card
      className={cn(
        "p-5 flex flex-col gap-3 shadow-sm hover:shadow-sm transition-shadow group",
        accentColor && "overflow-hidden",
      )}
      style={accentStyles ?? undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ background: project?.color ?? "#cbd5e1" }}
          />
          <span className="text-sm font-medium truncate">
            {project?.name ?? "No project"}
          </span>
        </div>
        {entry.description.trim() ? (
          <button
            type="button"
            onClick={() => void onCopy(entry.id, entry.description)}
            className="size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy description"
          >
            {copiedId === entry.id ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>
      <DescriptionExpandableText description={entry.description.trim()} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
        <span>
          {format(new Date(entry.startedAt), "EEEE, MMM d, yyyy")}
        </span>
        <span>·</span>
        <span className="font-mono tabular-nums">
          {formatDuration(ms)}
        </span>
        {entry.billable ? (
          <>
            <span>·</span>
            <span className="text-success">Billable</span>
          </>
        ) : null}
      </div>
      {entryTags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {entryTags.map((name) => (
            <span
              key={name}
              className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]"
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function DescriptionWeekGroupedTable({
  weekGroups,
  projects,
  tagMap,
  copiedId,
  onCopy,
  isWeekCollapsed,
  onToggleWeek,
}: {
  weekGroups: ReturnType<typeof groupEntriesByWeek>;
  projects: Project[];
  tagMap: Map<string, string>;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  isWeekCollapsed: (weekStart: number) => boolean;
  onToggleWeek: (weekStart: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-12 px-5 py-2.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
          <div className="col-span-5">Description</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {weekGroups.map((group) => {
          const collapsed = isWeekCollapsed(group.weekStart);
          return (
            <div key={group.weekStart}>
              <AccentGroupHeader
                label={group.label}
                accentColor={group.accentColor}
                entryCount={group.items.length}
                collapsed={collapsed}
                onToggle={() => onToggleWeek(group.weekStart)}
              />
              <AccentGroupCollapsibleBody collapsed={collapsed}>
                {group.items.map((e) => (
                  <DescriptionEntryTableRow
                    key={e.id}
                    entry={e}
                    project={projects.find((x) => x.id === e.projectId)}
                    tagMap={tagMap}
                    copiedId={copiedId}
                    onCopy={onCopy}
                  />
                ))}
              </AccentGroupCollapsibleBody>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DescriptionEntryTableRow({
  entry,
  project,
  tagMap,
  copiedId,
  onCopy,
}: {
  entry: TimeEntry;
  project?: Project;
  tagMap: Map<string, string>;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  const ms = entryMs(entry);
  const description = entry.description.trim();

  return (
    <div className="grid grid-cols-12 px-5 py-3 items-start gap-2 border-b border-border last:border-0 hover:bg-muted/40 group">
      <div className="col-span-5 min-w-0">
        <DescriptionExpandableText description={description} />
        {entry.tagIds.length > 0 ? (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {entry.tagIds
              .map((id) => tagMap.get(id))
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
      </div>
      <div className="col-span-2 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ background: project?.color ?? "#cbd5e1" }}
          />
          <span className="text-sm truncate">{project?.name ?? "—"}</span>
        </div>
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        {format(new Date(entry.startedAt), "EEEE, MMM d")}
        <br />
        <span className="text-xs">
          {formatTime(entry.startedAt)} – {formatTime(entry.endedAt)}
        </span>
      </div>
      <div className="col-span-2 font-mono tabular-nums text-sm">
        {formatDuration(ms)}
        {entry.billable ? (
          <span className="ml-1.5 text-xs text-success">$</span>
        ) : null}
      </div>
      <div className="col-span-1 flex justify-end">
        {entry.description.trim() ? (
          <button
            type="button"
            onClick={() => void onCopy(entry.id, entry.description)}
            className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy description"
          >
            {copiedId === entry.id ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
