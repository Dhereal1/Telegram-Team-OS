import "server-only";

import { env } from "@/lib/env";
import IORedis from "ioredis";

declare global {
  var __teamosIORedis: IORedis | undefined;
}

export function getRedisConnection() {
  const url = env.REDIS_URL;
  if (!url) return null;

  const existing = globalThis.__teamosIORedis;
  if (existing) return existing;

  const conn = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  if (process.env.NODE_ENV !== "production") globalThis.__teamosIORedis = conn;
  return conn;
}

