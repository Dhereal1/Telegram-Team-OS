import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function trackEvent(input: {
  teamId?: string | null;
  userId?: string | null;
  name: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return prisma.productEvent.create({
    data: {
      teamId: input.teamId ?? null,
      userId: input.userId ?? null,
      name: input.name,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true },
  });
}

