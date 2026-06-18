"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PageScrollProps = React.ComponentProps<"div">;

export function PageScroll({ className, children, ...props }: PageScrollProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("scroll-reveal-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { root, threshold: 0.06, rootMargin: "0px 0px -32px 0px" }
    );

    const bind = () => {
      root
        .querySelectorAll("[data-scroll-reveal]:not(.scroll-reveal-visible)")
        .forEach((el) => io.observe(el));
    };

    bind();
    const mo = new MutationObserver(bind);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "page-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
