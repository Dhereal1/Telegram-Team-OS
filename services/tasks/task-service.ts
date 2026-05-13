import * as v2 from "@/modules/tasks/tasks.service";

export function listTasks(teamId: string) {
  return v2.listTasks(teamId);
}

export function getTask(teamId: string, taskId: string) {
  return v2.getTask(teamId, taskId);
}

export async function createTask(input: {
  teamId: string;
  createdById: string;
  title: string;
  description?: string;
  assignedToId?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: Date;
}) {
  return v2.createTask({
    teamId: input.teamId,
    actorId: input.createdById,
    title: input.title,
    description: input.description,
    assignedToId: input.assignedToId,
    priority: input.priority,
    dueAt: input.dueAt,
  });
}

// Back-compat: accept the old patch shape, but require actorId for auditability.
export async function updateTask(input: {
  teamId: string;
  taskId: string;
  actorId: string;
  title?: string;
  description?: string | null;
  status?: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: Date | null;
  assignedToId?: string | null;
}) {
  return v2.updateTask({
    teamId: input.teamId,
    actorId: input.actorId,
    taskId: input.taskId,
    patch: {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt,
      assignedToId: input.assignedToId,
    },
  });
}

export async function archiveTask(teamId: string, taskId: string, actorId: string) {
  return v2.archiveTask({ teamId, taskId, actorId });
}
