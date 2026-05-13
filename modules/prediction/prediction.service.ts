import "server-only";

import { prisma } from "@/lib/db/prisma";
import { createExplainabilityLog } from "@/modules/intelligence/explainability";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Phase 9: heuristic predictions (transparent, auditable). No autonomous actions.
export async function generateTeamPredictionSignals(teamId: string) {
  const now = new Date();
  const dayKey = utcDayKey(now);

  // Aggregate open load per user.
  const rows = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, assignedToId: { not: null } },
    _count: { _all: true },
  });

  const overdueByUser = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, assignedToId: { not: null }, dueAt: { lt: now } },
    _count: { _all: true },
  });

  const overdueMap = new Map<string, number>();
  for (const r of overdueByUser) if (r.assignedToId) overdueMap.set(r.assignedToId, r._count._all);

  const created: Array<{ id: string }> = [];
  for (const r of rows) {
    const userId = r.assignedToId;
    if (!userId) continue;
    const open = r._count._all;
    const overdue = overdueMap.get(userId) ?? 0;

    // Burnout risk proxy: open tasks + overdue intensity.
    const probability = clamp01(open >= 12 ? 0.65 + (open - 12) * 0.03 + overdue * 0.04 : 0.05 + open * 0.03 + overdue * 0.05);
    if (probability < 0.35) continue;

    const recent = await prisma.predictionSignal.findFirst({
      where: { teamId, kind: "BURNOUT_RISK", userId, createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) } },
      select: { id: true },
    });
    if (recent) continue;

    const trace = {
      kind: "BURNOUT_RISK",
      rule: "phase9.prediction.heuristics.v1",
      dayKey,
      openTasks: open,
      overdueTasks: overdue,
      probability,
      horizonDays: 7,
      notes: "Heuristic estimate based on open load and overdue pressure; requires human review.",
    };
    const explainLogId = await createExplainabilityLog({ teamId, kind: "PREDICTION", engine: "heuristic", trace });

    const row = await prisma.predictionSignal.create({
      data: {
        teamId,
        kind: "BURNOUT_RISK",
        userId,
        probability,
        horizonDays: 7,
        confidence: 0.55,
        factors: { openTasks: open, overdueTasks: overdue } as never,
        explainLogId,
      },
      select: { id: true },
    });
    created.push(row);
  }

  return { dayKey, createdCount: created.length };
}
