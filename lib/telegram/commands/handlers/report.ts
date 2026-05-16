import "server-only";

import { prisma } from "@/lib/db/prisma";

export type CommandContext = { teamId: string; actorUserId: string; args: string[]; chatId: bigint };

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

  const created = await prisma.report.upsert({
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
    select: { id: true, createdAt: true, updatedAt: true },
  });

  return created.createdAt.getTime() === created.updatedAt.getTime() ? "Report submitted for today" : "Report updated for today";
}
