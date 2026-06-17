"use client";

import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: {
  id: ThemeMode;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "light",
    label: "Light",
    description: "Always use light mode.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Always use dark mode.",
    icon: Moon,
  },
  {
    id: "system",
    label: "System",
    description: "Match your device settings.",
    icon: Monitor,
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {OPTIONS.map(({ id, label, description, icon: Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={cn(
              "text-left px-4 py-3 rounded-lg border-2 transition-colors",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 bg-card"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon
                className={cn(
                  "size-4",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="font-medium text-sm">{label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </button>
        );
      })}
    </div>
  );
}
