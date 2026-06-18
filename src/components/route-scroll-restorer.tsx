"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function RouteScrollRestorer() {
  const pathname = usePathname();

  React.useEffect(() => {
    const scrollers = document.querySelectorAll<HTMLElement>(".page-scroll");
    for (const el of scrollers) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname]);

  return null;
}
