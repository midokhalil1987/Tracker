"use client";

import * as React from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "timely-reports-earnings-visible";

type EarningsSummaryCardProps = {
  earnings: number;
  label?: string;
  subtitle?: string;
  className?: string;
};

export function EarningsSummaryCard({
  earnings,
  label = "Earnings",
  subtitle = "billable × project rate",
  className,
}: EarningsSummaryCardProps) {
  const [visible, setVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      /* ignore */
    }
  }, []);

  const formatted = formatCurrency(earnings);
  const copyValue = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(earnings);

  const toggleVisible = () => {
    setVisible((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className={className}>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            {visible ? (
              <button
                type="button"
                onClick={() => void handleCopy()}
                title={copied ? "Copied" : "Copy earnings"}
                aria-label={copied ? "Copied" : "Copy earnings"}
                className={cn(
                  "size-8 grid place-items-center rounded-md text-muted-foreground cursor-pointer transition-colors",
                  copied
                    ? "text-success bg-success/10"
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleVisible}
              title={visible ? "Hide earnings" : "Show earnings"}
              aria-label={visible ? "Hide earnings" : "Show earnings"}
              aria-pressed={visible}
              className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            >
              {visible ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <p
          className={cn(
            "text-2xl font-semibold mt-1 font-mono tabular-nums transition-[filter,opacity]",
            visible ? "text-success" : "text-muted-foreground/50 select-none blur-[6px]"
          )}
          aria-hidden={!visible}
        >
          {visible ? formatted : formatCurrency(0).replace(/[\d.,]/g, "•")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {visible ? subtitle : "Hidden — tap the eye to reveal"}
        </p>
      </div>
    </Card>
  );
}
