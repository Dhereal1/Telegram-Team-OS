import "server-only";

import { prisma } from "@/lib/db/prisma";
import { clampScore, severityFromScore } from "@/modules/intelligence/scoring";
import { createExplainabilityLog } from "@/modules/intelligence/explainability";
import { upsertInsight } from "@/modules/intelligence/insights.repository";
import type { Prisma } from "@/lib/generated/prisma/client";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function riskSeverityFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 85) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

// Phase 9: auditable risk signals derived from operational state.
export async function generateTeamRiskSignals(teamId: string) {
  const now = new Date();
  const dedupe = dayKey(now);

  const taskByAssignee = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, assignedToId: { not: null } },
    _count: { _all: true },
  });

  const assigneeCounts = taskByAssignee
    .map((r) => ({ assignedToId: r.assignedToId, count: r._count._all }))
    .filter((r) => r.assignedToId && r.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalAssigned = assigneeCounts.reduce((a, r) => a + r.count, 0);
  const created: Array<{ id: string }> = [];

  if (assigneeCounts.length && totalAssigned >= 10) {
    const top = assigneeCounts[0]!;
    const share = totalAssigned > 0 ? top.count / totalAssigned : 0;
    if (share >= 0.55) {
      const recent = await prisma.riskSignal.findFirst({
        where: { teamId, type: "key_person_exposure", createdAt: { gte: new Date(now.getTime() - 22 * 60 * 60 * 1000) } },
        select: { id: true },
      });
      if (recent) return { createdCount: 0 };

      const score = clampScore(30 + Math.round(share * 90));
      const explainLogId = await createExplainabilityLog({
        teamId,
        kind: "RISK",
        engine: "heuristic",
        trace: { rule: "phase9.risk.heuristics.v1", type: "key_person_exposure", totalAssigned, topAssigneeId: top.assignedToId, topCount: top.count, share, score },
      });

      const risk = await prisma.riskSignal.create({
        data: {
          teamId,
          type: "key_person_exposure",
          severity: riskSeverityFromScore(score),
          title: "Key-person exposure detected",
          summary: "A majority of active work is concentrated on a single assignee, increasing fragility and delay risk if they stall or become unavailable.",
          mitigation: "Reassign 1-2 tasks to a secondary owner and add a backup reviewer for the critical lane.",
          evidence: { totalAssigned, topAssigneeId: top.assignedToId, topCount: top.count, share, assigneeCounts } as never,
          explainLogId,
        },
        select: { id: true },
      });
      created.push(risk);

      await upsertInsight({
        teamId,
        key: "risk.key_person_exposure",
        dedupeKey: dedupe,
        kind: "RISK",
        severity: severityFromScore(score),
        score,
        title: "Key-person exposure risk is high",
        summary: "Most active work is concentrated on one assignee, which increases fragility and slows coordination when escalations happen.",
        recommendation: "Introduce redundancy: split ownership, assign backups, and reduce the single point-of-failure lane.",
        evidence: ({ totalAssigned, topAssigneeId: top.assignedToId, topCount: top.count, share } satisfies Record<string, unknown>) as Prisma.InputJsonValue,
        explainLogId,
      });
    }
  }

  return { createdCount: created.length };
}
