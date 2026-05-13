import "server-only";

import { prisma } from "@/lib/db/prisma";
import { logSecurityEvent } from "@/modules/security/security-events.service";

export type PolicyDecision =
  | { ok: true }
  | { ok: false; reason: string; requiresApproval: boolean };

// Minimal Phase 7 policy engine:
// - A policy is keyed (string) and definition contains { effect: "allow"|"deny"|"require_approval" }.
// - Later we can add matchers, conditions, scopes, etc.
export async function evaluatePolicy(input: {
  teamId: string;
  userId: string;
  key: string;
  context?: Record<string, unknown>;
}): Promise<PolicyDecision> {
  const policy = await prisma.policy.findUnique({
    where: { teamId_key: { teamId: input.teamId, key: input.key } },
    select: { status: true, definition: true },
  });
  if (!policy || policy.status !== "ACTIVE") return { ok: true };

  const def = policy.definition as unknown;
  const effect =
    def && typeof def === "object"
      ? ((def as Record<string, unknown>)["effect"] as string | undefined)
      : undefined;

  if (effect === "deny") {
    await logSecurityEvent({
      teamId: input.teamId,
      userId: input.userId,
      severity: "WARNING",
      type: "policy.denied",
      message: `Policy denied: ${input.key}`,
      metadata: { key: input.key, context: input.context ?? {} },
    });
    return { ok: false, reason: "Denied by policy", requiresApproval: false };
  }

  if (effect === "require_approval") {
    await logSecurityEvent({
      teamId: input.teamId,
      userId: input.userId,
      severity: "INFO",
      type: "policy.requires_approval",
      message: `Policy requires approval: ${input.key}`,
      metadata: { key: input.key, context: input.context ?? {} },
    });
    return { ok: false, reason: "Approval required by policy", requiresApproval: true };
  }

  return { ok: true };
}

