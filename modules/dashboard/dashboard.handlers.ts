import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { getDashboard } from "@/services/dashboard/dashboard-service";

export const dynamic = "force-dynamic";

export const dashboardGET = withApi(async (request) => {
  const obs = obsStart(request, "/api/dashboard");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const dashboard = await getDashboard(session.teamId!, {
      userId: session.userId,
      roleKey: session.roleKey ?? null,
    });
    obsEnd(obs, 200);
    return jsonOk({ dashboard }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

