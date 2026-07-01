"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { login } from "@/lib/auth-client";
import { useAuth } from "@/components/auth-provider";
import { useStore } from "@/lib/store";
import { syncWorkspace } from "@/lib/sync-client";
import { normalizeEmailRecipients } from "@/lib/email-recipients";

export default function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, applyServerWorkspace } = useAuth();

  const bootstrap = React.useCallback(async () => {
    await refresh();
    const applied = await applyServerWorkspace();
    if (applied.hadData) return;

    const state = useStore.getState();
    const localHasData =
      state.projects.length > 0 ||
      state.tags.length > 0 ||
      state.entries.length > 0;

    if (localHasData) {
      const { projects, tags, entries, emailReports } = state;
      await syncWorkspace(
        {
          projects,
          tags,
          entries,
          emailReportsEnabled: emailReports.enabled,
          emails: normalizeEmailRecipients(emailReports.emails),
        },
        { useSession: true }
      );
    }
  }, [refresh, applyServerWorkspace]);

  const handleSubmit = async (values: {
    identifier: string;
    password: string;
  }) => {
    const result = await login(values.identifier, values.password);
    if (!result.ok) return result.error;

    await bootstrap();

    const from = searchParams.get("from");
    router.replace(from && from.startsWith("/") ? from : "/");
    return null;
  };

  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      subtitle="Sign in to sync your time entries across devices."
      submitLabel="Sign in"
      alternateHref="/register"
      alternateLabel="No account yet?"
      onSubmit={handleSubmit}
    />
  );
}
