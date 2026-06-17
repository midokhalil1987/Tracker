"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { syncWorkspace } from "@/lib/sync-client";

const SYNC_DEBOUNCE_MS = 2500;

/** Pushes workspace data to the server when weekday email reports are enabled. */
export function DataSync() {
  const hydrated = useStore((s) => s.hydrated);
  const emailReports = useStore((s) => s.emailReports);

  const syncKey = useStore((s) =>
    JSON.stringify({
      projects: s.projects,
      tags: s.tags,
      entries: s.entries,
      enabled: s.emailReports.enabled,
      email: s.emailReports.email,
    })
  );

  React.useEffect(() => {
    if (!hydrated || !emailReports.enabled || !emailReports.syncSecret.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      const { projects, tags, entries, emailReports: reports } =
        useStore.getState();

      void (async () => {
        const result = await syncWorkspace(
          {
            projects,
            tags,
            entries,
            emailReportsEnabled: reports.enabled,
            email: reports.email,
          },
          reports.syncSecret
        );
        if (result.ok) {
          useStore.getState().setEmailReports({ lastSyncedAt: Date.now() });
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [hydrated, syncKey, emailReports.enabled, emailReports.syncSecret]);

  return null;
}
