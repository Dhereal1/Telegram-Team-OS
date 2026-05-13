import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultRoles } from "@/services/team/team-service";
import { logActivity } from "@/services/activity/activity-service";
import { recordUsage } from "@/services/billing/billing-service";

export async function createInvite(input: {
  teamId: string;
  createdById: string;
  roleKey: "FOUNDER" | "ADMIN" | "STAFF";
  ttlHours?: number;
}) {
  await ensureDefaultRoles();
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * (input.ttlHours ?? 72));

  const invite = await prisma.teamInvite.create({
    data: {
      teamId: input.teamId,
      createdById: input.createdById,
      token,
      roleKey: input.roleKey,
      expiresAt,
    },
    select: { id: true, token: true, roleKey: true, expiresAt: true, createdAt: true },
  });

  await logActivity({
    teamId: input.teamId,
    actorId: input.createdById,
    action: "team.invite_created",
    entityType: "TeamInvite",
    entityId: invite.id,
    metadata: { roleKey: invite.roleKey },
  });

  void recordUsage({ teamId: input.teamId, key: "invites" }).catch(() => {});
  return invite;
}

export async function acceptInvite(input: { token: string; userId: string }) {
  await ensureDefaultRoles();
  const invite = await prisma.teamInvite.findUnique({
    where: { token: input.token },
    select: { id: true, teamId: true, roleKey: true, expiresAt: true, usedAt: true, usedById: true },
  });
  if (!invite) return null;
  if (invite.usedAt) return { ok: false as const, reason: "USED" as const };
  if (invite.expiresAt.getTime() <= Date.now()) return { ok: false as const, reason: "EXPIRED" as const };

  const role = await prisma.role.findUnique({ where: { key: invite.roleKey }, select: { id: true, key: true } });
  if (!role) return { ok: false as const, reason: "ROLE_MISSING" as const };

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: invite.teamId, userId: input.userId } },
    update: { isActive: true, roleId: role.id },
    create: { teamId: invite.teamId, userId: input.userId, roleId: role.id, title: role.key === "STAFF" ? "Staff" : role.key },
    select: { id: true, teamId: true },
  });

  await prisma.teamInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), usedById: input.userId },
  });

  await logActivity({
    teamId: invite.teamId,
    actorId: input.userId,
    action: "team.invite_accepted",
    entityType: "TeamInvite",
    entityId: invite.id,
    metadata: {},
  });

  return { ok: true as const, teamId: member.teamId };
}
