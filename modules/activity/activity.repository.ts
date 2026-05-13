import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type ActivityCreateInput = {
  teamId: string;
  actorId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createActivityLog(input: ActivityCreateInput) {
  return prisma.activityLog.create({
    data: {
      teamId: input.teamId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true },
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
      metadata: true,
      actor: { select: { id: true, username: true, firstName: true, lastName: true } },
    },
  });
}
