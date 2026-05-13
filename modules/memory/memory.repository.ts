import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createMemoryEntry(input: {
  teamId: string;
  createdById: string;
  type: "NOTE" | "DECISION" | "PROCEDURE" | "INCIDENT";
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  source?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return prisma.operationalMemoryEntry.create({
    data: {
      teamId: input.teamId,
      createdById: input.createdById,
      type: input.type,
      title: input.title,
      body: input.body,
      tags: input.tags,
      pinned: input.pinned,
      source: input.source ?? "miniapp",
      metadata: input.metadata ?? undefined,
    },
    select: { id: true, type: true, title: true, tags: true, pinned: true, createdAt: true },
  });
}

export async function listMemoryEntries(input: {
  teamId: string;
  take: number;
  q?: string;
  pinned?: boolean;
  type?: "NOTE" | "DECISION" | "PROCEDURE" | "INCIDENT";
}) {
  const q = input.q?.trim();
  return prisma.operationalMemoryEntry.findMany({
    where: {
      teamId: input.teamId,
      ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
      ...(input.type ? { type: input.type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: input.take,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      tags: true,
      pinned: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
    },
  });
}

export async function setPinned(input: { teamId: string; id: string; pinned: boolean }) {
  return prisma.operationalMemoryEntry.update({
    where: { id: input.id, teamId: input.teamId },
    data: { pinned: input.pinned },
    select: { id: true, pinned: true },
  });
}

