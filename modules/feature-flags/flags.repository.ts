import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function upsertFlag(input: { key: string; description?: string | null; defaultEnabled: boolean }) {
  return prisma.featureFlag.upsert({
    where: { key: input.key },
    update: { description: input.description ?? undefined, defaultEnabled: input.defaultEnabled },
    create: { key: input.key, description: input.description ?? undefined, defaultEnabled: input.defaultEnabled },
    select: { id: true, key: true, defaultEnabled: true },
  });
}

export async function listFlags() {
  return prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, description: true, defaultEnabled: true },
  });
}

export async function setWorkspaceOverride(input: { teamId: string; flagKey: string; enabled: boolean }) {
  const flag = await prisma.featureFlag.findUnique({ where: { key: input.flagKey }, select: { id: true } });
  if (!flag) throw new Error(`Unknown flag: ${input.flagKey}`);
  return prisma.workspaceFlagOverride.upsert({
    where: { teamId_flagId: { teamId: input.teamId, flagId: flag.id } },
    update: { enabled: input.enabled },
    create: { teamId: input.teamId, flagId: flag.id, enabled: input.enabled },
    select: { id: true, enabled: true },
  });
}

export async function getWorkspaceFlagMap(teamId: string) {
  const [flags, overrides] = await Promise.all([
    prisma.featureFlag.findMany({ select: { id: true, key: true, defaultEnabled: true } }),
    prisma.workspaceFlagOverride.findMany({ where: { teamId }, select: { flagId: true, enabled: true } }),
  ]);
  const byId = new Map(overrides.map((o) => [o.flagId, o.enabled] as const));
  const result: Record<string, boolean> = {};
  for (const f of flags) result[f.key] = byId.has(f.id) ? Boolean(byId.get(f.id)) : f.defaultEnabled;
  return result;
}

