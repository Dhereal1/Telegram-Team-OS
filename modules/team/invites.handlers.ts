import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { enforceRateLimit } from "@/lib/ratelimit";
import { beginIdempotency, finishIdempotency, getIdempotencyResult } from "@/lib/idempotency";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { z } from "zod";
import { HttpError } from "@/packages/core/http-error";
import * as invitesService from "@/modules/team/invites.service";
import * as invitesRepo from "@/modules/team/invites.repository";

const createInviteSchema = z.object({
  roleKey: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

export const invitesGET = withApi(async (request) => {
  const obs = obsStart(request, "/api/team/invites");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "ADMIN");
    const invites = await invitesRepo.listActiveInvites(session.teamId!);
    obsEnd(obs, 200);
    return jsonOk({ invites }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const invitesPOST = withApi(async (request) => {
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
    const invite = await invitesService.createInvite({ teamId: session.teamId!, createdById: session.userId, roleKey: body.roleKey });
    await finishIdempotency({ redisKey: idem?.redisKey ?? null, result: { invite } });
    obsEnd(obs, 201);
    return jsonOk({ invite }, { status: 201, headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const inviteTokenPOST = withApi(async (request, ctx: { params: Promise<{ token: string }> }) => {
  const obs = obsStart(request, "/api/team/invites/[token]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    const { token } = await ctx.params;
    const result = await invitesService.acceptInvite({ token, userId: session.userId });
    if (!result) throw new HttpError("Invite not found", 404, "NOT_FOUND");
    if (!result.ok) throw new HttpError(`Invite ${result.reason}`, 400, result.reason);
    const { updateSessionTeam } = await import("@/modules/auth/sessions.repository");
    await updateSessionTeam(session.sessionId, result.teamId);
    obsEnd(obs, 200);
    return jsonOk({ joined: true, teamId: result.teamId }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});
