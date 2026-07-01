import { envPresent } from "@/lib/server/env";

export function redisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isRedisConfigured(): boolean {
  return Boolean(redisEnv());
}

export async function getRedis() {
  const env = redisEnv();
  if (!env) throw new Error("Redis is not configured.");
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url: env.url, token: env.token });
}
