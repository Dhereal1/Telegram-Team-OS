import "server-only";

import { z } from "zod";
import { defineMeshEvent } from "@/packages/platform-core/event-mesh";

export const teamosTaskCreated = defineMeshEvent({
  name: "teamos.task.created",
  schemaKey: "teamos.task.created",
  version: 1,
  schema: z.object({
    teamId: z.string(),
    actorId: z.string(),
    taskId: z.string(),
    title: z.string(),
  }),
});

