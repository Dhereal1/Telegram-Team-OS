import "server-only";

import { prisma } from "@/lib/db/prisma";

export type CommandContext = { teamId: string; actorUserId: string; args: string[]; chatId: bigint };

function startOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export async function handleReport(ctx: CommandContext): Promise<string> {
  const body = ctx.args.join(" ").trim();
  if (!body) return "Usage: /report <what you did | what is blocked | what’s next>";

  // Note: Team timezone is not modeled in the current schema; default to UTC.
  const now = new Date();
  const periodStart = startOfDayUtc(now);
  const periodEnd = endOfDayUtc(now);

  const existing = await prisma.report.findFirst({
    where: {
      teamId: ctx.teamId,
      authorId: ctx.actorUserId,
      periodStart,
      periodEnd,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.report.update({
      where: { id: existing.id },
      data: { body, status: "SUBMITTED", title: "Daily report" },
      select: { id: true },
    });
    return "Report updated for today";
  }

  await prisma.report.create({
    data: {
      teamId: ctx.teamId,
      authorId: ctx.actorUserId,
      title: "Daily report",
      body,
      status: "SUBMITTED",
      periodStart,
      periodEnd,
    },
    select: { id: true },
  });

  return "Report submitted for today";
}

