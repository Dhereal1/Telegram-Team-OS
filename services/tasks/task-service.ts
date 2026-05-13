import "server-only";

import { prisma } from "@/lib/db/prisma";
import { HttpError } from "@/lib/utils/api";
import { recordUsage } from "@/services/billing/billing-service";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  completedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  assignedToId: true,
  assignedTo: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

export async function listTasks(teamId: string) {
  return prisma.task.findMany({
    where: { teamId, archivedAt: null },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
    take: 50,
    select: taskSelect,
  });
}

export async function getTask(teamId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, teamId, archivedAt: null },
    select: taskSelect,
  });
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
  const created = await prisma.task.create({
    data: {
      teamId: input.teamId,
      createdById: input.createdById,
      assignedToId: input.assignedToId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "NORMAL",
      dueAt: input.dueAt,
    },
    select: taskSelect,
  });

  void recordUsage({ teamId: input.teamId, key: "tasks" }).catch(() => {});
  return created;
}

export async function updateTask(input: {
  teamId: string;
  taskId: string;
  title?: string;
  description?: string | null;
  status?: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: Date | null;
  assignedToId?: string | null;
}) {
  const completedAt =
    input.status === "DONE" ? new Date() : input.status ? null : undefined;

  const result = await prisma.task.updateMany({
    where: { id: input.taskId, teamId: input.teamId, archivedAt: null },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
      ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  if (result.count === 0) throw new HttpError("Task not found", 404, "NOT_FOUND");

  const updated = await getTask(input.teamId, input.taskId);
  if (!updated) throw new HttpError("Task not found", 404, "NOT_FOUND");
  return updated;
}

export async function archiveTask(teamId: string, taskId: string) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, teamId, archivedAt: null },
    data: { archivedAt: new Date(), status: "CANCELED" },
  });
  if (result.count === 0) throw new HttpError("Task not found", 404, "NOT_FOUND");
  const archived = await prisma.task.findFirst({
    where: { id: taskId, teamId },
    select: { id: true, title: true },
  });
  if (!archived) throw new HttpError("Task not found", 404, "NOT_FOUND");
  return archived;
}
