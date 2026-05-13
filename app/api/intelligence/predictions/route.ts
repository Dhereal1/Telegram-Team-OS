import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/predictions");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "predictions.read" });

    const signals = await prisma.predictionSignal.findMany({
      where: { teamId: session.teamId! },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, kind: true, userId: true, workflowId: true, taskId: true, probability: true, horizonDays: true, confidence: true, factors: true, explainLogId: true, createdAt: true },
    });
    obsEnd(obs, 200, { count: signals.length });
    return jsonOk({ signals }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
