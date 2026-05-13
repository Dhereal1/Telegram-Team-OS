import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function searchOperational(teamId: string, q: string, take: number) {
  const query = q.trim();
  const like = `%${query}%`;

  const [tasks, reports, members, activity] = await Promise.all([
    prisma.task.findMany({
      where: { teamId, archivedAt: null, OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, title: true, status: true, priority: true, updatedAt: true },
    }),
    prisma.report.findMany({
      where: { teamId, OR: [{ title: { contains: query, mode: "insensitive" } }, { body: { contains: query, mode: "insensitive" } }] },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, title: true, status: true, updatedAt: true, author: { select: { username: true, firstName: true, lastName: true } } },
    }),
    prisma.teamMember.findMany({
      where: {
        teamId,
        isActive: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { user: { username: { contains: query, mode: "insensitive" } } },
          { user: { firstName: { contains: query, mode: "insensitive" } } },
          { user: { lastName: { contains: query, mode: "insensitive" } } },
        ],
      },
      take,
      select: { id: true, title: true, role: { select: { key: true } }, user: { select: { id: true, username: true, firstName: true, lastName: true } } },
    }),
    prisma.activityLog.findMany({
      where: { teamId, OR: [{ action: { contains: query, mode: "insensitive" } }, { entityType: { contains: query, mode: "insensitive" } }, { entityId: { contains: query, mode: "insensitive" } }] },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, actor: { select: { username: true, firstName: true, lastName: true } } },
    }),
  ]);

  return { tasks, reports, members, activity, like };
}

