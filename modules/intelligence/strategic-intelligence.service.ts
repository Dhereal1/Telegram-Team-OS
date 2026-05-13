import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { clampScore, severityFromScore } from "@/modules/intelligence/scoring";
import { startInsightRun, finishInsightRun, upsertInsight } from "@/modules/intelligence/insights.repository";
import { logSecurityEvent } from "@/modules/security/security-events.service";
import { createExplainabilityLog } from "@/modules/intelligence/explainability";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function generateStrategicTeamInsights(teamId: string) {
  const run = await startInsightRun({ teamId, kind: "strategic_daily" });
  try {
    const now = new Date();
    const msDay = 24 * 60 * 60 * 1000;
    const start7 = new Date(now.getTime() - 7 * msDay);
    const start14 = new Date(now.getTime() - 14 * msDay);

    const [completed7, completedPrev7, created7, createdPrev7, overdueNow, blockedNow, activeStaff, taskByAssignee] = await Promise.all([
      prisma.task.count({ where: { teamId, completedAt: { gte: start7 }, archivedAt: null } }),
      prisma.task.count({ where: { teamId, completedAt: { gte: start14, lt: start7 }, archivedAt: null } }),
      prisma.task.count({ where: { teamId, createdAt: { gte: start7 }, archivedAt: null } }),
      prisma.task.count({ where: { teamId, createdAt: { gte: start14, lt: start7 }, archivedAt: null } }),
      prisma.task.count({ where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: now } } }),
      prisma.task.count({ where: { teamId, archivedAt: null, status: "BLOCKED" } }),
      prisma.teamMember.count({ where: { teamId, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } } }),
      prisma.task.groupBy({
        by: ["assignedToId"],
        where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, assignedToId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const insights: Array<{
      key: string;
      score: number;
      title: string;
      summary: string;
      recommendation?: string | null;
      evidence?: Record<string, unknown>;
      kind: "STRATEGIC";
    }> = [];

    // Throughput decline heuristic.
    if (completedPrev7 >= 5) {
      const ratio = completedPrev7 > 0 ? completed7 / completedPrev7 : 1;
      if (ratio <= 0.7 && created7 >= Math.max(5, createdPrev7 - 2)) {
        const score = clampScore(35 + Math.round((1 - ratio) * 60));
        insights.push({
          kind: "STRATEGIC",
          key: "strategic.throughput_decline",
          score,
          title: "Execution throughput is declining",
          summary: "Completed work dropped versus the prior week while intake stayed similar, a common early sign of hidden blockers or coordination debt.",
          recommendation: "Run a 15-minute unblock triage: identify top 3 blocked/overdue lanes and assign a single owner to clear dependencies.",
          evidence: { completed7, completedPrev7, created7, createdPrev7, ratio },
        });
      }
    }

    // Load vs capacity (overload forecasting proxy).
    if (activeStaff > 0) {
      const activeLoad = overdueNow + blockedNow;
      if (activeLoad >= activeStaff * 2) {
        const score = clampScore(30 + Math.round((activeLoad / activeStaff) * 8));
        insights.push({
          kind: "STRATEGIC",
          key: "strategic.capacity_pressure",
          score,
          title: "Capacity pressure is rising",
          summary: "Overdue + blocked surface area is large relative to active staff, increasing delays and escalation risk.",
          recommendation: "Reduce WIP: pause non-critical tasks, split large items, and re-assign blockers to the fastest resolver.",
          evidence: { activeStaff, overdueNow, blockedNow, activeLoad },
        });
      }
    }

    // Assignee concentration / key-person risk proxy.
    const assigneeCounts = taskByAssignee
      .map((r) => ({ assignedToId: r.assignedToId, count: r._count._all }))
      .filter((r) => r.assignedToId && r.count > 0)
      .sort((a, b) => b.count - a.count);
    const totalAssigned = assigneeCounts.reduce((a, r) => a + r.count, 0);
    if (assigneeCounts.length >= 1 && totalAssigned >= 10) {
      const top = assigneeCounts[0]!;
      const share = totalAssigned > 0 ? top.count / totalAssigned : 0;
      if (share >= 0.5) {
        const score = clampScore(25 + Math.round(share * 90));
        insights.push({
          kind: "STRATEGIC",
          key: "strategic.key_person_load",
          score,
          title: "Workload is concentrated on one person",
          summary: "A single-person dependency increases fragility and delays; it also correlates with burnout risk and stalled execution if unavailable.",
          recommendation: "Create redundancy: reassign 1-2 tasks to a second owner and add a backup reviewer for the busiest lane.",
          evidence: { totalAssigned, topAssigneeId: top.assignedToId, topCount: top.count, share, assigneeCounts },
        });
      }
    }

    const dedupe = dayKey(now);
    const persisted = await Promise.all(
      insights.map(async (i) => {
        const explainLogId = await createExplainabilityLog({
          teamId,
          kind: "RECOMMENDATION",
          engine: "heuristic",
          model: null,
          trace: {
            kind: i.kind,
            key: i.key,
            metrics: i.evidence ?? {},
            rule: "phase9.strategic.heuristics.v1",
            generatedAt: now.toISOString(),
          },
        });
        return upsertInsight({
          teamId,
          key: i.key,
          dedupeKey: dedupe,
          kind: "STRATEGIC",
          severity: severityFromScore(i.score),
          score: i.score,
          title: i.title,
          summary: i.summary,
          recommendation: i.recommendation ?? null,
          evidence: (i.evidence ?? null) as Prisma.InputJsonValue | null,
          explainLogId,
        });
      }),
    );

    await finishInsightRun({
      runId: run.id,
      status: "SUCCEEDED",
      stats: { generated: insights.length, persisted: persisted.length } as Prisma.InputJsonValue,
    });

    if (insights.some((i) => i.score >= 70)) {
      void logSecurityEvent({
        teamId,
        severity: "INFO",
        type: "intelligence.strategic.insight.high",
        message: "High-severity strategic insight generated",
        metadata: { runId: run.id, count: insights.length, top: insights.sort((a, b) => b.score - a.score)[0]?.key ?? null },
      }).catch(() => {});
    }

    return { runId: run.id, insights: persisted };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Strategic insight generation failed";
    await finishInsightRun({ runId: run.id, status: "FAILED", lastError: msg });
    throw e;
  }
}
