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

export async function handleApprove(ctx: CommandContext): Promise<string> {
  const usernameRaw = ctx.args[0];
  if (!usernameRaw) return "Usage: /approve @username";
  const username = normalizeUsername(usernameRaw);

  const actorMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, status: true, role: { select: { key: true } } },
  });
  if (!actorMembership?.isActive || actorMembership.status !== "ACTIVE" || !isAdminRole(actorMembership.role.key)) {
    return "Only admins can approve members.";
  }

  const user = await prisma.user.findFirst({ where: { username }, select: { id: true, telegramId: true, username: true, firstName: true } });
  if (!user) return `@${username} is not pending approval in this workspace.`;

  const member = await prisma.teamMember.findFirst({
    where: { teamId: ctx.teamId, userId: user.id, status: "PENDING" },
    select: { id: true, userId: true },
  });
  if (!member) return `@${username} is not pending approval in this workspace.`;

  const team = await prisma.team.findUnique({ where: { id: ctx.teamId }, select: { name: true } });
  const teamName = team?.name ?? "this workspace";

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { isActive: true, status: "ACTIVE" },
    select: { id: true },
  });

  if (user.telegramId) {
    await notificationsQueue().add(
      "dm",
      {
        teamId: ctx.teamId,
        userId: user.id,
        telegramUserId: user.telegramId,
        message: `You have been approved as a member of ${teamName}. You can now use /report and /tasks in the group.`,
      },
      { removeOnComplete: 1000, removeOnFail: 5000, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
    );
  }

  await prisma.activityLog.create({
    data: {
      teamId: ctx.teamId,
      actorId: ctx.actorUserId,
      action: "member.approved",
      entityType: "TeamMember",
      entityId: member.id,
      metadata: { username },
    },
  });

  return `@${username} has been approved and notified.`;
}

