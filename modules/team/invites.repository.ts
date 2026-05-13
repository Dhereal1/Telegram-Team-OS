import "server-only";

import { prisma } from "@/lib/db/prisma";

export function createInvite(input: {
  teamId: string;
  createdById: string;
  token: string;
  roleKey: "FOUNDER" | "ADMIN" | "STAFF";
  expiresAt: Date;
}) {
  return prisma.teamInvite.create({
    data: {
      teamId: input.teamId,
      createdById: input.createdById,
      token: input.token,
      roleKey: input.roleKey,
      expiresAt: input.expiresAt,
    },
    select: { id: true, token: true, roleKey: true, expiresAt: true, createdAt: true },
  });
}

export function getInviteByToken(token: string) {
  return prisma.teamInvite.findUnique({
    where: { token },
    select: { id: true, teamId: true, roleKey: true, expiresAt: true, usedAt: true, usedById: true },
  });
}

export function markInviteUsed(inviteId: string, userId: string) {
  return prisma.teamInvite.update({
    where: { id: inviteId },
    data: { usedAt: new Date(), usedById: userId },
    select: { id: true },
  });
}

export function listActiveInvites(teamId: string, take = 20) {
  return prisma.teamInvite.findMany({
    where: { teamId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, token: true, roleKey: true, expiresAt: true, createdAt: true },
  });
}
