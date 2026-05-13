import "server-only";

import { prisma } from "@/lib/db/prisma";

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function recordPublicApiUsage(input: { teamId: string; apiKeyId: string; ok: boolean }) {
  const now = new Date();
  const dateKey = utcDateKey(now);
  await prisma.apiUsageDaily.upsert({
    where: { dateKey_apiKeyId: { dateKey, apiKeyId: input.apiKeyId } },
    update: {
      requests: { increment: 1 },
      errors: input.ok ? undefined : { increment: 1 },
      lastRequestAt: now,
    },
    create: {
      dateKey,
      teamId: input.teamId,
      apiKeyId: input.apiKeyId,
      requests: 1,
      errors: input.ok ? 0 : 1,
      lastRequestAt: now,
    },
    select: { id: true },
  });
}

