import "server-only";

import { prisma } from "@/lib/db/prisma";

export type CommandContext = { teamId: string; actorUserId: string; args: string[]; chatId: bigint };

function formatDue(dueAt: Date) {
  return dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export async function handleTasks(ctx: CommandContext): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: {
      teamId: ctx.teamId,
      archivedAt: null,
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      title: true,
      dueAt: true,
      assignedTo: { select: { username: true, firstName: true, lastName: true } },
    },
  });

  if (!tasks.length) return "No open tasks";

  const lines = tasks.map((t, i) => {
    const who = t.assignedTo?.username ? `@${t.assignedTo.username}` : "unassigned";
    const due = t.dueAt ? ` (due ${formatDue(t.dueAt)})` : "";
    return `${i + 1}. ${t.title} — ${who}${due}`;
  });

  return lines.join("\n");
}

