"use client";

import * as React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type AlertOptions = {
  title: string;
  description?: string;
  okLabel?: string;
};

type ConfirmRequest = ConfirmOptions & {
  kind: "confirm";
  resolve: (value: boolean) => void;
};

type AlertRequest = AlertOptions & {
  kind: "alert";
  resolve: () => void;
};

type DialogRequest = ConfirmRequest | AlertRequest;

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
};

const ConfirmDialogContext =
  React.createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [request, setRequest] = React.useState<DialogRequest | null>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ kind: "confirm", ...options, resolve });
    });
  }, []);

  const alert = React.useCallback((options: AlertOptions | string) => {
    const normalized =
      typeof options === "string" ? { title: options } : options;
    return new Promise<void>((resolve) => {
      setRequest({ kind: "alert", ...normalized, resolve });
    });
  }, []);

  const closeConfirm = React.useCallback((accepted: boolean) => {
    setRequest((current) => {
      if (current?.kind === "confirm") current.resolve(accepted);
      return null;
    });
  }, []);

  const closeAlert = React.useCallback(() => {
    setRequest((current) => {
      if (current?.kind === "alert") current.resolve();
      return null;
    });
  }, []);

  React.useEffect(() => {
    if (!request) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (request.kind === "confirm") closeConfirm(false);
        else closeAlert();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const id = window.requestAnimationFrame(() => {
      confirmButtonRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(id);
    };
  }, [request, closeConfirm, closeAlert]);

  const value = React.useMemo(
    () => ({ confirm, alert }),
    [confirm, alert]
  );

  const isDestructive =
    request?.kind === "confirm" && request.destructive === true;
  const isAlert = request?.kind === "alert";

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {request ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dialog-overlay-in"
            onClick={() =>
              request.kind === "confirm" ? closeConfirm(false) : closeAlert()
            }
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby={
              request.description ? "app-dialog-description" : undefined
            }
            className={cn(
              "relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl dialog-content-in",
            )}
          >
            <div className="p-5 sm:p-6">
              <div className="flex gap-4">
                <div
                  className={cn(
                    "size-10 shrink-0 rounded-full grid place-items-center",
                    isAlert
                      ? "bg-primary/10 text-primary"
                      : isDestructive
                        ? "bg-danger/10 text-danger"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isAlert ? (
                    <Info className="size-5" />
                  ) : (
                    <AlertTriangle className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2
                    id="app-dialog-title"
                    className="text-base font-semibold leading-snug pr-2"
                  >
                    {request.title}
                  </h2>
                  {request.description ? (
                    <p
                      id="app-dialog-description"
                      className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed"
                    >
                      {request.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {request.kind === "confirm" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => closeConfirm(false)}
                    >
                      {request.cancelLabel ?? "Cancel"}
                    </Button>
                    <Button
                      ref={confirmButtonRef}
                      type="button"
                      variant={isDestructive ? "danger" : "primary"}
                      onClick={() => closeConfirm(true)}
                    >
                      {request.confirmLabel ?? "Confirm"}
                    </Button>
                  </>
                ) : (
                  <Button
                    ref={confirmButtonRef}
                    type="button"
                    onClick={closeAlert}
                  >
                    {request.okLabel ?? "OK"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

function useConfirmDialogContext() {
  const ctx = React.useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error(
      "useConfirm/useAlert must be used within ConfirmDialogProvider"
    );
  }
  return ctx;
}

export function useConfirm() {
  return useConfirmDialogContext().confirm;
}

export function useAlert() {
  return useConfirmDialogContext().alert;
}
