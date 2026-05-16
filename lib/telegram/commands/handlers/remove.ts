import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";
import { notificationsQueue } from "@/lib/queues";

function normalizeUsername(input: string) {
  return input.replace(/^@/, "").trim().toLowerCase();
}

function isAdminRole(roleKey: string | null | undefined) {
  return roleKey === "FOUNDER" || roleKey === "ADMIN";
}

export async function handleRemove(ctx: CommandContext): Promise<string> {
  const usernameRaw = ctx.args[0];
  if (!usernameRaw) return "Usage: /remove @username";
  const username = normalizeUsername(usernameRaw);

  const actorMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, status: true, role: { select: { key: true } } },
  });
  if (!actorMembership?.isActive || actorMembership.status !== "ACTIVE" || !isAdminRole(actorMembership.role.key)) {
    return "Only admins can remove members.";
  }

  const member = await prisma.teamMember.findFirst({
    where: { teamId: ctx.teamId, isActive: true, status: "ACTIVE", user: { username } },
    select: { id: true, userId: true, role: { select: { key: true } }, user: { select: { telegramId: true } } },
  });
  if (!member) return `@${username} is not an active member of this workspace.`;

  if (member.userId === ctx.actorUserId) return "You cannot remove yourself.";
  if (member.role.key === "FOUNDER") return "The workspace founder cannot be removed.";

  const team = await prisma.team.findUnique({ where: { id: ctx.teamId }, select: { name: true } });
  const teamName = team?.name ?? "this workspace";

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { isActive: false, status: "SUSPENDED" },
    select: { id: true },
  });

  if (member.user.telegramId) {
    await notificationsQueue().add(
      "dm",
      {
        teamId: ctx.teamId,
        userId: member.userId,
        telegramUserId: member.user.telegramId,
        message: `You have been removed from ${teamName} on Dhereal TeamOS.`,
      },
      { removeOnComplete: 1000, removeOnFail: 5000, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
    );
  }

  await prisma.activityLog.create({
    data: {
      teamId: ctx.teamId,
      actorId: ctx.actorUserId,
      action: "member.removed",
      entityType: "TeamMember",
      entityId: member.id,
      metadata: { username },
    },
  });

  return `@${username} has been removed from the workspace.`;
}

