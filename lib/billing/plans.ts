import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { PlanTier } from "@/lib/generated/prisma/client";

type PlanLimits = {
  maxMembers: number;
  maxTasksPerMonth: number;
  maxReportsPerMonth: number;
  webhooks: boolean;
  aiDigest: boolean;
};

export const PLAN_LIMITS = {
  FREE: { maxMembers: 3, maxTasksPerMonth: 50, maxReportsPerMonth: 30, webhooks: false, aiDigest: false },
  PRO: { maxMembers: 20, maxTasksPerMonth: 500, maxReportsPerMonth: 500, webhooks: true, aiDigest: true },
  BUSINESS: { maxMembers: 999, maxTasksPerMonth: 9999, maxReportsPerMonth: 9999, webhooks: true, aiDigest: true },
} as const satisfies Record<PlanTier, PlanLimits>;

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.FREE;
}

function upgradeHint(tier: PlanTier) {
  return tier === "FREE" ? "Upgrade to PRO." : "Upgrade your plan.";
}

export async function checkLimit(
  teamId: string,
  resource: "tasks" | "reports" | "invites" | "members",
): Promise<{ allowed: boolean; reason?: string }> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      planTier: true,
      usageTasksCount: true,
      usageReportsCount: true,
      usageInvitesCount: true,
      usageWindowStart: true,
    },
  });
  if (!team) return { allowed: false, reason: "Workspace not found." };

  let usageTasks = team.usageTasksCount;
  let usageReports = team.usageReportsCount;
  let usageInvites = team.usageInvitesCount;
  let windowStart = team.usageWindowStart;

  if (windowStart && Date.now() - windowStart.getTime() > 1000 * 60 * 60 * 24 * 30) {
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { usageTasksCount: 0, usageReportsCount: 0, usageInvitesCount: 0, usageWindowStart: new Date() },
      select: { usageTasksCount: true, usageReportsCount: true, usageInvitesCount: true, usageWindowStart: true },
    });
    usageTasks = updated.usageTasksCount;
    usageReports = updated.usageReportsCount;
    usageInvites = updated.usageInvitesCount;
    windowStart = updated.usageWindowStart;
  }

  const limits = getPlanLimits(team.planTier);

  if (resource === "members") {
    const activeMembers = await prisma.teamMember.count({ where: { teamId, isActive: true, status: "ACTIVE" } });
    if (activeMembers >= limits.maxMembers) {
      return {
        allowed: false,
        reason: `You have reached the members limit on the ${team.planTier} plan. ${upgradeHint(team.planTier)}`,
      };
    }
    return { allowed: true };
  }

  if (resource === "tasks") {
    if (usageTasks >= limits.maxTasksPerMonth) {
      return {
        allowed: false,
        reason: `You have reached the tasks limit on the ${team.planTier} plan. ${upgradeHint(team.planTier)}`,
      };
    }
    return { allowed: true };
  }

  if (resource === "reports") {
    if (usageReports >= limits.maxReportsPerMonth) {
      return {
        allowed: false,
        reason: `You have reached the reports limit on the ${team.planTier} plan. ${upgradeHint(team.planTier)}`,
      };
    }
    return { allowed: true };
  }

  if (usageInvites >= limits.maxMembers) {
    // Reuse maxMembers as a soft invite cap for the month.
    return {
      allowed: false,
      reason: `You have reached the invites limit on the ${team.planTier} plan. ${upgradeHint(team.planTier)}`,
    };
  }

  return { allowed: true };
}
