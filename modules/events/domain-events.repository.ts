import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { DomainEventStatus, Prisma } from "@/lib/generated/prisma/client";

export async function createDomainEvent(input: {
  teamId?: string | null;
  name: string;
  version?: number;
  schemaKey?: string | null;
  dedupeKey?: string | null;
  payload: Prisma.InputJsonValue;
}) {
  return prisma.domainEvent.create({
    data: {
      teamId: input.teamId ?? null,
      name: input.name,
      version: input.version ?? 1,
      schemaKey: input.schemaKey ?? null,
      dedupeKey: input.dedupeKey ?? null,
      payload: input.payload,
    },
    select: { id: true, name: true, teamId: true, dedupeKey: true, status: true, attempts: true, createdAt: true },
  });
}

export async function markDomainEventStatus(input: {
  id: string;
  status: DomainEventStatus;
  processedAt?: Date | null;
  lastError?: string | null;
}) {
  return prisma.domainEvent.update({
    where: { id: input.id },
    data: {
      status: input.status,
      processedAt: input.processedAt ?? undefined,
      lastError: input.lastError ?? undefined,
      attempts: { increment: 1 },
    },
    select: { id: true, status: true, attempts: true },
  });
}

export async function getDomainEvent(id: string) {
  return prisma.domainEvent.findUnique({
    where: { id },
    select: { id: true, name: true, teamId: true, dedupeKey: true, payload: true, status: true, attempts: true, createdAt: true },
  });
}
