import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "shrink-0 h-16 px-4 md:px-6 border-b border-border bg-card flex items-center justify-between gap-3",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
        {description ? (
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
