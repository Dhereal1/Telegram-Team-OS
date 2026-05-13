import "server-only";

import { slugify } from "@/lib/utils/slug";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";
import * as repo from "@/modules/team/team.repository";

export async function ensureDefaultRoles() {
  const existing = await repo.listRoleKeys();
  const have = new Set(existing.map((r) => r.key));
  const wanted: Array<{ key: "FOUNDER" | "ADMIN" | "STAFF"; name: string; description: string }> = [
    { key: "FOUNDER", name: "Founder", description: "Full control over team and operations." },
    { key: "ADMIN", name: "Admin", description: "Can manage staff operations and reviews." },
    { key: "STAFF", name: "Staff", description: "Executes tasks and submits reports." },
  ];

  const toCreate = wanted.filter((r) => !have.has(r.key));
  if (!toCreate.length) return;
  await repo.createRoles(toCreate);
}

export async function ensureUserHasTeam(userId: string, suggestedName: string) {
  const existing = await repo.findActiveMembership(userId);
  if (existing) return existing.teamId;

  await ensureDefaultRoles();
  const founderRole = await repo.getRoleByKey("FOUNDER");
  if (!founderRole) throw new Error("Role seed failed");

  const baseSlug = slugify(suggestedName || "team");
  const slug = await uniqueTeamSlug(baseSlug);
  const created = await repo.createTeamWithFounder({
    userId,
    teamName: suggestedName || "Team",
    slug,
    founderRoleId: founderRole.id,
  });

  const memberId = created.members[0]?.id;
  if (memberId) {
    void emitDomainEvent("member.joined", { teamId: created.id, actorId: userId, memberId, roleKey: "FOUNDER" });
  }

  return created.id;
}

export async function getDefaultTeamId(userId: string) {
  const tm = await repo.getDefaultTeamId(userId);
  return tm?.teamId ?? null;
}

async function uniqueTeamSlug(base: string) {
  const candidate = base || "team";
  const exists = await repo.getTeamBySlug(candidate);
  if (!exists) return candidate;
  for (let i = 2; i <= 20; i++) {
    const next = `${candidate}-${i}`;
    const e = await repo.getTeamBySlug(next);
    if (!e) return next;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}
