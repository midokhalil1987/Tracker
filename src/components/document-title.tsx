"use client";

import * as React from "react";
import { useRunningElapsed } from "@/hooks/use-running-elapsed";

import { APP_NAME, APP_FULL_TITLE } from "@/lib/brand";

/** Keeps the browser tab title in sync with the running timer. */
export function DocumentTitle() {
  const { running, formatted } = useRunningElapsed();

  React.useEffect(() => {
    document.title = running ? `${formatted} · ${APP_NAME}` : APP_FULL_TITLE;
  }, [running, formatted]);

  return null;
}
