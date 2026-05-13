import "server-only";

import { startInsightRun, finishInsightRun, upsertInsight } from "@/modules/intelligence/insights.repository";
import { generateCoreOperationalInsights } from "@/modules/intelligence/insight-generators";
import { enqueueTelegramNotification } from "@/modules/notifications/notifications.service";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function generateDailyTeamInsights(teamId: string) {
  const run = await startInsightRun({ teamId, kind: "daily" });
  try {
    const insights = await generateCoreOperationalInsights(teamId);
    const persisted = await Promise.all(
      insights.map((i) =>
        upsertInsight({
          teamId,
          key: i.key,
          dedupeKey: i.dedupeKey,
          severity: i.severity,
          score: i.score,
          title: i.title,
          summary: i.summary,
          recommendation: i.recommendation ?? null,
          evidence: (i.evidence ?? null) as Prisma.InputJsonValue | null,
        }),
      ),
    );

    await finishInsightRun({
      runId: run.id,
      status: "SUCCEEDED",
      stats: { generated: insights.length, persisted: persisted.length } as Prisma.InputJsonValue,
    });

    return { runId: run.id, insights: persisted };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Insight generation failed";
    await finishInsightRun({ runId: run.id, status: "FAILED", lastError: msg });
    throw e;
  }
}

export async function maybeNotifyFounderDigest(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, telegramChatId: true, name: true },
  });
  if (!team?.telegramChatId) return null;

  const open = await prisma.operationalInsight.findMany({
    where: { teamId, status: "OPEN" },
    orderBy: [{ severity: "desc" }, { score: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: { severity: true, score: true, title: true },
  });
  if (!open.length) return null;

  const lines = open.map((i) => `• <b>${i.title}</b> <i>(${i.severity}, ${i.score})</i>`).join("\n");
  const text = `<b>TeamOS Operational Digest</b>\n${team.name}\n\n${lines}\n\n<i>Open the Mini App for details.</i>`;

  return enqueueTelegramNotification({
    teamId,
    chatId: String(team.telegramChatId),
    text,
    dedupeKey: `digest:${new Date().toISOString().slice(0, 10)}`,
    priority: "NORMAL",
  });
}
