"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Project, Tag, TimeEntry, RunningTimer } from "./types";
import { uid } from "./utils";

const DEFAULT_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#22c55e", // green
];

export function pickDefaultColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export type ReportsPreset =
  | "today"
  | "yesterday"
  | "week"
  | "lastWeek"
  | "last2Weeks"
  | "month"
  | "30d"
  | "custom";

type ReportsFilter = {
  preset: ReportsPreset;
  /** YYYY-MM-DD; only used when preset === "custom". */
  customFrom: string;
  /** YYYY-MM-DD; only used when preset === "custom". */
  customTo: string;
  projectId: string | null;
  billableOnly: boolean;
};

type EmailReportsSettings = {
  enabled: boolean;
  email: string;
  syncSecret: string;
  lastSyncedAt: number | null;
};

const DEFAULT_EMAIL_REPORTS: EmailReportsSettings = {
  enabled: false,
  email: "midokhalil1987@gmail.com",
  syncSecret: "",
  lastSyncedAt: null,
};

type State = {
  projects: Project[];
  tags: Tag[];
  entries: TimeEntry[];
  running: RunningTimer | null;
  reportsFilter: ReportsFilter;
  emailReports: EmailReportsSettings;
  hydrated: boolean;
};

type Actions = {
  // projects
  addProject: (input: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // tags
  addTag: (name: string) => Tag;
  deleteTag: (id: string) => void;

  // entries
  addEntry: (entry: Omit<TimeEntry, "id">) => TimeEntry;
  updateEntry: (id: string, patch: Partial<TimeEntry>) => void;
  deleteEntry: (id: string) => void;
  duplicateEntry: (id: string) => void;

  // timer
  startTimer: (
    input?: Partial<Omit<RunningTimer, "startedAt" | "resumedEntry">>
  ) => void;
  continueEntry: (entryId: string) => void;
  stopTimer: () => TimeEntry | null;
  discardTimer: () => void;
  updateRunning: (patch: Partial<Omit<RunningTimer, "resumedEntry">>) => void;

  // bulk data ops
  replaceAll: (data: {
    projects: Project[];
    tags: Tag[];
    entries: TimeEntry[];
  }) => void;
  mergeImport: (data: {
    projects: Project[];
    tags: Tag[];
    entries: TimeEntry[];
  }) => { addedProjects: number; addedTags: number; addedEntries: number };

  // reports
  setReportsFilter: (patch: Partial<ReportsFilter>) => void;

  // email reports
  setEmailReports: (patch: Partial<EmailReportsSettings>) => void;
};

const DEFAULT_REPORTS_FILTER: ReportsFilter = {
  preset: "week",
  customFrom: "",
  customTo: "",
  projectId: null,
  billableOnly: false,
};

type TimeTrackerStore = State & Actions;

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "P-WEBSITE",
    name: "Website Redesign",
    client: "Acme Inc.",
    color: "#6366f1",
    billable: true,
    hourlyRate: 90,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  },
  {
    id: "P-MOBILE",
    name: "Mobile App",
    client: "Acme Inc.",
    color: "#ec4899",
    billable: true,
    hourlyRate: 120,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: "P-INTERNAL",
    name: "Internal Tools",
    color: "#10b981",
    billable: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
];

const SAMPLE_TAGS: Tag[] = [
  { id: "T-DESIGN", name: "design" },
  { id: "T-DEV", name: "development" },
  { id: "T-MEETING", name: "meeting" },
];

function makeSampleEntries(): TimeEntry[] {
  const now = new Date();
  const out: TimeEntry[] = [];
  // Build a few entries over the last 5 days.
  const samples: Array<{
    daysAgo: number;
    startHour: number;
    durationMin: number;
    description: string;
    projectId: string | null;
    tagIds: string[];
    billable: boolean;
  }> = [
    {
      daysAgo: 0,
      startHour: 9,
      durationMin: 75,
      description: "Standup & planning",
      projectId: "P-INTERNAL",
      tagIds: ["T-MEETING"],
      billable: false,
    },
    {
      daysAgo: 0,
      startHour: 11,
      durationMin: 120,
      description: "Implement timer UI",
      projectId: "P-WEBSITE",
      tagIds: ["T-DEV"],
      billable: true,
    },
    {
      daysAgo: 1,
      startHour: 10,
      durationMin: 90,
      description: "Dashboard wireframes",
      projectId: "P-WEBSITE",
      tagIds: ["T-DESIGN"],
      billable: true,
    },
    {
      daysAgo: 1,
      startHour: 14,
      durationMin: 150,
      description: "API integration",
      projectId: "P-MOBILE",
      tagIds: ["T-DEV"],
      billable: true,
    },
    {
      daysAgo: 2,
      startHour: 9,
      durationMin: 60,
      description: "Client call",
      projectId: "P-WEBSITE",
      tagIds: ["T-MEETING"],
      billable: true,
    },
    {
      daysAgo: 2,
      startHour: 13,
      durationMin: 180,
      description: "Bug fixes",
      projectId: "P-MOBILE",
      tagIds: ["T-DEV"],
      billable: true,
    },
    {
      daysAgo: 3,
      startHour: 10,
      durationMin: 240,
      description: "Component library cleanup",
      projectId: "P-INTERNAL",
      tagIds: ["T-DEV"],
      billable: false,
    },
    {
      daysAgo: 4,
      startHour: 9,
      durationMin: 90,
      description: "Sprint review",
      projectId: "P-INTERNAL",
      tagIds: ["T-MEETING"],
      billable: false,
    },
    {
      daysAgo: 4,
      startHour: 11,
      durationMin: 200,
      description: "Landing page polish",
      projectId: "P-WEBSITE",
      tagIds: ["T-DESIGN", "T-DEV"],
      billable: true,
    },
  ];
  for (const s of samples) {
    const start = new Date(now);
    start.setDate(start.getDate() - s.daysAgo);
    start.setHours(s.startHour, 0, 0, 0);
    const end = new Date(start.getTime() + s.durationMin * 60 * 1000);
    out.push({
      id: uid(),
      description: s.description,
      projectId: s.projectId,
      tagIds: s.tagIds,
      startedAt: start.getTime(),
      endedAt: end.getTime(),
      billable: s.billable,
    });
  }
  return out;
}

const initialState: State = {
  projects: SAMPLE_PROJECTS,
  tags: SAMPLE_TAGS,
  entries: makeSampleEntries(),
  running: null,
  reportsFilter: DEFAULT_REPORTS_FILTER,
  emailReports: DEFAULT_EMAIL_REPORTS,
  hydrated: false,
};

export const useStore = create<TimeTrackerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addProject: (input) => {
        const project: Project = {
          id: uid(),
          createdAt: Date.now(),
          ...input,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          entries: s.entries.map((e) =>
            e.projectId === id ? { ...e, projectId: null } : e
          ),
        })),

      addTag: (name) => {
        const existing = get().tags.find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) return existing;
        const tag: Tag = { id: uid(), name };
        set((s) => ({ tags: [...s.tags, tag] }));
        return tag;
      },
      deleteTag: (id) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          entries: s.entries.map((e) =>
            e.tagIds.includes(id)
              ? { ...e, tagIds: e.tagIds.filter((t) => t !== id) }
              : e
          ),
        })),

      addEntry: (entry) => {
        const created: TimeEntry = { id: uid(), ...entry };
        set((s) => ({ entries: [created, ...s.entries] }));
        return created;
      },
      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      duplicateEntry: (id) => {
        const e = get().entries.find((x) => x.id === id);
        if (!e) return;
        const now = Date.now();
        const duration = e.endedAt - e.startedAt;
        const copy: TimeEntry = {
          ...e,
          id: uid(),
          startedAt: now - duration,
          endedAt: now,
        };
        set((s) => ({ entries: [copy, ...s.entries] }));
      },

      startTimer: (input) => {
        const current = get().running;
        if (current) {
          // Stop current first, save it
          get().stopTimer();
        }
        set({
          running: {
            description: input?.description ?? "",
            projectId: input?.projectId ?? null,
            tagIds: input?.tagIds ?? [],
            billable: input?.billable ?? false,
            startedAt: Date.now(),
          },
        });
      },

      continueEntry: (entryId) => {
        const entry = get().entries.find((e) => e.id === entryId);
        if (!entry) return;

        const current = get().running;
        if (current) get().stopTimer();

        set((s) => ({
          entries: s.entries.filter((e) => e.id !== entryId),
          running: {
            description: entry.description,
            projectId: entry.projectId,
            tagIds: entry.tagIds,
            billable: entry.billable,
            // Keep the original start so elapsed time includes prior duration.
            startedAt: entry.startedAt,
            resumedEntry: entry,
          },
        }));
      },

      stopTimer: () => {
        const r = get().running;
        if (!r) return null;

        const entry: TimeEntry = r.resumedEntry
          ? {
              id: r.resumedEntry.id,
              description: r.description,
              projectId: r.projectId,
              tagIds: r.tagIds,
              billable: r.billable,
              startedAt: r.startedAt,
              endedAt: Date.now(),
            }
          : {
              id: uid(),
              description: r.description,
              projectId: r.projectId,
              tagIds: r.tagIds,
              billable: r.billable,
              startedAt: r.startedAt,
              endedAt: Date.now(),
            };

        set((s) => ({ entries: [entry, ...s.entries], running: null }));
        return entry;
      },

      discardTimer: () => {
        const r = get().running;
        if (!r) return;

        if (r.resumedEntry) {
          // Put the original entry back unchanged.
          set((s) => ({
            running: null,
            entries: [r.resumedEntry!, ...s.entries].sort(
              (a, b) => b.startedAt - a.startedAt
            ),
          }));
          return;
        }

        set({ running: null });
      },
      updateRunning: (patch) =>
        set((s) => (s.running ? { running: { ...s.running, ...patch } } : s)),

      replaceAll: ({ projects, tags, entries }) =>
        set(() => ({
          projects: [...projects].sort((a, b) => b.createdAt - a.createdAt),
          tags: [...tags],
          entries: [...entries].sort((a, b) => b.startedAt - a.startedAt),
          running: null,
        })),

      mergeImport: ({ projects, tags, entries }) => {
        const state = get();

        // Projects: match by ID first, else by name (case-insensitive).
        const projById = new Map(state.projects.map((p) => [p.id, p]));
        const projByName = new Map(
          state.projects.map((p) => [p.name.toLowerCase(), p])
        );
        const remappedProjectId = new Map<string, string>();
        let addedProjects = 0;
        const nextProjects = [...state.projects];
        for (const p of projects) {
          if (projById.has(p.id)) {
            remappedProjectId.set(p.id, p.id);
            continue;
          }
          const byName = projByName.get(p.name.toLowerCase());
          if (byName) {
            remappedProjectId.set(p.id, byName.id);
            continue;
          }
          nextProjects.unshift(p);
          projById.set(p.id, p);
          projByName.set(p.name.toLowerCase(), p);
          remappedProjectId.set(p.id, p.id);
          addedProjects++;
        }

        // Tags: match by ID first, else by name (case-insensitive).
        const tagById = new Map(state.tags.map((t) => [t.id, t]));
        const tagByName = new Map(
          state.tags.map((t) => [t.name.toLowerCase(), t])
        );
        const remappedTagId = new Map<string, string>();
        let addedTags = 0;
        const nextTags = [...state.tags];
        for (const t of tags) {
          if (tagById.has(t.id)) {
            remappedTagId.set(t.id, t.id);
            continue;
          }
          const byName = tagByName.get(t.name.toLowerCase());
          if (byName) {
            remappedTagId.set(t.id, byName.id);
            continue;
          }
          nextTags.push(t);
          tagById.set(t.id, t);
          tagByName.set(t.name.toLowerCase(), t);
          remappedTagId.set(t.id, t.id);
          addedTags++;
        }

        // Entries: dedupe by ID *or* by signature
        // (startedAt|endedAt|description|projectId), and remap project/tag ids.
        const existingEntryIds = new Set(state.entries.map((e) => e.id));
        const sig = (e: {
          startedAt: number;
          endedAt: number;
          description: string;
          projectId: string | null;
        }) =>
          `${e.startedAt}|${e.endedAt}|${e.description.trim().toLowerCase()}|${
            e.projectId ?? ""
          }`;
        const existingSignatures = new Set(state.entries.map(sig));
        let addedEntries = 0;
        const newEntries: TimeEntry[] = [];
        for (const e of entries) {
          if (existingEntryIds.has(e.id)) continue;
          const remapped: TimeEntry = {
            ...e,
            projectId: e.projectId
              ? remappedProjectId.get(e.projectId) ?? e.projectId
              : null,
            tagIds: e.tagIds.map((id) => remappedTagId.get(id) ?? id),
          };
          if (existingSignatures.has(sig(remapped))) continue;
          newEntries.push(remapped);
          existingSignatures.add(sig(remapped));
          addedEntries++;
        }

        set({
          projects: nextProjects,
          tags: nextTags,
          entries: [...newEntries, ...state.entries].sort(
            (a, b) => b.startedAt - a.startedAt
          ),
        });

        return { addedProjects, addedTags, addedEntries };
      },

      setReportsFilter: (patch) =>
        set((s) => ({ reportsFilter: { ...s.reportsFilter, ...patch } })),

      setEmailReports: (patch) =>
        set((s) => ({
          emailReports: { ...s.emailReports, ...patch },
        })),
    }),
    {
      name: "time-tracker-storage-v1",
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        tags: state.tags,
        entries: state.entries,
        running: state.running,
        reportsFilter: state.reportsFilter,
        emailReports: state.emailReports,
      }),
      migrate: (persisted, fromVersion) => {
        const s = (persisted ?? {}) as Partial<State>;
        if (fromVersion < 2 && s.projects) {
          // Re-seed rates for the sample projects, leave user projects untouched.
          s.projects = s.projects.map((p) => {
            if (p.hourlyRate !== undefined) return p;
            if (p.id === "P-WEBSITE") return { ...p, hourlyRate: 90 };
            if (p.id === "P-MOBILE") return { ...p, hourlyRate: 120 };
            return p;
          });
        }
        if (fromVersion < 3 && !s.reportsFilter) {
          s.reportsFilter = DEFAULT_REPORTS_FILTER;
        }
        if (fromVersion < 4 && !s.emailReports) {
          s.emailReports = DEFAULT_EMAIL_REPORTS;
        }
        if (
          fromVersion < 5 &&
          s.emailReports?.email === "mahmoudkhalil6987@gmail.com"
        ) {
          s.emailReports = {
            ...s.emailReports,
            email: "midokhalil1987@gmail.com",
          };
        }
        return s;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
