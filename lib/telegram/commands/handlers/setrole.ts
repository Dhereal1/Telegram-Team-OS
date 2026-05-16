import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";
import { notificationsQueue } from "@/lib/queues";

function normalizeUsername(input: string) {
  return input.replace(/^@/, "").trim().toLowerCase();
}

export async function handleSetRole(ctx: CommandContext): Promise<string> {
  const usernameRaw = ctx.args[0];
  const roleRaw = ctx.args[1]?.trim().toLowerCase();
  if (!usernameRaw || !roleRaw || (roleRaw !== "admin" && roleRaw !== "member")) {
    return "Usage: /setrole @username admin|member";
  }

  const actorMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, status: true, role: { select: { key: true } } },
  });
  if (!actorMembership?.isActive || actorMembership.status !== "ACTIVE" || actorMembership.role.key !== "FOUNDER") {
    return "Only the workspace founder can change roles.";
  }

  const username = normalizeUsername(usernameRaw);
  const member = await prisma.teamMember.findFirst({
    where: { teamId: ctx.teamId, user: { username } },
    select: { id: true, userId: true, role: { select: { key: true } }, user: { select: { telegramId: true } } },
  });
  if (!member) return `Could not find @${username} in this workspace`;

  if (member.userId === ctx.actorUserId) return "You cannot change your own role.";
  if (member.role.key === "FOUNDER") return "Cannot change the role of another founder.";

  const targetRoleKey = roleRaw === "admin" ? "ADMIN" : "STAFF";
  const targetRole = await prisma.role.findUnique({ where: { key: targetRoleKey }, select: { id: true, name: true, key: true } });
  if (!targetRole) return "Role not configured.";

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { roleId: targetRole.id },
    select: { id: true },
  });

  const team = await prisma.team.findUnique({ where: { id: ctx.teamId }, select: { name: true } });
  const teamName = team?.name ?? "this workspace";
  const roleLabel = roleRaw === "admin" ? "admin" : "member";

  if (member.user.telegramId) {
    await notificationsQueue().add(
      "dm",
      {
        teamId: ctx.teamId,
        userId: member.userId,
        telegramUserId: member.user.telegramId,
        message: `Your role in ${teamName} has been updated to ${roleLabel}.`,
      },
      { removeOnComplete: 1000, removeOnFail: 5000, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
    );
  }

  await prisma.activityLog.create({
    data: {
      teamId: ctx.teamId,
      actorId: ctx.actorUserId,
      action: "member.role_changed",
      entityType: "TeamMember",
      entityId: member.id,
      metadata: { username, role: targetRoleKey },
    },
    select: { id: true },
  });

  return `@${username} is now ${roleLabel}.`;
}

