import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  const request = _request as Request;
  const obs = obsStart(request, "/api/intelligence/explainability/[id]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "explain.read" });

    const { id } = await ctx.params;
    const log = await prisma.explainabilityLog.findFirst({
      where: { id, teamId: session.teamId! },
      select: { id: true, kind: true, engine: true, model: true, inputHash: true, trace: true, createdAt: true },
    });
    obsEnd(obs, 200);
    return jsonOk({ log }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
