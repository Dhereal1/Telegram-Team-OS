import "server-only";

import { eventBus } from "@/packages/events/events";
import { upsertEdge } from "@/modules/graph/graph.repository";

let registered = false;
function register() {
  if (registered) return;
  registered = true;

  // Task assignment: actor delegates to assignee
  eventBus.on("task.assigned", async (e) => {
    await upsertEdge({
      teamId: e.teamId,
      type: "DELEGATES_TO",
      fromUserId: e.actorId,
      toUserId: e.assignedToUserId,
      by: 1,
      metadata: { taskId: e.taskId },
    });
  });

  // Report review: reviewer reviews for author
  // Phase 3 foundation only — emit a new event later when review routes are refactored to domain events.
}

register();

