import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { generateStrategicTeamInsights } from "@/modules/intelligence/strategic-intelligence.service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/intelligence/run/strategic");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");
    await enforceRateLimit({ request, preset: "intelligence", identity: `u:${session.userId}`, key: "strategic.run" });

    const res = await generateStrategicTeamInsights(session.teamId!);
    obsEnd(obs, 200);
    return jsonOk(res, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
