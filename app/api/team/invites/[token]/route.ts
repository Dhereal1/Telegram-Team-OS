import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { acceptInvite } from "@/services/team/invite-service";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const obs = obsStart(request, "/api/team/invites/[token]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    const { token } = await ctx.params;
    const result = await acceptInvite({ token, userId: session.userId });
    if (!result) throw new HttpError("Invite not found", 404, "NOT_FOUND");
    if (!result.ok) throw new HttpError(`Invite ${result.reason}`, 400, result.reason);
    await prisma.session.update({ where: { id: session.sessionId }, data: { teamId: result.teamId } });
    obsEnd(obs, 200);
    return jsonOk({ joined: true, teamId: result.teamId }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
