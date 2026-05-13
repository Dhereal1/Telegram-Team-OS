import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getTeamOverview(teamId: string) {
  const [openTasks, dueReports, members, insights] = await Promise.all([
    prisma.task.count({ where: { teamId, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } }),
    prisma.report.count({ where: { teamId, status: { in: ["DRAFT", "SUBMITTED"] } } }),
    prisma.teamMember.count({ where: { teamId, isActive: true } }),
    prisma.aIInsight.count({ where: { teamId } }),
  ]);

  return { openTasks, dueReports, members, insights };
}

