import "@/modules/bootstrap/server";

import { z } from "zod";
import { withApi, jsonOk, parseJson } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/insights");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "read" });

    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    const take = Math.min(Math.max(Number(url.searchParams.get("take") ?? "20"), 1), 100);

    const insights = await prisma.operationalInsight.findMany({
      where: {
        teamId: session.teamId!,
        status: "OPEN",
        ...(kind ? { kind: kind as never } : {}),
      },
      orderBy: [{ severity: "desc" }, { score: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        key: true,
        kind: true,
        severity: true,
        score: true,
        title: true,
        summary: true,
        recommendation: true,
        evidence: true,
        createdAt: true,
        explainLogId: true,
      },
    });

    obsEnd(obs, 200, { count: insights.length });
    return jsonOk({ insights }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});

const patchSchema = z.object({
  insightId: z.string().min(1),
  status: z.enum(["DISMISSED", "RESOLVED"]),
});

export const PATCH = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/insights");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "write" });

    const body = await parseJson(request, patchSchema);
    const updated = await prisma.operationalInsight.update({
      where: { id: body.insightId, teamId: session.teamId! },
      data: { status: body.status },
      select: { id: true, status: true },
    });
    obsEnd(obs, 200);
    return jsonOk({ insight: updated }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
