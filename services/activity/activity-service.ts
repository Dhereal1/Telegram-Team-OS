import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type ActivityInput = {
  teamId: string;
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function logActivity(input: ActivityInput) {
  return prisma.activityLog.create({
    data: {
      teamId: input.teamId,
      actorId: input.actorId ?? undefined,
      action: input.action,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listRecentActivity(teamId: string, take = 15) {
  return prisma.activityLog.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { id: true, username: true, firstName: true, lastName: true } },
      metadata: true,
    },
  });
}
