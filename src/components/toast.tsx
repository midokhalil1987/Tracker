"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ToastOptions = {
  message: string;
  undo?: () => void;
  durationMs?: number;
};

type ToastState = ToastOptions & { id: number };

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState<ToastState | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActive(null);
  }, []);

  const toast = React.useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = Date.now();
      setActive({ ...options, id });
      timerRef.current = setTimeout(
        dismiss,
        options.durationMs ?? DEFAULT_DURATION
      );
    },
    [dismiss]
  );

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleUndo = () => {
    active?.undo?.();
    dismiss();
  };

  const toastNode =
    active && mounted ? (
      <div
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[130] w-[min(100%-2rem,24rem)] dialog-content-in pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border border-border pointer-events-auto",
            "bg-card text-card-foreground shadow-lg"
          )}
        >
          <p className="flex-1 text-sm">{active.message}</p>
          {active.undo ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="shrink-0 gap-1.5"
            >
              <Undo2 className="size-3.5" />
              Undo
            </Button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    ) : null;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toastNode ? createPortal(toastNode, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
