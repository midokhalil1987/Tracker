"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  Timer,
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Clock,
  Tag as TagIcon,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRunningElapsed } from "@/hooks/use-running-elapsed";

const navItems = [
  { href: "/", label: "Timer", icon: Timer },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tags", label: "Tags", icon: TagIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const { running, formatted } = useRunningElapsed();
  const navRef = React.useRef<HTMLElement>(null);
  const itemRefs = React.useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = React.useState({ top: 0, height: 40 });

  const activeHref =
    navItems.find((item) => isActive(pathname, item.href))?.href ?? "/";

  const measureIndicator = React.useCallback(() => {
    const nav = navRef.current;
    const el = itemRefs.current.get(activeHref);
    if (!nav || !el) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      top: elRect.top - navRect.top,
      height: elRect.height,
    });
  }, [activeHref]);

  React.useLayoutEffect(() => {
    measureIndicator();
  }, [measureIndicator, running]);

  React.useEffect(() => {
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
  }, [measureIndicator]);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col relative overflow-hidden bg-sidebar text-sidebar-foreground border-r border-white/5">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 size-56 rounded-full bg-primary/25 blur-3xl sidebar-glow-orb"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-16 -right-20 size-48 rounded-full bg-violet-500/15 blur-3xl sidebar-glow-orb"
        style={{ animationDelay: "1.5s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_35%,rgba(0,0,0,0.18)_100%)]"
        aria-hidden
      />

      {/* Brand */}
      <div className="relative z-10 flex items-center gap-3 px-5 h-[4.25rem] border-b border-white/8">
        <div
          className={cn(
            "relative size-10 rounded-xl grid place-items-center shadow-lg transition-transform duration-500",
            "bg-gradient-to-br from-primary via-indigo-500 to-violet-600",
            running && "scale-105"
          )}
        >
          <div
            className="absolute inset-0 rounded-xl opacity-60 sidebar-logo-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
            aria-hidden
          />
          <Clock className="relative size-5 text-white drop-shadow-sm" />
          {running ? (
            <span
              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger border-2 border-sidebar sidebar-timer-badge"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-white font-semibold leading-tight tracking-tight">
            Tempo
          </span>
          <span className="text-[11px] text-sidebar-foreground/65 leading-tight flex items-center gap-1">
            <Sparkles className="size-3 text-primary/80" />
            Time Tracker
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        className="relative z-10 flex flex-1 flex-col px-3 py-4"
      >
        <div
          className="pointer-events-none absolute left-3 right-3 rounded-lg bg-white/10 border border-white/10 shadow-[0_8px_24px_-8px_rgba(99,102,241,0.55)] transition-[top,height] duration-300 ease-out"
          style={{
            top: indicator.top,
            height: indicator.height,
          }}
          aria-hidden
        />

        <div className="space-y-1">
          {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              ref={(el) => {
                if (el) itemRefs.current.set(item.href, el);
                else itemRefs.current.delete(item.href);
              }}
              href={item.href}
              className={cn(
                "sidebar-nav-item group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                "transition-[color,transform] duration-200 ease-out",
                "hover:text-white hover:translate-x-0.5",
                active
                  ? "text-white font-medium"
                  : "text-sidebar-foreground/75"
              )}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <span
                className={cn(
                  "grid place-items-center size-8 rounded-md transition-all duration-200",
                  active
                    ? "bg-primary/25 text-primary shadow-[0_0_16px_-4px_rgba(99,102,241,0.9)]"
                    : "bg-white/5 text-sidebar-foreground/80 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="flex-1 min-w-0 truncate">{item.label}</span>
              {item.href === "/" && running ? (
                <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-danger/15 border border-danger/30 px-2 py-0.5 sidebar-timer-badge">
                  <span className="size-1.5 rounded-full bg-danger animate-pulse" />
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-danger">
                    {formatted}
                  </span>
                </span>
              ) : null}
            </Link>
          );
          })}
        </div>

        <div className="mt-auto pt-6 -mx-3 pointer-events-none">
          <div className="w-full aspect-square">
            <DotLottieReact
              src="https://lottie.host/88a100b8-0205-48f2-9a85-e1118732fdfd/O8Bjf7DhMq.lottie"
              loop
              autoplay
              className="size-full"
            />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="relative z-10 px-5 py-4 border-t border-white/8">
        <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2.5">
          <p className="text-[11px] text-sidebar-foreground/55 leading-relaxed">
            v0.1.0 · stored locally
          </p>
          {running ? (
            <p className="text-[11px] text-primary/90 mt-1 font-medium animate-pulse">
              Timer running…
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
