export const STORAGE_SETUP = {
  title: "Connect Upstash Redis (free, ~2 min)",
  steps: [
    "Open https://console.upstash.com/redis → Create database",
    "Copy REST URL and REST TOKEN from the database details tab",
    "Vercel → Tracker project → Settings → Environment Variables",
    "Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (all environments)",
    "Deployments → Redeploy (required after adding variables)",
    "Open /api/health/storage — ready should be true, then Sync now",
  ],
  envVars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  alternative:
    "Or use Vercel → Storage → Upstash Redis → Connect (auto-injects the same variables).",
} as const;
