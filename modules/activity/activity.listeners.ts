import "server-only";

import { eventBus } from "@/packages/events/events";
import { logActivity } from "@/modules/activity/activity.service";

let registered = false;

function register() {
  if (registered) return;
  registered = true;

  eventBus.on("task.created", async (e) => {
    await logActivity({
      teamId: e.teamId,
      actorId: e.actorId,
      action: "task.created",
      entityType: "Task",
      entityId: e.taskId,
      metadata: { title: e.title },
    });
  });

  eventBus.on("task.completed", async (e) => {
    await logActivity({
      teamId: e.teamId,
      actorId: e.actorId,
      action: "task.completed",
      entityType: "Task",
      entityId: e.taskId,
      metadata: { title: e.title },
    });
  });

  eventBus.on("report.submitted", async (e) => {
    await logActivity({
      teamId: e.teamId,
      actorId: e.actorId,
      action: "report.submitted",
      entityType: "Report",
      entityId: e.reportId,
      metadata: { title: e.title },
    });
  });

  eventBus.on("invite.accepted", async (e) => {
    await logActivity({
      teamId: e.teamId,
      actorId: e.actorId,
      action: "team.invite_accepted",
      entityType: "TeamInvite",
      entityId: e.inviteId,
      metadata: {},
    });
  });

  eventBus.on("invite.created", async (e) => {
    await logActivity({
      teamId: e.teamId,
      actorId: e.actorId,
      action: "team.invite_created",
      entityType: "TeamInvite",
      entityId: e.inviteId,
      metadata: { roleKey: e.roleKey },
    });
  });

  eventBus.on("member.joined", async (e) => {
    await logActivity({
      teamId: e.teamId,
      actorId: e.actorId,
      action: "team.member_joined",
      entityType: "TeamMember",
      entityId: e.memberId,
      metadata: { roleKey: e.roleKey },
    });
  });
}

register();
