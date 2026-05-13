import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function upsertTemplate(input: { key: string; name: string; description?: string | null; definition: Prisma.InputJsonValue }) {
  return prisma.workspaceTemplate.upsert({
    where: { key: input.key },
    update: { name: input.name, description: input.description ?? undefined, definition: input.definition as never },
    create: { key: input.key, name: input.name, description: input.description ?? undefined, definition: input.definition as never },
    select: { id: true, key: true, name: true, description: true },
  });
}

export async function listTemplates() {
  return prisma.workspaceTemplate.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, name: true, description: true },
  });
}

export async function getTemplateByKey(key: string) {
  return prisma.workspaceTemplate.findUnique({
    where: { key },
    select: { id: true, key: true, name: true, description: true, definition: true },
  });
}

export async function installTemplate(input: { teamId: string; templateId: string; installedById?: string | null }) {
  return prisma.templateInstall.upsert({
    where: { teamId_templateId: { teamId: input.teamId, templateId: input.templateId } },
    update: {},
    create: { teamId: input.teamId, templateId: input.templateId, installedById: input.installedById ?? null },
    select: { id: true, createdAt: true },
  });
}

