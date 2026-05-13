import "server-only";

import crypto from "crypto";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";
import { recordUsage } from "@/services/billing/billing-service";
import { ensureDefaultRoles } from "@/modules/team/team.service";
import * as teamRepo from "@/modules/team/team.repository";
import * as repo from "@/modules/team/invites.repository";

export async function createInvite(input: {
  teamId: string;
  createdById: string;
  roleKey: "FOUNDER" | "ADMIN" | "STAFF";
  ttlHours?: number;
}) {
  await ensureDefaultRoles();
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * (input.ttlHours ?? 72));

  const invite = await repo.createInvite({
    teamId: input.teamId,
    createdById: input.createdById,
    token,
    roleKey: input.roleKey,
    expiresAt,
  });

  void recordUsage({ teamId: input.teamId, key: "invites" }).catch(() => {});
  void emitDomainEvent("invite.created", { teamId: input.teamId, actorId: input.createdById, inviteId: invite.id, roleKey: invite.roleKey });
  return invite;
}

export async function acceptInvite(input: { token: string; userId: string }) {
  await ensureDefaultRoles();
  const invite = await repo.getInviteByToken(input.token);
  if (!invite) return null;
  if (invite.usedAt) return { ok: false as const, reason: "USED" as const };
  if (invite.expiresAt.getTime() <= Date.now()) return { ok: false as const, reason: "EXPIRED" as const };

  const role = await teamRepo.getRoleByKey(invite.roleKey);
  if (!role) return { ok: false as const, reason: "ROLE_MISSING" as const };

  const member = await teamRepo.upsertMember({
    teamId: invite.teamId,
    userId: input.userId,
    roleId: role.id,
    title: role.key === "STAFF" ? "Staff" : role.key,
  });

  await repo.markInviteUsed(invite.id, input.userId);

  void emitDomainEvent("invite.accepted", { teamId: invite.teamId, actorId: input.userId, inviteId: invite.id });
  void emitDomainEvent("member.joined", { teamId: invite.teamId, actorId: input.userId, memberId: member.id, roleKey: role.key });

  return { ok: true as const, teamId: member.teamId };
}
