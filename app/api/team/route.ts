import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/team");
  try {
    const session = await requireApiSession();
    const teamId = session.teamId!;
    obs.userId = session.userId;
    obs.teamId = teamId;

    const members = await prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      select: {
        id: true,
        title: true,
        role: { select: { key: true, name: true } },
        user: { select: { id: true, username: true, firstName: true, lastName: true, photoUrl: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    obsEnd(obs, 200);
    return jsonOk({ members }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
