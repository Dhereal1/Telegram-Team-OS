import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { GraphEdgeType, Prisma } from "@/lib/generated/prisma/client";

export async function upsertEdge(input: {
  teamId: string;
  type: GraphEdgeType;
  fromUserId: string;
  toUserId: string;
  by?: number;
  metadata?: Prisma.InputJsonValue | null;
}) {
  const by = input.by ?? 1;
  return prisma.orgGraphEdge.upsert({
    where: {
      teamId_type_fromUserId_toUserId: {
        teamId: input.teamId,
        type: input.type,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
      },
    },
    update: {
      weight: { increment: by },
      lastSeenAt: new Date(),
      metadata: input.metadata ?? undefined,
    },
    create: {
      teamId: input.teamId,
      type: input.type,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      weight: by,
      metadata: input.metadata ?? undefined,
    },
    select: { id: true, weight: true },
  });
}

export async function topEdges(teamId: string, type: GraphEdgeType, take = 20) {
  return prisma.orgGraphEdge.findMany({
    where: { teamId, type },
    orderBy: [{ weight: "desc" }, { lastSeenAt: "desc" }],
    take,
    select: {
      id: true,
      weight: true,
      lastSeenAt: true,
      fromUser: { select: { id: true, username: true, firstName: true, lastName: true } },
      toUser: { select: { id: true, username: true, firstName: true, lastName: true } },
    },
  });
}

