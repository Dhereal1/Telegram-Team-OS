import "server-only";

import { prisma } from "@/lib/db/prisma";

function utcDateKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prevDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return utcDateKey(dt);
}

export async function checkInDaily(input: { teamId: string; userId: string }) {
  const today = utcDateKey(new Date());

  // Ensure idempotent checkin + streak update in one transaction.
  return prisma.$transaction(async (tx) => {
    await tx.dailyCheckin.upsert({
      where: { teamId_userId_dateKey: { teamId: input.teamId, userId: input.userId, dateKey: today } },
      update: {},
      create: { teamId: input.teamId, userId: input.userId, dateKey: today },
      select: { id: true },
    });

    const streak = await tx.habitStreak.upsert({
      where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
      update: {},
      create: { teamId: input.teamId, userId: input.userId, current: 0, best: 0, lastDateKey: null },
      select: { id: true, current: true, best: true, lastDateKey: true },
    });

    const shouldIncrement = streak.lastDateKey === prevDateKey(today) || streak.lastDateKey === today;
    const nextCurrent = streak.lastDateKey === today ? streak.current : shouldIncrement ? streak.current + 1 : 1;
    const nextBest = Math.max(streak.best, nextCurrent);

    const updated = await tx.habitStreak.update({
      where: { id: streak.id },
      data: { current: nextCurrent, best: nextBest, lastDateKey: today },
      select: { current: true, best: true, lastDateKey: true },
    });

    return { dateKey: today, streak: updated };
  });
}

