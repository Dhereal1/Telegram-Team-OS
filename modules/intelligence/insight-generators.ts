import "server-only";

import { prisma } from "@/lib/db/prisma";
import { clampScore, severityFromScore } from "@/modules/intelligence/scoring";

function utcDateKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function generateCoreOperationalInsights(teamId: string) {
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const dayKey = utcDateKey(now);

  const [overdueCount, blockedCount, dueTodayCount, reportsTodayCount, activeStaff, taskByAssignee] = await Promise.all([
    prisma.task.count({
      where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: now } },
    }),
    prisma.task.count({ where: { teamId, archivedAt: null, status: "BLOCKED" } }),
    prisma.task.count({ where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { gte: startOfTodayUtc } } }),
    prisma.report.count({ where: { teamId, createdAt: { gte: startOfTodayUtc } } }),
    prisma.teamMember.count({ where: { teamId, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } } }),
    prisma.task.groupBy({
      by: ["assignedToId"],
      where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
      _count: { _all: true },
    }),
  ]);

  const insights: Array<{
    key: string;
    dedupeKey: string;
    score: number;
    title: string;
    summary: string;
    recommendation?: string | null;
    evidence?: Record<string, unknown>;
  }> = [];

  if (overdueCount > 0) {
    const score = clampScore(20 + overdueCount * 10);
    insights.push({
      key: "risk.overdue_tasks",
      dedupeKey: dayKey,
      score,
      title: `${overdueCount} overdue task${overdueCount === 1 ? "" : "s"} need attention`,
      summary: "Overdue work is the strongest leading indicator of founder escalation and missed accountability.",
      recommendation: "Triage top 3 overdue tasks: clarify owner, unblock, or descope. Use Telegram to request an update.",
      evidence: { overdueCount },
    });
  }

  if (blockedCount > 0) {
    const score = clampScore(15 + blockedCount * 12);
    insights.push({
      key: "bottleneck.blocked_tasks",
      dedupeKey: dayKey,
      score,
      title: `${blockedCount} blocked item${blockedCount === 1 ? "" : "s"} slowing execution`,
      summary: "Blocked tasks accumulate when approvals, dependencies, or unclear ownership prevent progress.",
      recommendation: "Identify the blocker owner and request a 1-sentence unblock plan + ETA.",
      evidence: { blockedCount },
    });
  }

  const missingReports = Math.max(0, activeStaff - reportsTodayCount);
  if (missingReports > 0) {
    const score = clampScore(10 + missingReports * 10);
    insights.push({
      key: "accountability.missed_reports",
      dedupeKey: dayKey,
      score,
      title: `${missingReports} teammate${missingReports === 1 ? "" : "s"} still owe a daily report`,
      summary: "Missing daily closeouts correlate with missed deadlines and silent blockers.",
      recommendation: "Trigger a report reminder and ask for blockers in one message.",
      evidence: { missingReports, activeStaff, reportsTodayCount },
    });
  }

  // Workload imbalance: count spread across assignees.
  const counts = taskByAssignee
    .map((r) => r._count._all)
    .sort((a, b) => b - a);
  if (counts.length >= 2) {
    const top = counts[0] ?? 0;
    const median = counts[Math.floor(counts.length / 2)] ?? 0;
    if (top >= Math.max(5, median * 2)) {
      const score = clampScore(20 + (top - median) * 6);
      insights.push({
        key: "workload.imbalance",
        dedupeKey: dayKey,
        score,
        title: "Workload is concentrated on a few people",
        summary: "A high task concentration usually predicts delays, burnout risk, and unstable throughput.",
        recommendation: "Rebalance tasks: reassign 1-2 items from the busiest teammate to idle capacity.",
        evidence: { assigneeCounts: taskByAssignee },
      });
    }
  }

  // Operational bottleneck hint: lots due today + overdue.
  if (dueTodayCount > 8 && overdueCount > 0) {
    const score = clampScore(30 + dueTodayCount * 4 + overdueCount * 6);
    insights.push({
      key: "risk.execution_overload_today",
      dedupeKey: dayKey,
      score,
      title: "Today’s board is overloaded",
      summary: "A large due-today surface area with existing overdue items increases missed commitments.",
      recommendation: "Pick a single focus lane for the next 4 hours and postpone low-value items.",
      evidence: { dueTodayCount, overdueCount },
    });
  }

  return insights.map((i) => ({
    ...i,
    severity: severityFromScore(i.score),
  }));
}

