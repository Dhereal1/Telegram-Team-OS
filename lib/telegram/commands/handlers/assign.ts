import "server-only";

import { prisma } from "@/lib/db/prisma";
import { notificationsQueue } from "@/lib/queues";

export type CommandContext = { teamId: string; actorUserId: string; args: string[]; chatId: bigint };

function normalizeUsername(input: string) {
  return input.replace(/^@/, "").trim().toLowerCase();
}

function parseDueAtFromArgs(args: string[]) {
  const dueIdx = args.findIndex((t) => /^due:\d{4}-\d{2}-\d{2}$/.test(t));
  if (dueIdx === -1) return { dueAt: null as Date | null, titleParts: args };

  const dueToken = args[dueIdx]!;
  const dateStr = dueToken.slice("due:".length);
  const dueAt = new Date(`${dateStr}T00:00:00.000Z`);
  const titleParts = args.slice(0, dueIdx);
  return { dueAt: Number.isNaN(dueAt.getTime()) ? null : dueAt, titleParts };
}

export async function handleAssign(ctx: CommandContext): Promise<string> {
  const usernameRaw = ctx.args[0];
  if (!usernameRaw) return "Usage: /assign @username <task title> [due:YYYY-MM-DD]";

  const username = normalizeUsername(usernameRaw);
  const { dueAt, titleParts } = parseDueAtFromArgs(ctx.args.slice(1));
  const title = titleParts.join(" ").trim();
  if (!title) return "Usage: /assign @username <task title> [due:YYYY-MM-DD]";

  const member = await prisma.teamMember.findFirst({
    where: { teamId: ctx.teamId, isActive: true, user: { username } },
    select: { user: { select: { id: true, telegramId: true, username: true } } },
  });

  if (!member?.user) return `Could not find @${username} in this workspace`;

  const created = await prisma.task.create({
    data: {
      teamId: ctx.teamId,
      createdById: ctx.actorUserId,
      assignedToId: member.user.id,
      title,
      status: "TODO",
      dueAt: dueAt ?? undefined,
    },
    select: { id: true, title: true, dueAt: true },
  });

  const actor = await prisma.user.findUnique({
    where: { id: ctx.actorUserId },
    select: { username: true },
  });

  const dueSuffix = created.dueAt
    ? ` (due ${created.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })})`
    : "";

  if (member.user.telegramId) {
    await notificationsQueue().add(
      "dm",
      {
        teamId: ctx.teamId,
        userId: member.user.id,
        telegramUserId: member.user.telegramId,
        message: `You have a new task assigned by @${actor?.username ?? "admin"}: ${created.title}${dueSuffix}`,
      },
      { removeOnComplete: 1000, removeOnFail: 5000, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
    );
  }

  return `Task assigned to @${username}: ${title}`;
}
