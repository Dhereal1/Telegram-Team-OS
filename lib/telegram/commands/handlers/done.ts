import "server-only";

import { prisma } from "@/lib/db/prisma";

export type CommandContext = { teamId: string; actorUserId: string; args: string[]; chatId: bigint };

function isAdminRole(roleKey: string | null | undefined) {
  return roleKey === "ADMIN" || roleKey === "FOUNDER";
}

export async function handleDone(ctx: CommandContext): Promise<string> {
  const prefix = ctx.args[0]?.trim();
  if (!prefix) return "Usage: /done <taskId>";

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, role: { select: { key: true } } },
  });

  if (!membership?.isActive) return "You are not a member of this workspace.";

  const task = await prisma.task.findFirst({
    where: { teamId: ctx.teamId, archivedAt: null, id: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    select: { id: true, assignedToId: true, status: true },
  });

  if (!task) return "Task not found";

  const allowed = task.assignedToId === ctx.actorUserId || isAdminRole(membership.role.key);
  if (!allowed) return "Permission denied";

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "DONE", completedAt: new Date() },
    select: { id: true },
  });

  return "Task marked as done";
}

