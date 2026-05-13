import "@/modules/bootstrap/server";

import { z } from "zod";
import { withApi, jsonOk, parseJson } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/orchestration/suggestions");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "orchestration.read" });

    const suggestions = await prisma.orchestrationSuggestion.findMany({
      where: { teamId: session.teamId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, title: true, summary: true, payload: true, requiresApproval: true, status: true, createdAt: true, decidedAt: true },
    });
    obsEnd(obs, 200, { count: suggestions.length });
    return jsonOk({ suggestions }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});

const decideSchema = z.object({
  suggestionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "CANCELED"]),
});

export const PATCH = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/orchestration/suggestions");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "orchestration.write" });

    const body = await parseJson(request, decideSchema);
    const updated = await prisma.orchestrationSuggestion.update({
      where: { id: body.suggestionId, teamId: session.teamId! },
      data: { status: body.decision as never, decidedByUserId: session.userId, decidedAt: new Date() },
      select: { id: true, status: true, decidedAt: true },
    });
    obsEnd(obs, 200);
    return jsonOk({ suggestion: updated }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
