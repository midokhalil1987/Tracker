"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Tag as TagIcon,
  Settings,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelyIcon } from "@/components/timely-icon";

const navItems = [
  { href: "/", label: "Timer", useTimelyIcon: true as const },
  { href: "/dashboard", label: "Dash", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/descriptions", label: "Log", icon: ScrollText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tags", label: "Tags", icon: TagIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex">
      {navItems.map((item) => {
        const Icon = "icon" in item ? item.icon : null;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs cursor-pointer",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {"useTimelyIcon" in item ? (
              <TimelyIcon className="size-5" />
            ) : Icon ? (
              <Icon className="size-5" />
            ) : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
