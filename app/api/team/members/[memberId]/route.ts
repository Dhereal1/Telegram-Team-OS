import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/services/activity/activity-service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

const updateMemberSchema = z.object({
  roleKey: z.enum(["FOUNDER", "ADMIN", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ memberId: string }> }) {
  const obs = obsStart(request, "/api/team/members/[memberId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "FOUNDER");
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    const { memberId } = await ctx.params;
    const body = updateMemberSchema.parse(await request.json());

    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId: session.teamId! },
      select: { id: true, userId: true, roleId: true, role: { select: { key: true } } },
    });
    if (!member) throw new HttpError("Not found", 404, "NOT_FOUND");

    const activeFounderCount = await prisma.teamMember.count({
      where: { teamId: session.teamId!, isActive: true, role: { key: "FOUNDER" } },
    });

    const isDemotingFounder = member.role.key === "FOUNDER" && body.roleKey !== undefined && body.roleKey !== "FOUNDER";
    const isRemovingFounder = member.role.key === "FOUNDER" && body.isActive === false;
    const isSelfTarget = member.userId === session.userId;
    const wouldSelfLockout = isSelfTarget && (isDemotingFounder || isRemovingFounder);

    if ((isDemotingFounder || isRemovingFounder) && activeFounderCount <= 1) {
      throw new HttpError("Cannot modify last active founder", 409, "LAST_FOUNDER");
    }
    if (wouldSelfLockout && activeFounderCount <= 1) {
      throw new HttpError("Cannot remove your own founder access", 409, "SELF_LOCKOUT");
    }

    let roleId: string | undefined;
    if (body.roleKey) {
      const role = await prisma.role.findUnique({ where: { key: body.roleKey }, select: { id: true } });
      if (!role) throw new HttpError("Role missing", 400, "ROLE_MISSING");
      roleId = role.id;
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(roleId ? { roleId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: {
        id: true,
        isActive: true,
        title: true,
        role: { select: { key: true, name: true } },
        user: { select: { id: true, username: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    if (body.roleKey) {
      await logActivity({
        teamId: session.teamId!,
        actorId: session.userId,
        action: "team.role_changed",
        entityType: "TeamMember",
        entityId: updated.id,
        metadata: { userId: updated.user.id, roleKey: updated.role.key },
      });
    }

    if (body.isActive === false) {
      await logActivity({
        teamId: session.teamId!,
        actorId: session.userId,
        action: "team.member_removed",
        entityType: "TeamMember",
        entityId: updated.id,
        metadata: { userId: updated.user.id },
      });
    }

    obsEnd(obs, 200);
    return jsonOk({ member: updated }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ memberId: string }> }) {
  const obs = obsStart(request, "/api/team/members/[memberId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    requireRole(session.roleKey ?? null, "FOUNDER");
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    const { memberId } = await ctx.params;

    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId: session.teamId! },
      select: { id: true, userId: true, role: { select: { key: true } } },
    });
    if (!member) throw new HttpError("Not found", 404, "NOT_FOUND");

    const activeFounderCount = await prisma.teamMember.count({
      where: { teamId: session.teamId!, isActive: true, role: { key: "FOUNDER" } },
    });
    if (member.role.key === "FOUNDER" && activeFounderCount <= 1) {
      throw new HttpError("Cannot remove last active founder", 409, "LAST_FOUNDER");
    }
    if (member.userId === session.userId && activeFounderCount <= 1) {
      throw new HttpError("Cannot remove your own founder access", 409, "SELF_LOCKOUT");
    }

    await prisma.teamMember.updateMany({ where: { id: memberId, teamId: session.teamId! }, data: { isActive: false } });
    await logActivity({
      teamId: session.teamId!,
      actorId: session.userId,
      action: "team.member_removed",
      entityType: "TeamMember",
      entityId: memberId,
      metadata: {},
    });
    obsEnd(obs, 200);
    return jsonOk({ removed: true }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
