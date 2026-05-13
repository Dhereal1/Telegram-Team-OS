import "server-only";

import { redis } from "@/lib/redis/redis";

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

