import { TimelyIcon } from "@/components/timely-icon";
import { APP_NAME, APP_SUBTITLE } from "@/lib/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute -top-32 left-1/4 size-96 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 size-80 rounded-full bg-violet-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-violet-600 shadow-[0_12px_40px_-12px_rgba(99,102,241,0.75)]">
            <TimelyIcon className="size-7 text-white" active />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
            <p className="text-sm text-muted-foreground">{APP_SUBTITLE}</p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
