"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80",
  ghost: "hover:bg-muted text-foreground",
  danger: "bg-danger text-white hover:bg-danger/90",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-11 px-5 text-base rounded-lg",
  icon: "size-9 rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
