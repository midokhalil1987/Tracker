"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatWeekRangeLabel,
  getWeekSectionStyles,
  weekAccentColor,
  withColorAlpha,
} from "@/lib/week-groups";

type AccentGroupHeaderProps = {
  label: string;
  accentColor: string;
  entryCount?: number;
  trailing?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
};

export function AccentGroupHeader({
  label,
  accentColor,
  entryCount,
  trailing,
  collapsed = false,
  onToggle,
  className,
}: AccentGroupHeaderProps) {
  const styles = getWeekSectionStyles(accentColor);
  const interactive = Boolean(onToggle);

  const content = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "size-2 rounded-full shrink-0 transition-transform duration-300",
            collapsed && "scale-90"
          )}
          style={styles.dot}
        />
        {interactive ? (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-300 ease-out",
              collapsed && "-rotate-90"
            )}
            style={{ color: accentColor }}
          />
        ) : null}
        <span className="text-sm font-semibold truncate">{label}</span>
        {entryCount !== undefined ? (
          <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
            · {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </span>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          {trailing}
        </div>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 md:px-5 h-12 cursor-pointer",
          "hover:brightness-[1.03] transition-all text-left",
          className
        )}
        style={{
          ...styles.header,
          borderBottom: collapsed
            ? "1px solid transparent"
            : styles.header.borderBottom,
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 md:px-5 py-3",
        className
      )}
      style={styles.header}
    >
      {content}
    </div>
  );
}

type AccentGroupCollapsibleBodyProps = {
  collapsed: boolean;
  children: React.ReactNode;
  className?: string;
};

export function AccentGroupCollapsibleBody({
  collapsed,
  children,
  className,
}: AccentGroupCollapsibleBodyProps) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
        collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className="overflow-hidden min-h-0">
        <div
          className={cn(
            "transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none",
            collapsed
              ? "opacity-0 -translate-y-1"
              : "opacity-100 translate-y-0",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type AccentGroupSectionProps = {
  label: string;
  accentColor: string;
  entryCount?: number;
  headerTrailing?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function AccentGroupSection({
  label,
  accentColor,
  entryCount,
  headerTrailing,
  collapsed,
  onToggle,
  children,
  className,
  bodyClassName,
}: AccentGroupSectionProps) {
  const styles = getWeekSectionStyles(accentColor);
  const collapsible = onToggle !== undefined && collapsed !== undefined;

  return (
    <section
      className={cn("bg-card rounded-xl overflow-hidden", className)}
      style={styles.section}
    >
      <AccentGroupHeader
        label={label}
        accentColor={accentColor}
        entryCount={entryCount}
        trailing={headerTrailing}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {collapsible ? (
        <AccentGroupCollapsibleBody
          collapsed={collapsed!}
          className={bodyClassName}
        >
          {children}
        </AccentGroupCollapsibleBody>
      ) : (
        <div className={bodyClassName}>{children}</div>
      )}
    </section>
  );
}

type WeekGroupSectionProps = Omit<AccentGroupSectionProps, "label"> & {
  weekStart: number;
  label?: string;
};

export function WeekGroupSection({
  weekStart,
  label,
  accentColor = weekAccentColor(weekStart),
  ...props
}: WeekGroupSectionProps) {
  return (
    <AccentGroupSection
      label={label ?? formatWeekRangeLabel(weekStart)}
      accentColor={accentColor}
      {...props}
    />
  );
}

export { withColorAlpha };
