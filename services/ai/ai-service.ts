import "server-only";

import crypto from "crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";
import type { AIProvider, DailyDigestInput, ScoreStaffInput, SummarizeReportInput } from "@/lib/ai/provider";

const stubProvider: AIProvider = {
  id: "stub",
  async summarizeReport({ reportText }: SummarizeReportInput) {
    const lines = reportText.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines.slice(0, 6).join(" · ");
    return `Summary (stub): ${head || "No content"}`;
  },
  async scoreStaffPerformance({ signals }: ScoreStaffInput) {
    const score = Math.max(0, Math.min(100, Math.round(signals.reduce((a, s) => a + s.value, 0))));
    return { score, rationale: "Stub scoring; replace with provider implementation." };
  },
  async generateDailyDigest({ items, metrics }: DailyDigestInput) {
    const overdue = metrics?.overdueTasks ?? 0;
    const blocked = metrics?.blockedTasks ?? 0;
    const reportsToday = metrics?.reportsToday ?? 0;
    const missingReports = metrics?.missingReports ?? 0;
    const topSignals = items.slice(0, 5).map((item) => `- ${item.title}: ${item.body}`).join("\n");

    return [
      "Operating Pulse",
      `${reportsToday} reports filed today. ${overdue} overdue tasks and ${blocked} blocked tasks remain on the board.`,
      "",
      "Blockers",
      blocked > 0 ? `${blocked} blocked task${blocked === 1 ? "" : "s"} need owner follow-up.` : "No active blockers reported.",
      "",
      "Missed Actions",
      missingReports > 0
        ? `${missingReports} teammate${missingReports === 1 ? "" : "s"} still owe a daily report.`
        : "No missing daily reports detected.",
      "",
      "Team Notes",
      topSignals || "- No notable updates logged yet.",
      "",
      "Confidence",
      "0.62 - Stub operational digest based on current task and report signals.",
    ].join("\n");
  },
};

function getProvider(): AIProvider {
  switch (env.AI_PROVIDER) {
    case "stub":
    default:
      return stubProvider;
  }
}

export async function summarizeAndStore(teamId: string, reportId: string | null, text: string) {
  const provider = getProvider();
  const summary = await provider.summarizeReport({ reportText: text });
  const inputHash = crypto.createHash("sha256").update(text).digest("hex");

  await prisma.aIInsight.create({
    data: {
      teamId,
      reportId: reportId ?? undefined,
      type: "SUMMARY",
      provider: provider.id,
      model: null,
      inputHash,
      content: summary,
    },
  });

  return { summary, provider: provider.id };
}

function todayKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function getOrCreateDailyDigest(teamId: string, options?: { startOfTodayUtc?: Date }) {
  const key = todayKey();
  const existing = await prisma.aIInsight.findFirst({
    where: { teamId, type: "DAILY_DIGEST", inputHash: key },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true, provider: true },
  });
  if (existing) return { digest: existing.content, provider: existing.provider, createdAt: existing.createdAt };

  const provider = getProvider();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const today = new Date();
  const startOfTodayUtc =
    options?.startOfTodayUtc ??
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
  const [tasks, reports, overdueTasks, blockedTasks, activeMembers, todayReports] = await Promise.all([
    prisma.task.findMany({
      where: { teamId, archivedAt: null, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: { title: true, status: true },
    }),
    prisma.report.findMany({
      where: { teamId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { title: true, status: true },
    }),
    prisma.task.count({
      where: {
        teamId,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueAt: { lt: new Date() },
      },
    }),
    prisma.task.count({
      where: { teamId, archivedAt: null, status: "BLOCKED" },
    }),
    prisma.teamMember.count({
      where: { teamId, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } },
    }),
    prisma.report.count({
      where: { teamId, createdAt: { gte: startOfTodayUtc } },
    }),
  ]);

  const items: DailyDigestInput["items"] = [
    ...reports.map((r) => ({ title: `Report: ${r.title}`, body: r.status })),
    ...tasks.map((t) => ({ title: `Task: ${t.title}`, body: t.status })),
  ].slice(0, 18);

  const digest = await provider.generateDailyDigest({
    teamId,
    items,
    metrics: {
      overdueTasks,
      blockedTasks,
      reportsToday: todayReports,
      missingReports: Math.max(0, activeMembers - todayReports),
    },
  });

  const stored = await prisma.aIInsight.create({
    data: {
      teamId,
      type: "DAILY_DIGEST",
      provider: provider.id,
      model: null,
      inputHash: key,
      content: digest,
    },
    select: { content: true, createdAt: true, provider: true },
  });

  return { digest: stored.content, provider: stored.provider, createdAt: stored.createdAt };
}
