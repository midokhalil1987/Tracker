"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { register } from "@/lib/auth-client";
import { useAuth } from "@/components/auth-provider";
import { useStore } from "@/lib/store";
import { syncWorkspace } from "@/lib/sync-client";
import { normalizeEmailRecipients } from "@/lib/email-recipients";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (values: {
    email: string;
    username: string;
    password: string;
  }) => {
    const result = await register(
      values.email,
      values.username,
      values.password
    );
    if (!result.ok) return result.error;

    const registrationEmail = values.email.trim().toLowerCase();
    useStore.getState().setEmailReports({
      emails: normalizeEmailRecipients([registrationEmail], registrationEmail),
    });

    await refresh();

    const state = useStore.getState();
    const hasLocalData =
      state.projects.length > 0 ||
      state.tags.length > 0 ||
      state.entries.length > 0;

    const { projects, tags, entries, emailReports } = state;
    await syncWorkspace(
      {
        projects,
        tags,
        entries,
        emailReportsEnabled: emailReports.enabled,
        emails: normalizeEmailRecipients(
          emailReports.emails,
          registrationEmail
        ),
      },
      { useSession: true }
    );

    router.replace("/");
    return null;
  };

  return (
    <AuthForm
      mode="register"
      title="Create your account"
      subtitle="Your workspace stays private — import your own .xlsx anytime in Settings."
      submitLabel="Create account"
      alternateHref="/login"
      alternateLabel="Already have an account?"
      onSubmit={handleSubmit}
    />
  );
}
