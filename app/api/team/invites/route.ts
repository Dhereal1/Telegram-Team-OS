import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { z } from "zod";
import { createInvite } from "@/services/team/invite-service";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { beginIdempotency, finishIdempotency, getIdempotencyResult } from "@/lib/idempotency";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

const createInviteSchema = z.object({
  roleKey: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/team/invites");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");
    const invites = await prisma.teamInvite.findMany({
      where: { teamId: session.teamId!, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, token: true, roleKey: true, expiresAt: true, createdAt: true },
    });
    obsEnd(obs, 200);
    return jsonOk({ invites }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function POST(request: Request) {
  const obs = obsStart(request, "/api/team/invites");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });

    const existing = await getIdempotencyResult<{ invite: unknown }>({ request, teamId: session.teamId!, route: "/api/team/invites:POST" });
    if (existing) {
      obsEnd(obs, 200, { idempotent: true });
      return jsonOk(existing, { headers: { "x-request-id": obs.requestId } });
    }

    const idem = await beginIdempotency({ request, teamId: session.teamId!, route: "/api/team/invites:POST" });
    const body = createInviteSchema.parse(await request.json());
    const invite = await createInvite({
      teamId: session.teamId!,
      createdById: session.userId,
      roleKey: body.roleKey,
    });
    await finishIdempotency({ redisKey: idem?.redisKey ?? null, result: { invite } });
    obsEnd(obs, 201);
    return jsonOk({ invite }, { status: 201, headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
