import "@/modules/bootstrap/server";

import { z } from "zod";
import { withApi, jsonErr, jsonOk, parseJson } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { runCapacityScenario } from "@/modules/simulation/simulation.service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/simulation/runs");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "simulation.read" });

    const runs = await prisma.simulationRun.findMany({
      where: { teamId: session.teamId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, status: true, inputs: true, results: true, lastError: true, explainLogId: true, createdAt: true, finishedAt: true },
    });
    obsEnd(obs, 200, { count: runs.length });
    return jsonOk({ runs }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});

const runSchema = z.object({
  type: z.enum(["scenario.capacity"]).default("scenario.capacity"),
  horizonDays: z.number().int().min(1).max(90),
  additionalTasks: z.number().int().min(0).max(500).optional(),
});

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/simulation/runs");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "simulation.write" });

    const body = await parseJson(request, runSchema);
    if (body.type === "scenario.capacity") {
      const run = await runCapacityScenario({
        teamId: session.teamId!,
        createdByUserId: session.userId,
        horizonDays: body.horizonDays,
        additionalTasks: body.additionalTasks,
      });
      obsEnd(obs, 200);
      return jsonOk({ run }, { headers: { "x-request-id": obs.requestId } });
    }

    obsEnd(obs, 400);
    return jsonErr("Unknown simulation type", { status: 400, code: "VALIDATION_ERROR", headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
