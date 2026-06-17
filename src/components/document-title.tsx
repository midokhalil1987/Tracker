"use client";

import * as React from "react";
import { useRunningElapsed } from "@/hooks/use-running-elapsed";

const BASE_TITLE = "Tempo · Time Tracker";

/** Keeps the browser tab title in sync with the running timer. */
export function DocumentTitle() {
  const { running, formatted } = useRunningElapsed();

  React.useEffect(() => {
    document.title = running ? `${formatted} · Tempo` : BASE_TITLE;
  }, [running, formatted]);

  return null;
}
