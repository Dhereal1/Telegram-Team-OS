import "server-only";

import { env } from "@/lib/env";
import IORedis from "ioredis";

declare global {
  var __teamosIORedis: IORedis | undefined;
}

function logRedisError(err: unknown) {
  const e = err as { name?: string; message?: string; code?: string; command?: { name?: string } };
  const payload = {
    ts: new Date().toISOString(),
    type: "redis.error",
    name: e?.name ?? "RedisError",
    code: e?.code ?? null,
    message: e?.message ?? "Redis error",
    command: e?.command?.name ?? null,
  };
  // Never log raw error objects here: ioredis errors may include auth args (secrets).
  console.error(JSON.stringify(payload));
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

  conn.on("error", logRedisError);

  if (process.env.NODE_ENV !== "production") globalThis.__teamosIORedis = conn;
  return conn;
}
