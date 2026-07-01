"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { syncWorkspace } from "@/lib/sync-client";
import { useAuth } from "@/components/auth-provider";

const SYNC_DEBOUNCE_MS = 2500;

/** Pushes workspace data to the server when logged in or legacy email sync is enabled. */
export function DataSync() {
  const hydrated = useStore((s) => s.hydrated);
  const emailReports = useStore((s) => s.emailReports);
  const { user, loading: authLoading } = useAuth();

  const syncKey = useStore((s) =>
    JSON.stringify({
      projects: s.projects,
      tags: s.tags,
      entries: s.entries,
      enabled: s.emailReports.enabled,
      emails: s.emailReports.emails,
    })
  );

  const canSync =
    !authLoading &&
    (Boolean(user) ||
      (emailReports.enabled && emailReports.syncSecret.trim().length > 0));

  React.useEffect(() => {
    if (!hydrated || !canSync) return;

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
            emails: reports.emails,
          },
          user ? { useSession: true } : reports.syncSecret
        );
        if (result.ok) {
          useStore.getState().setEmailReports({ lastSyncedAt: Date.now() });
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [hydrated, syncKey, canSync, user, emailReports.syncSecret]);

  return null;
}
