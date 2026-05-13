import "server-only";

import { prisma } from "@/lib/db/prisma";

export type BillingUsageKey = "tasks" | "reports" | "invites";

export async function recordUsage(input: { teamId: string; key: BillingUsageKey; by?: number }) {
  const by = input.by ?? 1;

  if (input.key === "tasks") {
    await prisma.team.update({
      where: { id: input.teamId },
      data: { usageTasksCount: { increment: by } },
      select: { id: true },
    });
    return;
  }

  if (input.key === "reports") {
    await prisma.team.update({
      where: { id: input.teamId },
      data: { usageReportsCount: { increment: by } },
      select: { id: true },
    });
    return;
  }

  await prisma.team.update({
    where: { id: input.teamId },
    data: { usageInvitesCount: { increment: by } },
    select: { id: true },
  });
}

export async function getTeamBillingMeta(teamId: string) {
  const select = {
    id: true,
    planTier: true,
    planStartedAt: true,
    billingProvider: true,
    billingCustomerId: true,
    billingStatus: true,
    usageWindowStart: true,
    usageTasksCount: true,
    usageReportsCount: true,
    usageInvitesCount: true,
  } as const;
  return prisma.team.findUnique({
    where: { id: teamId },
    select: select as unknown as never,
  });
}

export function planGuard(input: { teamId: string; action: string }) {
  // Foundation-only: no paywall logic in Phase 1.
  return { ok: true as const, teamId: input.teamId, action: input.action };
}
