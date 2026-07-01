"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { FormField } from "@/components/ui/form-field";
import {
  MAX_EMAIL_RECIPIENTS,
  isValidEmail,
} from "@/lib/email-recipients";
import { cn } from "@/lib/utils";

type EmailRecipientsEditorProps = {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
  label?: string;
  helper?: string;
};

export function EmailRecipientsEditor({
  emails,
  onChange,
  disabled = false,
  label = "Recipient emails",
  helper,
}: EmailRecipientsEditorProps) {
  const displaySlots = emails.length > 0 ? emails : [""];
  const canAdd = displaySlots.length < MAX_EMAIL_RECIPIENTS;

  const updateAt = (index: number, value: string) => {
    const next = [...displaySlots];
    next[index] = value;
    onChange(next.some((e) => e.trim()) ? next : []);
  };

  const removeAt = (index: number) => {
    const next = displaySlots.filter((_, i) => i !== index);
    onChange(next.filter((e) => e.trim().length > 0));
  };

  const addSlot = () => {
    if (!canAdd) return;
    onChange([...displaySlots.filter((e) => e.trim().length > 0), ""]);
  };

  return (
    <FormField>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel section>{label}</FieldLabel>
        {canAdd ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={addSlot}
            disabled={disabled}
            aria-label="Add another recipient"
            title={`Add recipient (max ${MAX_EMAIL_RECIPIENTS})`}
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {displaySlots.map((value, index) => {
          const invalid = value.trim().length > 0 && !isValidEmail(value);
          return (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="email"
                value={value}
                onChange={(e) => updateAt(index, e.target.value)}
                placeholder="you@example.com"
                disabled={disabled}
                autoComplete={index === 0 ? "email" : "off"}
                aria-invalid={invalid}
                className={cn(invalid && "border-danger focus-visible:ring-danger/40")}
              />
              {displaySlots.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-muted-foreground hover:text-danger"
                  onClick={() => removeAt(index)}
                  disabled={disabled}
                  aria-label="Remove recipient"
                >
                  <X className="size-4" />
                </Button>
              ) : (
                <span className="size-9 shrink-0" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Up to {MAX_EMAIL_RECIPIENTS} addresses receive weekday{" "}
          <code className="text-xs">.xlsx</code> exports.
        </p>
      )}
    </FormField>
  );
}
