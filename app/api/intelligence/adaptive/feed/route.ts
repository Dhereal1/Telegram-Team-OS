import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

// Phase 9: Telegram-first adaptive feed.
// Goal: reduce noise; highlight high-signal insights and actionable suggestions.
export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/adaptive/feed");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "adaptive.read" });

    const teamId = session.teamId!;

    const [insights, suggestions] = await Promise.all([
      prisma.operationalInsight.findMany({
        where: { teamId, status: "OPEN" },
        orderBy: [{ severity: "desc" }, { score: "desc" }, { createdAt: "desc" }],
        take: 12,
        select: { id: true, kind: true, severity: true, score: true, title: true, summary: true, recommendation: true, createdAt: true, explainLogId: true },
      }),
      prisma.orchestrationSuggestion.findMany({
        where: { teamId, status: "PROPOSED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, title: true, summary: true, requiresApproval: true, status: true, createdAt: true },
      }),
    ]);

    obsEnd(obs, 200, { insights: insights.length, suggestions: suggestions.length });
    return jsonOk(
      {
        feed: {
          insights,
          suggestions,
          generatedAt: new Date().toISOString(),
        },
      },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
