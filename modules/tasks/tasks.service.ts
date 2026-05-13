import "server-only";

import { HttpError } from "@/packages/core/http-error";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";
import { emitMeshEvent } from "@/packages/platform-core/event-mesh";
import { teamosTaskCreated } from "@/platform/event-mesh";
import * as repo from "@/modules/tasks/tasks.repository";
import { recordUsage } from "@/services/billing/billing-service";

export function listTasks(teamId: string, options?: { take?: number; cursorId?: string | null }) {
  return repo.listTasks(teamId, options);
}

export async function getTask(teamId: string, taskId: string) {
  const task = await repo.getTask(teamId, taskId);
  return task;
}

export async function createTask(input: {
  teamId: string;
  actorId: string;
  title: string;
  description?: string;
  assignedToId?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: Date;
}) {
  const created = await repo.createTask({
    teamId: input.teamId,
    createdById: input.actorId,
    title: input.title,
    description: input.description,
    assignedToId: input.assignedToId,
    priority: input.priority,
    dueAt: input.dueAt,
  });

  void recordUsage({ teamId: input.teamId, key: "tasks" }).catch(() => {});
  void emitDomainEvent("task.created", {
    teamId: input.teamId,
    actorId: input.actorId,
    taskId: created.id,
    title: created.title,
  });
  void emitMeshEvent(
    teamosTaskCreated,
    { teamId: input.teamId, actorId: input.actorId, taskId: created.id, title: created.title },
    { teamId: input.teamId, dedupeKey: `${created.id}` },
  ).catch(() => {});

  return created;
}

export async function updateTask(input: {
  teamId: string;
  actorId: string;
  taskId: string;
  patch: {
    title?: string;
    description?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    dueAt?: Date | null;
    assignedToId?: string | null;
  };
}) {
  const before = await repo.getTask(input.teamId, input.taskId);
  if (!before) throw new HttpError("Task not found", 404, "NOT_FOUND");

  const completedAt =
    input.patch.status === "DONE" ? new Date() : input.patch.status ? null : undefined;

  const result = await repo.updateTask({
    teamId: input.teamId,
    taskId: input.taskId,
    patch: {
      ...(input.patch.title !== undefined ? { title: input.patch.title } : {}),
      ...(input.patch.description !== undefined ? { description: input.patch.description ?? null } : {}),
      ...(input.patch.status !== undefined ? { status: input.patch.status } : {}),
      ...(input.patch.priority !== undefined ? { priority: input.patch.priority } : {}),
      ...(input.patch.dueAt !== undefined ? { dueAt: input.patch.dueAt } : {}),
      ...(input.patch.assignedToId !== undefined ? { assignedToId: input.patch.assignedToId } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  if (result.count === 0) throw new HttpError("Task not found", 404, "NOT_FOUND");

  const updated = await repo.getTask(input.teamId, input.taskId);
  if (!updated) throw new HttpError("Task not found", 404, "NOT_FOUND");

  if (input.patch.assignedToId !== undefined && input.patch.assignedToId && before.assignedToId !== input.patch.assignedToId) {
    void emitDomainEvent("task.assigned", {
      teamId: input.teamId,
      actorId: input.actorId,
      taskId: updated.id,
      title: updated.title,
      assignedToUserId: input.patch.assignedToId,
    });
  }

  if (before.status !== "DONE" && updated.status === "DONE") {
    void emitDomainEvent("task.completed", {
      teamId: input.teamId,
      actorId: input.actorId,
      taskId: updated.id,
      title: updated.title,
    });
  }

  return updated;
}

export async function archiveTask(input: { teamId: string; actorId: string; taskId: string }) {
  const task = await repo.getTask(input.teamId, input.taskId);
  if (!task) throw new HttpError("Task not found", 404, "NOT_FOUND");
  const result = await repo.archiveTask(input.teamId, input.taskId);
  if (result.count === 0) throw new HttpError("Task not found", 404, "NOT_FOUND");
  return { id: task.id, title: task.title };
}
