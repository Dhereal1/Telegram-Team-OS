import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { InsightRunStatus, InsightSeverity, InsightStatus, Prisma } from "@/lib/generated/prisma/client";

export async function startInsightRun(input: { teamId: string; kind: string }) {
  return prisma.insightRun.create({
    data: { teamId: input.teamId, kind: input.kind, status: "RUNNING" },
    select: { id: true, teamId: true, kind: true, status: true, startedAt: true },
  });
}

export async function finishInsightRun(input: { runId: string; status: InsightRunStatus; stats?: Prisma.InputJsonValue | null; lastError?: string | null }) {
  return prisma.insightRun.update({
    where: { id: input.runId },
    data: {
      status: input.status,
      stats: input.stats ?? undefined,
      lastError: input.lastError ?? undefined,
      finishedAt: new Date(),
    },
    select: { id: true, status: true },
  });
}

export async function upsertInsight(input: {
  teamId: string;
  key: string;
  dedupeKey: string;
  kind?: "OPERATIONAL" | "STRATEGIC" | "PREDICTION" | "RISK" | "ORCHESTRATION" | "SIMULATION";
  severity: InsightSeverity;
  score: number;
  title: string;
  summary: string;
  recommendation?: string | null;
  evidence?: Prisma.InputJsonValue | null;
  explainLogId?: string | null;
}) {
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  return prisma.operationalInsight.upsert({
    where: { teamId_key_dedupeKey: { teamId: input.teamId, key: input.key, dedupeKey: input.dedupeKey } },
    update: {
      kind: input.kind ?? undefined,
      severity: input.severity,
      score,
      title: input.title,
      summary: input.summary,
      recommendation: input.recommendation ?? undefined,
      evidence: input.evidence ?? undefined,
      explainLogId: input.explainLogId ?? undefined,
      status: "OPEN",
    },
    create: {
      teamId: input.teamId,
      key: input.key,
      dedupeKey: input.dedupeKey,
      kind: (input.kind ?? "OPERATIONAL") as never,
      severity: input.severity,
      score,
      title: input.title,
      summary: input.summary,
      recommendation: input.recommendation ?? undefined,
      evidence: input.evidence ?? undefined,
      explainLogId: input.explainLogId ?? undefined,
      status: "OPEN",
    },
    select: { id: true, key: true, severity: true, score: true, createdAt: true, updatedAt: true },
  });
}

export async function listOpenInsights(teamId: string, take = 20) {
  return prisma.operationalInsight.findMany({
    where: { teamId, status: "OPEN" },
    orderBy: [{ severity: "desc" }, { score: "desc" }, { createdAt: "desc" }],
    take,
    select: { id: true, key: true, severity: true, score: true, title: true, summary: true, recommendation: true, createdAt: true },
  });
}

export async function setInsightStatus(input: { teamId: string; insightId: string; status: InsightStatus }) {
  return prisma.operationalInsight.update({
    where: { id: input.insightId, teamId: input.teamId },
    data: { status: input.status },
    select: { id: true, status: true },
  });
}
