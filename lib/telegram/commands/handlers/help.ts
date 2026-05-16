import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { CommandContext } from "@/lib/telegram/commands/handlers/types";

function isAdminRole(roleKey: string | null | undefined) {
  return roleKey === "ADMIN" || roleKey === "FOUNDER";
}

export async function handleHelp(ctx: CommandContext): Promise<string> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, role: { select: { key: true } } },
  });

  const admin = Boolean(membership?.isActive && isAdminRole(membership.role.key));
  const founder = Boolean(membership?.isActive && membership.role.key === "FOUNDER");

  const lines: string[] = ["Available commands:"];

  lines.push("/start ws_<token> — Link this group (use dashboard invite link)");

  if (admin) {
    lines.push("/assign @username <task> [due:YYYY-MM-DD] — Assign a task");
    lines.push("/done <taskId> — Mark a task as done");
    lines.push("/overdue — List overdue tasks");
    lines.push("/approve @username — Approve a pending member");
    lines.push("/remove @username — Remove a member");
  }

  if (founder) lines.push("/setrole @username admin|member — Change a member role");

  lines.push("/tasks — List open tasks");
  lines.push("/mytasks — List your open tasks");
  lines.push("/report <text> — Submit your daily report");
  lines.push("/status <text> — Post a quick status update");
  if (admin) lines.push("/summary — Team summary (admin only)");
  lines.push("/help — Show this help");

  return lines.join("\n");
}
