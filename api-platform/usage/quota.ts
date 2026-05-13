import "server-only";

import { env } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";
import { HttpError } from "@/packages/core/http-error";

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function defaultDailyQuota() {
  // Phase 10: conservative default for market readiness. Tune via env or per-plan later.
  return 20_000;
}

export async function enforcePublicApiDailyQuota(input: { apiKeyId: string }) {
  const quota = env.PUBLIC_API_DAILY_REQUEST_QUOTA ?? defaultDailyQuota();
  if (!Number.isFinite(quota) || quota <= 0) return;

  const dateKey = utcDateKey();
  const row = await prisma.apiUsageDaily.findUnique({
    where: { dateKey_apiKeyId: { dateKey, apiKeyId: input.apiKeyId } },
    select: { requests: true },
  });
  const used = row?.requests ?? 0;

  // Note: usage is incremented after request completes, so this is a best-effort gate.
  if (used >= quota) throw new HttpError("API quota exceeded", 429, "QUOTA_EXCEEDED");
}

