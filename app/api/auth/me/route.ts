import { jsonOk } from "@/lib/utils/api";
import { getServerSession } from "@/lib/auth/get-server-session";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/auth/me");
  try {
    const session = await getServerSession();
    obs.userId = session?.userId;
    obs.teamId = session?.teamId ?? null;
    obsEnd(obs, 200);
    return jsonOk({ session }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    return jsonOk({ session: null }, { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
