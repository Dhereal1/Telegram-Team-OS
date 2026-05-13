import "server-only";

import { redis } from "@/lib/redis/redis";
import { HttpError } from "@/lib/utils/api";

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 6;
const PENDING_TTL_SECONDS = 60;

function getKey(request: Request) {
  const key = request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key");
  return key?.trim() ? key.trim().slice(0, 96) : null;
}

export async function getIdempotencyResult<T>(input: { request: Request; teamId: string; route: string }): Promise<T | null> {
  if (!redis) return null;
  const key = getKey(input.request);
  if (!key) return null;
  const redisKey = `idem:${input.teamId}:${input.route}:${key}`;
  const value = await redis.get<string>(redisKey);
  if (!value) return null;
  if (value === "PENDING") throw new HttpError("Duplicate request in progress", 409, "IDEMPOTENCY_PENDING");
  return JSON.parse(value) as T;
}

export async function beginIdempotency(input: { request: Request; teamId: string; route: string }) {
  if (!redis) return null;
  const key = getKey(input.request);
  if (!key) return null;

  const redisKey = `idem:${input.teamId}:${input.route}:${key}`;
  const ok = await redis.set(redisKey, "PENDING", { nx: true, ex: PENDING_TTL_SECONDS });
  if (ok !== "OK") {
    const existing = await redis.get<string>(redisKey);
    if (existing && existing !== "PENDING") return { redisKey, existing };
    throw new HttpError("Duplicate request in progress", 409, "IDEMPOTENCY_PENDING");
  }

  return { redisKey, existing: null };
}

export async function finishIdempotency<T>(input: { redisKey: string | null; result: T }) {
  if (!redis) return;
  if (!input.redisKey) return;
  await redis.set(input.redisKey, JSON.stringify(input.result), { ex: IDEMPOTENCY_TTL_SECONDS });
}

