import "server-only";

import { z } from "zod";
import { defineContract, registerContract } from "@/packages/platform-core/gateway";
import { listTasks } from "@/modules/tasks/tasks.service";

export const tasksListV1 = defineContract({
  id: "teamos.core.tasks.list.v1",
  version: 1,
  request: z.object({ take: z.number().int().min(1).max(50).default(20) }),
  response: z.object({
    tasks: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        status: z.string(),
        priority: z.string(),
        updatedAt: z.string(),
      }),
    ),
  }),
});

registerContract(tasksListV1, async (input, ctx) => {
  const tasks = await listTasks(ctx.teamId, { take: input.take });
  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
    })),
  };
});
