import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { calculateTeamScores } from "@/lib/scores/calculate-team-scores";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/team/scores");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    const url = new URL(request.url);
    const raw = url.searchParams.get("window");
    const windowDays = Math.max(1, Math.min(30, raw ? Number(raw) : 7)) || 7;

    const scores = await calculateTeamScores(session.teamId!, windowDays);
    obsEnd(obs, 200);
    return jsonOk(
      { scores, generatedAt: new Date().toISOString(), windowDays },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

