import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";

export async function handleStatus(ctx: CommandContext): Promise<string> {
  const text = ctx.args.join(" ").trim();
  if (!text) return "Usage: /status <quick update>";

  await prisma.activityLog.create({
    data: {
      teamId: ctx.teamId,
      actorId: ctx.actorUserId,
      action: "member.status_update",
      entityType: "User",
      entityId: ctx.actorUserId,
      metadata: { text },
    },
    select: { id: true },
  });

  return "Status noted.";
}

