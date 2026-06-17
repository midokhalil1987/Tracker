"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { formatDuration } from "@/lib/utils";

/** Live elapsed time for the currently running timer (ticks every second). */
export function useRunningElapsed() {
  const running = useStore((s) => s.running);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = running ? now - running.startedAt : 0;

  return {
    running,
    elapsed,
    formatted: formatDuration(elapsed),
  };
}
