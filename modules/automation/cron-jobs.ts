import "server-only";

import { prisma } from "@/lib/db/prisma";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";

function utcDateKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function scanOverdueTasks() {
  const now = new Date();
  const teamChats = await prisma.team.findMany({ select: { id: true, telegramChatId: true }, take: 1000 });
  const chatByTeam = new Map(teamChats.map((t) => [t.id, t.telegramChatId ? String(t.telegramChatId) : null] as const));
  const overdue = await prisma.task.findMany({
    where: {
      archivedAt: null,
      status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
      dueAt: { lt: now },
    },
    take: 200,
    select: { id: true, title: true, teamId: true, dueAt: true, assignedToId: true },
  });

  for (const task of overdue) {
    const dayKey = utcDateKey(now);
    await emitDomainEvent(
      "task.overdue",
      {
        teamId: task.teamId,
        taskId: task.id,
        title: task.title,
        dueAt: task.dueAt ? task.dueAt.toISOString() : new Date(0).toISOString(),
        assignedToUserId: task.assignedToId ?? null,
        teamChatId: chatByTeam.get(task.teamId) ?? null,
      },
      { dedupeKey: `${task.id}:${dayKey}`, teamId: task.teamId },
    ).catch(() => {});
  }
}

export async function scanMissedReports() {
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const dayKey = utcDateKey(now);

  // Teams with active members (ADMIN/STAFF) who have not reported today.
  const teams = await prisma.team.findMany({
    select: { id: true, telegramChatId: true },
    take: 200,
  });

  for (const team of teams) {
    const [members, todayReports] = await Promise.all([
      prisma.teamMember.findMany({
        where: { teamId: team.id, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } },
        select: { userId: true },
        take: 500,
      }),
      prisma.report.findMany({
        where: { teamId: team.id, createdAt: { gte: startOfTodayUtc } },
        select: { authorId: true },
        take: 2000,
      }),
    ]);

    const reported = new Set(todayReports.map((r) => r.authorId));
    for (const member of members) {
      if (reported.has(member.userId)) continue;
      await emitDomainEvent(
        "report.missed",
        { teamId: team.id, userId: member.userId, dateKey: dayKey, teamChatId: team.telegramChatId ? String(team.telegramChatId) : null },
        { dedupeKey: `${member.userId}:${dayKey}`, teamId: team.id },
      ).catch(() => {});
    }
  }
}
