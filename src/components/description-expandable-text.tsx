"use client";

import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_CLAMP = 3;

type DescriptionExpandableTextProps = {
  description: string;
  emptyLabel?: string;
  className?: string;
  textClassName?: string;
  buttonClassName?: string;
};

function getLineHeight(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight);
  if (!Number.isNaN(lineHeight)) return lineHeight;

  const fontSize = parseFloat(style.fontSize);
  return Number.isNaN(fontSize) ? 20 : fontSize * 1.625;
}

function descriptionNeedsExpand(
  description: string,
  fullHeight: number,
  collapsedHeight: number,
) {
  if (description.split("\n").length > LINE_CLAMP) return true;
  return fullHeight > collapsedHeight + 1;
}

export function DescriptionExpandableText({
  description,
  emptyLabel = "No description",
  className,
  textClassName,
  buttonClassName,
}: DescriptionExpandableTextProps) {
  const [expanded, setExpanded] = React.useState(false);
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = React.useState(false);
  const [collapsedHeight, setCollapsedHeight] = React.useState(0);
  const [fullHeight, setFullHeight] = React.useState(0);
  const animatingRef = React.useRef(false);

  const measure = React.useCallback(() => {
    if (animatingRef.current) return;

    const el = textRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper || !description) {
      setIsClamped(false);
      setCollapsedHeight(0);
      setFullHeight(0);
      return;
    }

    if (wrapper.getBoundingClientRect().width <= 0) return;

    const prevHeight = wrapper.style.height;
    wrapper.style.height = "auto";

    const full = el.scrollHeight;
    const collapsed = Math.ceil(getLineHeight(el) * LINE_CLAMP);

    wrapper.style.height = prevHeight;

    setFullHeight(full);
    setCollapsedHeight(collapsed);
    setIsClamped(descriptionNeedsExpand(description, full, collapsed));
  }, [description]);

  React.useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(id);
  }, [measure]);

  React.useEffect(() => {
    const el = textRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    ro.observe(wrapper);

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) measure();
      },
      { threshold: 0 },
    );
    io.observe(wrapper);

    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [measure]);

  const showToggle = Boolean(description && (isClamped || expanded));
  const animatedHeight =
    description && (isClamped || expanded) && collapsedHeight > 0
      ? expanded
        ? fullHeight
        : collapsedHeight
      : undefined;

  const handleToggle = () => {
    animatingRef.current = true;
    setExpanded((value) => !value);
    window.setTimeout(() => {
      animatingRef.current = false;
      measure();
    }, 300);
  };

  return (
    <div className={cn("flex items-start gap-1.5", className)}>
      <div
        ref={wrapperRef}
        className={cn(
          "overflow-hidden flex-1 min-w-0",
          animatedHeight !== undefined &&
            "transition-[height] duration-300 ease-in-out motion-reduce:transition-none",
        )}
        style={
          animatedHeight !== undefined ? { height: animatedHeight } : undefined
        }
      >
        <p
          ref={textRef}
          className={cn(
            "text-sm whitespace-pre-wrap break-words leading-relaxed",
            textClassName,
          )}
        >
          {description || (
            <span className="text-muted-foreground italic">{emptyLabel}</span>
          )}
        </p>
      </div>
      {showToggle ? (
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0 transition-colors",
            buttonClassName,
          )}
          title={expanded ? "Show less" : "Show all"}
          aria-label={expanded ? "Show less" : "Show all"}
          aria-expanded={expanded}
        >
          <span
            className={cn(
              "grid place-items-center transition-transform duration-300 ease-in-out motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          >
            {expanded ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </span>
        </button>
      ) : null}
    </div>
  );
}
