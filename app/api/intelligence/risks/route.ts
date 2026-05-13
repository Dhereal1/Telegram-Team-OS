import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/risks");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "risks.read" });

    const risks = await prisma.riskSignal.findMany({
      where: { teamId: session.teamId! },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { id: true, type: true, severity: true, title: true, summary: true, mitigation: true, evidence: true, explainLogId: true, createdAt: true },
    });
    obsEnd(obs, 200, { count: risks.length });
    return jsonOk({ risks }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
