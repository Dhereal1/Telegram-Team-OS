import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getMissedReportsToday(teamId: string): Promise<
  { userId: string; firstName: string | null; username: string | null }[]
> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { timezone: true } });
  const tz = team?.timezone ?? "UTC";
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const reportDate = new Date(`${dateKey}T00:00:00.000Z`);

  const members = await prisma.teamMember.findMany({
    where: { teamId, isActive: true, status: "ACTIVE" },
    select: { userId: true, user: { select: { firstName: true, username: true } } },
    take: 5000,
  });

  const reports = await prisma.report.findMany({
    where: { teamId, reportDate },
    select: { authorId: true },
    take: 5000,
  });

  const submitted = new Set(reports.map((r) => r.authorId));
  return members
    .filter((m) => !submitted.has(m.userId))
    .map((m) => ({ userId: m.userId, firstName: m.user.firstName, username: m.user.username }));
}

