import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiUserSession } from "@/lib/auth/api";
import { getDefaultTeamId } from "@/services/team/team-service";
import { listRecentActivity } from "@/services/activity/activity-service";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/activity");
  try {
    const session = await requireApiUserSession();
    obs.userId = session.userId;
    const teamId = session.teamId ?? (await getDefaultTeamId(session.userId));
    if (!teamId) throw new HttpError("No team selected", 400, "NO_TEAM");
    obs.teamId = teamId;
    const activity = await listRecentActivity(teamId, 15);
    obsEnd(obs, 200);
    return jsonOk({ activity }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
