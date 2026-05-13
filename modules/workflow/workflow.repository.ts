import "server-only";

import { prisma } from "@/lib/db/prisma";

function hasDomainEventTrigger(definition: unknown, eventName: string) {
  if (!definition || typeof definition !== "object") return false;
  const triggers = (definition as Record<string, unknown>)["triggers"];
  if (!Array.isArray(triggers)) return false;
  for (const t of triggers) {
    if (!t || typeof t !== "object") continue;
    const rec = t as Record<string, unknown>;
    if (rec["type"] === "domain_event" && rec["eventName"] === eventName) return true;
  }
  return false;
}

export async function listActiveWorkflowVersionsByEvent(teamId: string, eventName: string) {
  const rows = await prisma.workflowVersion.findMany({
    where: {
      isCurrent: true,
      workflow: { teamId, status: "ACTIVE" },
      // definition.triggers[*].eventName == eventName is JSON query; keep simple by filtering in code for now.
    },
    select: {
      id: true,
      version: true,
      definition: true,
      workflow: { select: { id: true, name: true, teamId: true, status: true } },
    },
  });

  return rows.filter((row) => {
    return hasDomainEventTrigger(row.definition, eventName);
  });
}

export async function createExecution(input: {
  teamId: string;
  workflowId: string;
  workflowVersionId: string;
  triggerEventId?: string | null;
}) {
  return prisma.workflowExecution.create({
    data: {
      teamId: input.teamId,
      workflowId: input.workflowId,
      workflowVersionId: input.workflowVersionId,
      triggerEventId: input.triggerEventId ?? null,
    },
    select: { id: true, teamId: true, status: true, startedAt: true },
  });
}

export async function appendExecutionLog(input: { executionId: string; level: "info" | "warn" | "error"; message: string; metadata?: unknown }) {
  return prisma.workflowLog.create({
    data: {
      executionId: input.executionId,
      level: input.level,
      message: input.message,
      metadata: (input.metadata ?? null) as never,
    },
    select: { id: true },
  });
}

export async function finishExecution(input: { executionId: string; status: "SUCCEEDED" | "FAILED" | "CANCELED"; lastError?: string | null }) {
  return prisma.workflowExecution.update({
    where: { id: input.executionId },
    data: {
      status: input.status,
      finishedAt: new Date(),
      lastError: input.lastError ?? undefined,
    },
    select: { id: true, status: true },
  });
}
