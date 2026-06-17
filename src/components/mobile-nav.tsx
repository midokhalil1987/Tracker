"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Tag as TagIcon,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TempoIcon } from "@/components/tempo-icon";

const navItems = [
  { href: "/", label: "Timer", useTempoIcon: true as const },
  { href: "/dashboard", label: "Dash", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
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
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {"useTempoIcon" in item ? (
              <TempoIcon className="size-5" />
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
