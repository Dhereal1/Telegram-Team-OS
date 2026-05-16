import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { checkLimit } from "@/lib/billing/plans";

export async function handleReport(ctx: CommandContext): Promise<string> {
  const body = ctx.args.join(" ").trim();
  if (!body) return "Usage: /report <what you did | what is blocked | what’s next>";

  const team = await prisma.team.findUnique({
    where: { id: ctx.teamId },
    select: { timezone: true },
  });
  const tz = team?.timezone ?? "UTC";
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
  const reportDate = new Date(`${dateKey}T00:00:00.000Z`);

  const existing = await prisma.report.findUnique({
    where: { teamId_authorId_reportDate: { teamId: ctx.teamId, authorId: ctx.actorUserId, reportDate } },
    select: { id: true },
  });

  if (!existing) {
    const limit = await checkLimit(ctx.teamId, "reports");
    if (!limit.allowed) return limit.reason ?? "Upgrade required.";
  }

  await prisma.report.upsert({
    where: { teamId_authorId_reportDate: { teamId: ctx.teamId, authorId: ctx.actorUserId, reportDate } },
    create: {
      teamId: ctx.teamId,
      authorId: ctx.actorUserId,
      reportDate,
      title: "Daily report",
      body,
      status: "SUBMITTED",
    },
    update: {
      body,
      status: "SUBMITTED",
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.team.update({ where: { id: ctx.teamId }, data: { usageReportsCount: { increment: 1 } }, select: { id: true } });
    return "Report submitted for today";
  }
  return "Report updated for today";
}
