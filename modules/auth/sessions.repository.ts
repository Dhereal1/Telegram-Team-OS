import "server-only";

import { prisma } from "@/lib/db/prisma";

export function updateSessionTeam(sessionId: string, teamId: string) {
  return prisma.session.update({ where: { id: sessionId }, data: { teamId }, select: { id: true } });
}

