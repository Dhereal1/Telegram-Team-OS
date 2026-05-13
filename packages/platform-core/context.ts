import "server-only";

import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import type { PlatformContext } from "@/packages/platform-core/types";

export async function getPlatformContext(): Promise<PlatformContext> {
  const session = await requireApiSession();
  const teamId = session.teamId!;
  const installs = await prisma.workspaceAppInstall.findMany({
    where: { teamId },
    select: {
      status: true,
      grants: true,
      app: { select: { key: true } },
    },
  });

  return {
    teamId,
    userId: session.userId,
    roleKey: (session.roleKey ?? "STAFF") as PlatformContext["roleKey"],
    installedApps: installs.map((i) => ({
      key: i.app.key,
      status: i.status,
      grants: Array.isArray(i.grants) ? (i.grants as unknown[]).filter((x): x is string => typeof x === "string") : [],
    })),
  };
}

