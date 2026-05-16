import "server-only";

import { prisma } from "@/lib/db/prisma";

export interface MemberScore {
  userId: string;
  firstName: string | null;
  username: string | null;
  reportScore: number;
  taskScore: number;
  totalScore: number;
  label: "Excellent" | "Good" | "Fair" | "Low";
}

function labelFor(total: number): MemberScore["label"] {
  if (total >= 80) return "Excellent";
  if (total >= 60) return "Good";
  if (total >= 40) return "Fair";
  return "Low";
}

function dateKeyInTz(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function reportDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export async function calculateMemberScore(teamId: string, userId: string, windowDays: number = 7): Promise<MemberScore> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { timezone: true },
  });
  const tz = team?.timezone ?? "UTC";
  const days = Math.max(1, Math.min(30, Math.floor(windowDays)));

  const now = new Date();
  const windowKeys = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    return dateKeyInTz(d, tz);
  });
  const windowDates = windowKeys.map(reportDateFromKey);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, username: true } });

  const reports = await prisma.report.findMany({
    where: { teamId, authorId: userId, reportDate: { in: windowDates } },
    select: { reportDate: true },
    take: 5000,
  });
  const submittedDays = new Set(reports.map((r) => r.reportDate.toISOString().slice(0, 10)));
  const daysSubmitted = windowDates.filter((d) => submittedDays.has(d.toISOString().slice(0, 10))).length;
  const reportScore = (daysSubmitted / days) * 50;

  const windowStartKey = windowKeys[windowKeys.length - 1]!;
  const windowStart = new Date(`${windowStartKey}T00:00:00.000Z`);

  const assigned = await prisma.task.findMany({
    where: {
      teamId,
      archivedAt: null,
      assignedToId: userId,
      createdAt: { gte: windowStart },
    },
    select: { id: true, dueAt: true, completedAt: true, status: true },
    take: 10_000,
  });

  let taskScore: number;
  if (assigned.length === 0) {
    taskScore = 25;
  } else {
    const totalAssigned = assigned.length;
    let onTime = 0;
    let late = 0;
    for (const t of assigned) {
      if (!t.completedAt) continue;
      if (!t.dueAt) {
        onTime += 1;
        continue;
      }
      if (t.completedAt.getTime() <= t.dueAt.getTime()) onTime += 1;
      else late += 1;
    }

    const perTask = 50 / totalAssigned;
    taskScore = Math.min(50, onTime * perTask + late * (perTask / 2));
  }

  const totalScore = Math.max(0, Math.min(100, Math.round(reportScore + taskScore)));

  return {
    userId,
    firstName: user?.firstName ?? null,
    username: user?.username ?? null,
    reportScore: Math.round(reportScore),
    taskScore: Math.round(taskScore),
    totalScore,
    label: labelFor(totalScore),
  };
}

