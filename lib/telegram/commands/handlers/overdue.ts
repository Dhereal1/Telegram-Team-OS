import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";

function isAdminRole(roleKey: string | null | undefined) {
  return roleKey === "FOUNDER" || roleKey === "ADMIN";
}

export async function handleOverdue(ctx: CommandContext): Promise<string> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, status: true, role: { select: { key: true } } },
  });
  if (!membership?.isActive || membership.status !== "ACTIVE" || !isAdminRole(membership.role.key)) {
    return "Only admins can view overdue tasks.";
  }

  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { teamId: ctx.teamId, archivedAt: null, dueAt: { lt: now }, status: { notIn: ["DONE", "CANCELED"] } },
    orderBy: { dueAt: "asc" },
    take: 15,
    select: {
      id: true,
      title: true,
      dueAt: true,
      assignedTo: { select: { username: true } },
    },
  });

  if (tasks.length === 0) return "No overdue tasks. Team is on track.";

  const lines = [`Overdue tasks (${tasks.length}):`, ""];
  for (const [i, t] of tasks.entries()) {
    const assignee = t.assignedTo?.username ? `@${t.assignedTo.username}` : "unassigned";
    const due = t.dueAt
      ? t.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      : "unknown";
    lines.push(`${i + 1}. ${t.title} — ${assignee} (due ${due})`);
  }

  return lines.join("\n");
}

