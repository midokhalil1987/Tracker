"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Tag as TagIcon,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRunningElapsed } from "@/hooks/use-running-elapsed";
import { TimelyIcon } from "@/components/timely-icon";
import { APP_NAME, APP_SUBTITLE } from "@/lib/brand";

const navItems = [
  { href: "/", label: "Timer", useTimelyIcon: true as const },
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
  const [indicator, setIndicator] = React.useState({ top: 0, height: 40 });

  const activeHref =
    navItems.find((item) => isActive(pathname, item.href))?.href ?? "/";

  const measureIndicator = React.useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const el = nav.querySelector<HTMLAnchorElement>(
      `[data-nav-href="${CSS.escape(activeHref)}"]`
    );
    if (!el) return;
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
    <aside className="hidden md:flex w-72 shrink-0 flex-col relative overflow-hidden bg-sidebar text-sidebar-foreground border-r border-white/5">
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
            running && "scale-105",
          )}
        >
          <div
            className="absolute inset-0 rounded-xl opacity-60 sidebar-logo-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
            aria-hidden
          />
          <TimelyIcon
            className="relative size-5 text-white drop-shadow-sm"
            active={!!running}
          />
          {running ? (
            <span
              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger border-2 border-sidebar sidebar-timer-badge"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-white font-semibold leading-tight tracking-tight">
            {APP_NAME}
          </span>
          <span className="text-[11px] text-sidebar-foreground/65 leading-tight flex items-center gap-1">
            <Sparkles className="size-3 text-primary/80" />
            {APP_SUBTITLE}
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
            const Icon = "icon" in item ? item.icon : null;
            const active = isActive(pathname, item.href);
            const isTimer = item.href === "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                data-nav-href={item.href}
                className={cn(
                  "sidebar-nav-item group relative flex items-center gap-3 px-3 rounded-lg text-sm cursor-pointer",
                  item.href === "/" && running ? "py-3" : "py-2.5",
                  "transition-[color,transform] duration-200 ease-out",
                  "hover:text-white hover:translate-x-0.5",
                  active
                    ? "text-white font-medium"
                    : "text-sidebar-foreground/75",
                )}
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <span
                  className={cn(
                    "grid place-items-center size-8 rounded-md transition-all duration-200",
                    active
                      ? "bg-primary/25 text-primary shadow-[0_0_16px_-4px_rgba(99,102,241,0.9)]"
                      : "bg-white/5 text-sidebar-foreground/80 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105",
                    isTimer &&
                      running &&
                      "bg-danger/20 text-danger shadow-[0_0_16px_-4px_rgba(239,68,68,0.65)]",
                  )}
                >
                  {item.useTimelyIcon ? (
                    <TimelyIcon
                      className="size-[18px]"
                      active={!!running}
                    />
                  ) : Icon ? (
                    <Icon className="size-4" />
                  ) : null}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  {item.label}
                </span>
                {item.href === "/" && running ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 shrink-0 rounded-lg",
                      "bg-danger/90 text-white border border-danger/80",
                      "px-3 py-1.5 shadow-[0_0_20px_-4px_rgba(239,68,68,0.75)]",
                      "sidebar-timer-badge",
                    )}
                  >
                    <span className="size-2.5 rounded-full bg-white animate-pulse shrink-0" />
                    <span className="font-mono tabular-nums text-base font-bold tracking-wide min-w-[8ch] text-center">
                      {formatted}
                    </span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Tracker illustration */}
      <div className="relative z-10 shrink-0 px-2 pb-3 pointer-events-none">
        <div
          className={cn(
            "relative w-full h-64 rounded-2xl overflow-hidden",
            "border border-white/12 bg-gradient-to-b from-white/[0.08] to-primary/10",
            "shadow-[0_8px_32px_-8px_rgba(99,102,241,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]",
          )}
        >
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(99,102,241,0.22),transparent_68%)]"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center p-1">
            <DotLottieReact
              src="https://lottie.host/53acd86b-8294-4474-8036-75921c5de036/ITjIe2EejZ.lottie"
              loop
              autoplay
              className="size-full min-h-[15rem] scale-[1.18] brightness-110 contrast-110 drop-shadow-[0_4px_28px_rgba(255,255,255,0.15)]"
            />
          </div>
        </div>
      </div>

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
