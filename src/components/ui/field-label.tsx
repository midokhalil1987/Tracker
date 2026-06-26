"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  /** Settings-style section label (uppercase, tracked). */
  section?: boolean;
};

export function FieldLabel({
  className,
  section,
  ...props
}: FieldLabelProps) {
  return (
    <label
      className={cn(
        "block text-xs font-medium text-muted-foreground",
        section && "uppercase tracking-wide",
        className
      )}
      {...props}
    />
  );
}
