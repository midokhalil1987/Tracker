"use client";

import * as React from "react";
import type { PublicUser } from "@/lib/auth/types";
import {
  fetchCurrentUser,
  fetchWorkspace,
  logout as logoutRequest,
} from "@/lib/auth-client";
import { useStore } from "@/lib/store";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  applyServerWorkspace: () => Promise<{
    ok: boolean;
    hadData: boolean;
    error?: string;
  }>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const hydrated = useStore((s) => s.hydrated);

  const refresh = React.useCallback(async () => {
    const next = await fetchCurrentUser();
    setUser(next);
  }, []);

  const applyServerWorkspace = React.useCallback(async () => {
    const result = await fetchWorkspace();
    if (!result.ok) {
      return { ok: false, hadData: false, error: result.error };
    }

    const { workspace } = result;
    const hadData =
      workspace.projects.length > 0 ||
      workspace.tags.length > 0 ||
      workspace.entries.length > 0;

    if (hadData) {
      useStore.getState().replaceAll({
        projects: workspace.projects,
        tags: workspace.tags,
        entries: workspace.entries,
      });
    }

    if (workspace.emails.length > 0) {
      useStore.getState().setEmailReports({
        emails: workspace.emails,
        enabled: workspace.emailReportsEnabled,
      });
    }

    return { ok: true, hadData };
  }, []);

  const logout = React.useCallback(async () => {
    await logoutRequest();
    setUser(null);
    window.location.href = "/login";
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrated, refresh]);

  const value = React.useMemo(
    () => ({ user, loading, refresh, logout, applyServerWorkspace }),
    [user, loading, refresh, logout, applyServerWorkspace]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
