import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis/redis";
import { HttpError } from "@/lib/utils/api";

type RateLimitPreset = "auth" | "webhook" | "mutation" | "public_api" | "intelligence";

function clientIpFromRequest(request: Request) {
  const xf = request.headers.get("x-forwarded-for");
  const ip = xf?.split(",")[0]?.trim();
  return ip || "unknown";
}

const limiters: Partial<Record<RateLimitPreset, Ratelimit>> = {};

function getLimiter(preset: RateLimitPreset) {
  if (!redis) return null;
  if (limiters[preset]) return limiters[preset]!;

  // Fixed window keeps behavior predictable for launch.
  const limiter =
    preset === "auth"
      ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(10, "1 m") })
      : preset === "webhook"
        ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(120, "1 m") })
        : preset === "public_api"
          ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(600, "1 m") })
          : preset === "intelligence"
            ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(40, "1 m") })
          : new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(60, "1 m") });

  limiters[preset] = limiter;
  return limiter;
}

export async function enforceRateLimit(input: {
  request: Request;
  preset: RateLimitPreset;
  key: string;
  namespace?: string;
  identity?: string;
}) {
  const limiter = getLimiter(input.preset);
  if (!limiter) return;

  const identity = input.identity ?? clientIpFromRequest(input.request);
  const namespace = input.namespace ?? "v1";
  const fullKey = `${namespace}:${input.preset}:${identity}:${input.key}`;

  const result = await limiter.limit(fullKey);
  if (!result.success) {
    throw new HttpError("Rate limited", 429, "RATE_LIMITED");
  }
}
