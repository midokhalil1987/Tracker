"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function FormField({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props} />
  );
}
