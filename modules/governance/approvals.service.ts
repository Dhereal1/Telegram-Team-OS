import "server-only";

import { prisma } from "@/lib/db/prisma";
import { logSecurityEvent } from "@/modules/security/security-events.service";

export async function requestApproval(input: {
  teamId: string;
  createdById: string;
  entityType: string;
  entityId: string;
  actionKey: string;
  reason?: string | null;
  payload?: unknown;
}) {
  const req = await prisma.approvalRequest.create({
    data: {
      teamId: input.teamId,
      createdById: input.createdById,
      entityType: input.entityType,
      entityId: input.entityId,
      actionKey: input.actionKey,
      reason: input.reason ?? null,
      payload: (input.payload ?? null) as never,
      status: "PENDING",
    },
    select: { id: true, status: true },
  });

  await logSecurityEvent({
    teamId: input.teamId,
    userId: input.createdById,
    severity: "INFO",
    type: "approval.requested",
    message: `Approval requested for ${input.entityType}:${input.entityId} (${input.actionKey})`,
    metadata: { approvalId: req.id },
  });

  return req;
}

export async function getApprovalDecision(teamId: string, entityType: string, entityId: string, actionKey: string) {
  return prisma.approvalRequest.findFirst({
    where: { teamId, entityType, entityId, actionKey, status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { decidedAt: "desc" },
    select: { id: true, status: true, decidedAt: true },
  });
}

