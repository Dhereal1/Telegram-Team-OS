import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export const taskSelect = {
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
} satisfies Prisma.TaskSelect;

export function listTasks(teamId: string, options?: { take?: number; cursorId?: string | null }) {
  const take = options?.take ?? 50;
  return prisma.task.findMany({
    where: { teamId, archivedAt: null },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
    take,
    ...(options?.cursorId
      ? {
          cursor: { id: options.cursorId },
          skip: 1,
        }
      : {}),
    select: taskSelect,
  });
}

export function getTask(teamId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, teamId, archivedAt: null },
    select: taskSelect,
  });
}

export function createTask(input: {
  teamId: string;
  createdById: string;
  title: string;
  description?: string;
  assignedToId?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt?: Date;
}) {
  return prisma.task.create({
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
}

export async function updateTask(input: {
  teamId: string;
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
  return prisma.task.updateMany({
    where: { id: input.taskId, teamId: input.teamId, archivedAt: null },
    data: input.patch,
  });
}

export function archiveTask(teamId: string, taskId: string) {
  return prisma.task.updateMany({
    where: { id: taskId, teamId, archivedAt: null },
    data: { archivedAt: new Date(), status: "CANCELED" },
  });
}

