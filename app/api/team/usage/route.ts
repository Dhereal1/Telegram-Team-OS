import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { prisma } from "@/lib/db/prisma";
import { getPlanLimits } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/team/usage");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    const team = await prisma.team.findUnique({
      where: { id: session.teamId! },
      select: { planTier: true, usageTasksCount: true, usageReportsCount: true, usageWindowStart: true },
    });
    if (!team) throw new HttpError("Not found", 404, "NOT_FOUND");

    const members = await prisma.teamMember.count({ where: { teamId: session.teamId!, isActive: true, status: "ACTIVE" } });
    const limits = getPlanLimits(team.planTier);

    obsEnd(obs, 200);
    return jsonOk(
      {
        planTier: team.planTier,
        limits,
        usage: { tasks: team.usageTasksCount, reports: team.usageReportsCount, members },
        windowStart: team.usageWindowStart,
      },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

