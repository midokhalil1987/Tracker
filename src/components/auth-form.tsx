"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/email-recipients";

type LoginValues = {
  identifier: string;
  password: string;
};

type RegisterValues = {
  email: string;
  username: string;
  password: string;
};

type AuthFormProps =
  | {
      mode: "login";
      title: string;
      subtitle: string;
      submitLabel: string;
      alternateHref: string;
      alternateLabel: string;
      onSubmit: (values: LoginValues) => Promise<string | null>;
    }
  | {
      mode: "register";
      title: string;
      subtitle: string;
      submitLabel: string;
      alternateHref: string;
      alternateLabel: string;
      onSubmit: (values: RegisterValues) => Promise<string | null>;
    };

export function AuthForm(props: AuthFormProps) {
  const { mode, title, subtitle, submitLabel, alternateHref, alternateLabel } =
    props;

  const [identifier, setIdentifier] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (!isValidEmail(email)) {
        setError("Enter a valid email address.");
        return;
      }
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim())) {
        setError(
          "Username must be 3–32 characters (letters, numbers, . _ -)."
        );
        return;
      }
    }

    setBusy(true);
    try {
      const message =
        mode === "register"
          ? await props.onSubmit({
              email: email.trim().toLowerCase(),
              username: username.trim(),
              password,
            })
          : await props.onSubmit({ identifier, password });
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {mode === "register" ? (
        <>
          <FormField>
            <FieldLabel section>Email</FieldLabel>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Used for weekday <code className="text-xs">.xlsx</code> exports.
              You can add more recipients in Settings.
            </p>
          </FormField>
          <FormField>
            <FieldLabel section>Username</FieldLabel>
            <Input
              autoComplete="username"
              placeholder="jane"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9._-]{3,32}"
              disabled={busy}
            />
          </FormField>
        </>
      ) : (
        <FormField>
          <FieldLabel section>Email or username</FieldLabel>
          <Input
            autoComplete="username"
            placeholder="you@example.com or jane"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={busy}
          />
        </FormField>
      )}

      <FormField>
        <FieldLabel section>Password</FieldLabel>
        <Input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={
            mode === "register" ? "At least 8 characters" : "••••••••"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 8 : 1}
          disabled={busy}
        />
      </FormField>

      {error ? (
        <p
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className={cn("w-full shadow-[0_8px_24px_-8px_rgba(99,102,241,0.65)]")}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Please wait…
          </>
        ) : (
          submitLabel
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {alternateLabel}{" "}
        <Link
          href={alternateHref}
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
