import { cn } from "@/lib/utils";

type TempoIconProps = {
  className?: string;
  /** Show live-tracking accent ring (e.g. when timer is running). */
  active?: boolean;
};

/** Custom Tempo mark — stopwatch-style, distinct from generic Lucide defaults. */
export function TempoIcon({ className, active }: TempoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {active ? (
        <circle
          cx="12"
          cy="13"
          r="10"
          className="stroke-danger/35"
          strokeWidth="2"
        />
      ) : null}
      <path
        d="M9 3h6M12 3v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="13"
        r="7.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 10v3.5l2.5 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="1.25" fill="currentColor" />
    </svg>
  );
}
