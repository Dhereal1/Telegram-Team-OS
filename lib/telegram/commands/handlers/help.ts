import "server-only";

import { prisma } from "@/lib/db/prisma";

export type CommandContext = { teamId: string; actorUserId: string; args: string[]; chatId: bigint };

function isAdminRole(roleKey: string | null | undefined) {
  return roleKey === "ADMIN" || roleKey === "FOUNDER";
}

export async function handleHelp(ctx: CommandContext): Promise<string> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, role: { select: { key: true } } },
  });

  const admin = Boolean(membership?.isActive && isAdminRole(membership.role.key));

  const lines = [
    "Available commands:",
    "/tasks — List open tasks",
    "/report <text> — Submit your daily report",
    "/help — Show this help",
  ];

  if (admin) {
    lines.splice(1, 0, "/assign @username <task> [due:YYYY-MM-DD] — Assign a task");
    lines.splice(2, 0, "/done <taskId> — Mark a task as done");
  }

  return lines.join("\n");
}

