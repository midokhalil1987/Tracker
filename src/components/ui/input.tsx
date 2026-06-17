"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 px-3 rounded-md border border-input bg-card text-sm shadow-xs",
          "placeholder:text-muted-foreground/70",
          "focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-transparent",
          "disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
