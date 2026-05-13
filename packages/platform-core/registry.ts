import "server-only";

import { prisma } from "@/lib/db/prisma";
import { appManifestSchema, type AppManifest } from "@/packages/platform-core/types";

export async function registerApp(manifest: AppManifest) {
  const parsed = appManifestSchema.parse(manifest);
  return prisma.platformApp.upsert({
    where: { key: parsed.key },
    update: { name: parsed.name, version: parsed.version, status: "ACTIVE", manifest: parsed as never },
    create: { key: parsed.key, name: parsed.name, version: parsed.version, status: "ACTIVE", manifest: parsed as never },
    select: { id: true, key: true, version: true, status: true },
  });
}

export async function listActiveApps() {
  return prisma.platformApp.findMany({
    where: { status: "ACTIVE" },
    orderBy: { key: "asc" },
    select: { id: true, key: true, name: true, version: true, manifest: true },
  });
}

export async function ensureWorkspaceInstall(teamId: string, appKey: string, input?: { status?: "ENABLED" | "DISABLED"; grants?: string[]; config?: unknown }) {
  const app = await prisma.platformApp.findUnique({ where: { key: appKey }, select: { id: true } });
  if (!app) throw new Error(`Unknown app: ${appKey}`);
  return prisma.workspaceAppInstall.upsert({
    where: { teamId_appId: { teamId, appId: app.id } },
    update: { status: input?.status ?? undefined, grants: (input?.grants ?? undefined) as never, config: (input?.config ?? undefined) as never },
    create: { teamId, appId: app.id, status: input?.status ?? "ENABLED", grants: (input?.grants ?? null) as never, config: (input?.config ?? null) as never },
    select: { id: true, status: true },
  });
}

