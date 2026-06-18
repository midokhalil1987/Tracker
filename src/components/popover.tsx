"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PopoverContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover components must be inside <Popover>");
  return ctx;
}

export function Popover({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : internalOpen;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!actualOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        contentRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [actualOpen, setOpen]);

  return (
    <PopoverContext.Provider
      value={{ open: actualOpen, setOpen, triggerRef, contentRef }}
    >
      <span className="inline-block">{children}</span>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const { open, setOpen, triggerRef } = usePopover();
  const child = children as React.ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    ref?: React.Ref<HTMLButtonElement>;
  }>;
  const handleClick = (e: React.MouseEvent) => {
    child.props.onClick?.(e);
    setOpen(!open);
  };
  if (asChild) {
    return React.cloneElement(child, {
      ref: triggerRef,
      onClick: handleClick,
    });
  }
  return (
    <button
      ref={triggerRef}
      onClick={handleClick}
      type="button"
      className="cursor-pointer"
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- */
/* Content (portaled, fixed-positioned, viewport-aware)              */
/* ----------------------------------------------------------------- */

const VIEWPORT_PADDING = 8;
const GAP = 4;

export function PopoverContent({
  className,
  align = "start",
  children,
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const { open, contentRef, triggerRef } = usePopover();
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const measure = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const tr = trigger.getBoundingClientRect();
    const content = contentRef.current;
    const cw = content?.offsetWidth ?? tr.width;
    const ch = content?.offsetHeight ?? 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = align === "end" ? tr.right - cw : tr.left;
    left = Math.min(
      Math.max(left, VIEWPORT_PADDING),
      vw - cw - VIEWPORT_PADDING
    );

    let top = tr.bottom + GAP;
    // If the popover would overflow the bottom edge and there's enough room
    // above the trigger, flip up.
    if (top + ch > vh - VIEWPORT_PADDING) {
      const above = tr.top - GAP - ch;
      if (above >= VIEWPORT_PADDING) top = above;
      else top = Math.max(VIEWPORT_PADDING, vh - ch - VIEWPORT_PADDING);
    }

    setPos({ top, left, minWidth: tr.width });
  }, [triggerRef, contentRef, align]);

  // Measure synchronously after the portal mounts so the popover appears in
  // the right spot on the very first paint.
  React.useLayoutEffect(() => {
    if (!open) return;
    measure();
    // Re-measure once more after first paint in case content width changed
    // (e.g. the content uses min-w with extra padding).
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [open, measure]);

  // Keep the popover anchored while scrolling or resizing.
  React.useEffect(() => {
    if (!open) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, measure]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        minWidth: pos?.minWidth,
        visibility: pos ? "visible" : "hidden",
      }}
      className={cn(
        "z-50 rounded-lg border border-border bg-card shadow-lg p-1",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
