import "server-only";

import { prisma } from "@/lib/db/prisma";
import { createExplainabilityLog } from "@/modules/intelligence/explainability";

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Phase 9: human-in-the-loop orchestration suggestions.
// Nothing here executes workflows or mutates tasks without explicit human approval.
export async function generateOrchestrationSuggestions(teamId: string) {
  const now = new Date();
  const dayKey = utcDayKey(now);

  // Workload imbalance suggestion: if a single assignee has 2x median open items.
  const grouped = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
    _count: { _all: true },
  });

  const counts = grouped
    .filter((g) => g.assignedToId)
    .map((g) => ({ userId: g.assignedToId as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  if (counts.length < 2) return { createdCount: 0 };

  const top = counts[0]!;
  const median = counts[Math.floor(counts.length / 2)]?.count ?? 0;
  if (top.count < Math.max(6, median * 2)) return { createdCount: 0 };

  // Dedupe: one suggestion per day per type.
  const existing = await prisma.orchestrationSuggestion.findFirst({
    where: { teamId, type: "task.rebalance", createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    select: { id: true },
  });
  if (existing) return { createdCount: 0 };

  const trace = {
    rule: "phase9.orchestration.heuristics.v1",
    dayKey,
    type: "task.rebalance",
    topAssigneeId: top.userId,
    topCount: top.count,
    medianCount: median,
    assigneeCounts: counts.slice(0, 10),
    notes: "Suggestion only; requires human approval to execute any changes.",
  };
  const explainLogId = await createExplainabilityLog({ teamId, kind: "ORCHESTRATION", engine: "heuristic", trace });

  const suggestion = await prisma.orchestrationSuggestion.create({
    data: {
      teamId,
      type: "task.rebalance",
      title: "Rebalance workload",
      summary: "Workload is concentrated; suggest reassigning 1–2 items from the busiest assignee to available capacity.",
      payload: { action: "task.rebalance", fromUserId: top.userId, suggestedMoveCount: 2 } as never,
      requiresApproval: true,
      status: "PROPOSED",
      createdByUserId: null,
    },
    select: { id: true },
  });

  // Attach as an insight for surfacing in Telegram UI.
  await prisma.operationalInsight.create({
    data: {
      teamId,
      key: "orchestration.suggested_workload_rebalance",
      kind: "ORCHESTRATION",
      status: "OPEN",
      severity: "WARNING",
      score: 65,
      title: "Suggested: rebalance workload",
      summary: "Workload is concentrated on a small number of assignees. A small rebalance typically reduces delay and burnout risk.",
      recommendation: "Review the suggested reassignment and approve only if it doesn’t break ownership/priority constraints.",
      evidence: { suggestionId: suggestion.id, topAssigneeId: top.userId, topCount: top.count, medianCount: median } as never,
      dedupeKey: dayKey,
      explainLogId,
    },
  }).catch(() => {});

  return { createdCount: 1 };
}

