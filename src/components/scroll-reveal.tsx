"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ScrollRevealProps = React.ComponentProps<"div"> & {
  delay?: number;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  style,
  ...props
}: ScrollRevealProps) {
  return (
    <div
      data-scroll-reveal
      className={cn("scroll-reveal", className)}
      style={
        {
          ...style,
          "--reveal-delay": `${delay}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}

type ScrollRevealGroupProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
};

export function ScrollRevealGroup({
  children,
  className,
  stagger = 60,
}: ScrollRevealGroupProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) =>
        child != null && child !== false ? (
          <ScrollReveal key={index} delay={index * stagger}>
            {child}
          </ScrollReveal>
        ) : null
      )}
    </div>
  );
}
