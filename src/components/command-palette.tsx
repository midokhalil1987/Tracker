"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Tag as TagIcon,
  Settings,
  ScrollText,
  Play,
  Square,
  Search,
  Keyboard,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { TimelyIcon } from "@/components/timely-icon";
import { APP_NAME } from "@/lib/brand";

type CommandItem = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  icon: React.ReactNode;
  action: () => void;
};

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openShortcuts: () => void;
};

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null);

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const running = useStore((s) => s.running);
  const projects = useStore((s) => s.projects);
  const entries = useStore((s) => s.entries);
  const startTimer = useStore((s) => s.startTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const lastTimerContext = useStore((s) => s.lastTimerContext);

  const recentProjects = React.useMemo(() => {
    const seen = new Set<string>();
    const out: typeof projects = [];
    for (const e of entries) {
      if (!e.projectId || seen.has(e.projectId)) continue;
      const p = projects.find((x) => x.id === e.projectId);
      if (!p) continue;
      seen.add(e.projectId);
      out.push(p);
      if (out.length >= 5) break;
    }
    return out;
  }, [entries, projects]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      if (pathname !== href) router.push(href);
    },
    [pathname, router]
  );

  const items = React.useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      {
        id: "nav-timer",
        label: "Timer",
        group: "Go to",
        keywords: "home track start",
        icon: <TimelyIcon className="size-4" />,
        action: () => go("/"),
      },
      {
        id: "nav-dashboard",
        label: "Dashboard",
        group: "Go to",
        keywords: "stats overview week",
        icon: <LayoutDashboard className="size-4" />,
        action: () => go("/dashboard"),
      },
      {
        id: "nav-reports",
        label: "Reports",
        group: "Go to",
        keywords: "export csv billable",
        icon: <BarChart3 className="size-4" />,
        action: () => go("/reports"),
      },
      {
        id: "nav-descriptions",
        label: "Work Log",
        group: "Go to",
        keywords: "descriptions export markdown work log notes",
        icon: <ScrollText className="size-4" />,
        action: () => go("/descriptions"),
      },
      {
        id: "nav-projects",
        label: "Projects",
        group: "Go to",
        keywords: "clients rates",
        icon: <FolderKanban className="size-4" />,
        action: () => go("/projects"),
      },
      {
        id: "nav-tags",
        label: "Tags",
        group: "Go to",
        icon: <TagIcon className="size-4" />,
        action: () => go("/tags"),
      },
      {
        id: "nav-settings",
        label: "Settings",
        group: "Go to",
        keywords: "backup export import goals",
        icon: <Settings className="size-4" />,
        action: () => go("/settings"),
      },
    ];

    const timer: CommandItem[] = running
      ? [
          {
            id: "stop-timer",
            label: "Stop timer",
            group: "Timer",
            keywords: "end save",
            icon: <Square className="size-4" />,
            action: () => {
              stopTimer();
              setOpen(false);
              setQuery("");
            },
          },
        ]
      : [
          {
            id: "start-timer",
            label: "Start timer",
            group: "Timer",
            keywords: "play track",
            icon: <Play className="size-4" />,
            action: () => {
              go("/");
              if (lastTimerContext) {
                startTimer(lastTimerContext);
              } else {
                startTimer();
              }
              setOpen(false);
              setQuery("");
            },
          },
        ];

    if (!running && lastTimerContext) {
      const p = projects.find((x) => x.id === lastTimerContext.projectId);
      timer.unshift({
        id: "resume-last",
        label: p
          ? `Resume — ${p.name}`
          : `Resume — ${lastTimerContext.description || "last session"}`,
        group: "Timer",
        keywords: "continue last project",
        icon: <Play className="size-4" />,
        action: () => {
          go("/");
          startTimer(lastTimerContext);
          setOpen(false);
          setQuery("");
        },
      });
    }

    const recent: CommandItem[] = recentProjects.map((p) => ({
      id: `project-${p.id}`,
      label: `Start timer — ${p.name}`,
      group: "Recent projects",
      keywords: p.client ?? "",
      icon: (
        <span
          className="size-2.5 rounded-full shrink-0"
          style={{ background: p.color }}
        />
      ),
      action: () => {
        go("/");
        startTimer({
          projectId: p.id,
          billable: p.billable,
          description: "",
          tagIds: [],
        });
        setOpen(false);
        setQuery("");
      },
    }));

    return [...timer, ...recent, ...nav];
  }, [
    go,
    lastTimerContext,
    projects,
    recentProjects,
    running,
    startTimer,
    stopTimer,
  ]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.keywords?.toLowerCase().includes(q) ?? false)
    );
  }, [items, query]);

  const groups = React.useMemo(() => {
    const m = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const arr = m.get(item.group) ?? [];
      arr.push(item);
      m.set(item.group, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const flatFiltered = React.useMemo(
    () => groups.flatMap(([, g]) => g),
    [groups]
  );

  React.useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShortcutsOpen(false);
        setOpen((v) => !v);
        return;
      }

      if (e.key === "?" && !mod && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(false);
        setShortcutsOpen(true);
        return;
      }

      if (!open) {
        if (
          e.key.toLowerCase() === "s" &&
          !mod &&
          !e.altKey &&
          !isTypingTarget(e.target)
        ) {
          e.preventDefault();
          if (running) stopTimer();
          else {
            if (pathname !== "/") router.push("/");
            startTimer(lastTimerContext ?? undefined);
          }
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQuery("");
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, flatFiltered.length - 1)));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }

      if (e.key === "Enter" && flatFiltered[highlight]) {
        e.preventDefault();
        flatFiltered[highlight].action();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    flatFiltered,
    highlight,
    lastTimerContext,
    open,
    pathname,
    router,
    running,
    startTimer,
    stopTimer,
  ]);

  const ctx = React.useMemo(
    () => ({
      open,
      setOpen,
      openShortcuts: () => setShortcutsOpen(true),
    }),
    [open]
  );

  let flatIndex = -1;

  return (
    <CommandPaletteContext.Provider value={ctx}>
      {children}

      {open ? (
        <div className="fixed inset-0 z-[105] flex items-start justify-center pt-[12vh] px-4">
          <button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dialog-overlay-in cursor-pointer"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden dialog-content-in"
          >
            <div className="flex items-center gap-2 px-3 border-b border-border">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${APP_NAME}…`}
                className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 cursor-text"
              />
              <kbd className="hidden sm:inline text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">
                esc
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin p-2">
              {flatFiltered.length === 0 ? (
                <p className="px-3 py-6 text-sm text-center text-muted-foreground">
                  No matches
                </p>
              ) : (
                groups.map(([group, groupItems]) => (
                  <div key={group} className="mb-1">
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </p>
                    {groupItems.map((item) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      const active = idx === highlight;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          onMouseEnter={() => setHighlight(idx)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors",
                            active ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                          )}
                        >
                          <span className="text-muted-foreground">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex gap-3">
              <span>
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="font-mono">↵</kbd> run
              </span>
              <span>
                <kbd className="font-mono">?</kbd> shortcuts
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {shortcutsOpen ? (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close shortcuts"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dialog-overlay-in cursor-pointer"
            onClick={() => setShortcutsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-5 dialog-content-in"
          >
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="size-5 text-primary" />
              <h2 id="shortcuts-title" className="text-base font-semibold">
                Keyboard shortcuts
              </h2>
            </div>
            <dl className="space-y-2 text-sm">
              <ShortcutRow keys={["⌘", "K"]} label="Command palette" />
              <ShortcutRow keys={["S"]} label="Start / stop timer" />
              <ShortcutRow keys={["?"]} label="This help" />
              <ShortcutRow keys={["Enter"]} label="Start timer (description focused)" />
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Shortcuts are disabled while typing in a field.
            </p>
          </div>
        </div>
      ) : null}
    </CommandPaletteContext.Provider>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex gap-1 shrink-0">
        {keys.map((k) => (
          <kbd
            key={k}
            className="min-w-[1.75rem] text-center text-xs font-mono border border-border rounded px-1.5 py-0.5 bg-muted"
          >
            {k}
          </kbd>
        ))}
      </dd>
    </div>
  );
}

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}

/** Hint button for the timer bar / sidebar. */
export function CommandPaletteHint() {
  const { setOpen } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="hidden sm:inline-flex items-center gap-1.5 h-11 px-2.5 rounded-md border border-input bg-muted/40 text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
    >
      <Search className="size-3.5" />
      <span>Search</span>
      <kbd className="font-mono text-[10px] border border-border rounded px-1 bg-card">
        ⌘K
      </kbd>
    </button>
  );
}
