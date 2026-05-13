import "server-only";

import { prisma } from "@/lib/db/prisma";
import { teamosTaskCreated } from "@/platform/event-mesh";

export async function bootstrapGovernance() {
  // Event schema registry (Phase 6: internal governance, no public console).
  await prisma.eventSchemaRegistry.upsert({
    where: { name_version: { name: teamosTaskCreated.name, version: teamosTaskCreated.version } },
    update: {
      schemaKey: teamosTaskCreated.schemaKey,
      jsonSchema: { zod: "embedded", name: teamosTaskCreated.name } as never,
      status: "ACTIVE",
    },
    create: {
      name: teamosTaskCreated.name,
      version: teamosTaskCreated.version,
      schemaKey: teamosTaskCreated.schemaKey,
      jsonSchema: { zod: "embedded", name: teamosTaskCreated.name } as never,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  await prisma.serviceOwnership.upsert({
    where: { serviceId: "teamos.core" },
    update: { owner: "platform", status: "ACTIVE" },
    create: { serviceId: "teamos.core", owner: "platform", status: "ACTIVE" },
    select: { id: true },
  });
}

export async function listEventSchemas() {
  return prisma.eventSchemaRegistry.findMany({
    orderBy: [{ name: "asc" }, { version: "desc" }],
    take: 200,
    select: { name: true, version: true, schemaKey: true, status: true, updatedAt: true },
  });
}

export async function listServiceOwnership() {
  return prisma.serviceOwnership.findMany({
    orderBy: { serviceId: "asc" },
    take: 200,
    select: { serviceId: true, owner: true, status: true, slackChannel: true, updatedAt: true },
  });
}

