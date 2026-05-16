import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";

function formatDue(dueAt: Date) {
  return dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export async function handleMyTasks(ctx: CommandContext): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: {
      teamId: ctx.teamId,
      archivedAt: null,
      assignedToId: ctx.actorUserId,
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 10,
    select: { id: true, title: true, dueAt: true },
  });

  if (!tasks.length) return "You have no open tasks.";

  const lines = tasks.map((t, i) => {
    const due = t.dueAt ? ` (due ${formatDue(t.dueAt)})` : "";
    return `${i + 1}. ${t.title}${due}`;
  });

  return ["Your open tasks:", ...lines].join("\n");
}

