import "server-only";

import { eventBus } from "@/packages/events/events";
import { upsertEdge } from "@/modules/graph/graph.repository";
import { prisma } from "@/lib/db/prisma";

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

  // Collaboration hint: when a report is submitted, we treat it as a signal from author -> founders/admins.
  eventBus.on("report.submitted", async (e) => {
    const admins = await prisma.teamMember.findMany({
      where: { teamId: e.teamId, isActive: true, role: { key: { in: ["FOUNDER", "ADMIN"] } } },
      select: { userId: true },
      take: 20,
    });
    await Promise.all(
      admins
        .filter((m) => m.userId !== e.actorId)
        .map((m) =>
          upsertEdge({
            teamId: e.teamId,
            type: "COLLABORATES_WITH",
            fromUserId: e.actorId,
            toUserId: m.userId,
            by: 1,
            metadata: { reportId: e.reportId },
          }),
        ),
    );
  });

  // Report review: reviewer reviews for author
  // Phase 3 foundation only — emit a new event later when review routes are refactored to domain events.
}

register();
