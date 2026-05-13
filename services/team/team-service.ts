import "server-only";

import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils/slug";

export async function ensureDefaultRoles() {
  const existing = await prisma.role.findMany({ select: { key: true } });
  const have = new Set(existing.map((r) => r.key));
  const wanted: Array<{ key: "FOUNDER" | "ADMIN" | "STAFF"; name: string; description: string }> = [
    { key: "FOUNDER", name: "Founder", description: "Full control over team and operations." },
    { key: "ADMIN", name: "Admin", description: "Can manage staff operations and reviews." },
    { key: "STAFF", name: "Staff", description: "Executes tasks and submits reports." },
  ];

  const toCreate = wanted.filter((r) => !have.has(r.key));
  if (!toCreate.length) return;
  await prisma.role.createMany({ data: toCreate });
}

export async function ensureUserHasTeam(userId: string, suggestedName: string) {
  const existing = await prisma.teamMember.findFirst({
    where: { userId, isActive: true },
    select: { teamId: true },
  });
  if (existing) return existing.teamId;

  await ensureDefaultRoles();
  const founderRole = await prisma.role.findUnique({ where: { key: "FOUNDER" } });
  if (!founderRole) throw new Error("Role seed failed");

  const baseSlug = slugify(suggestedName || "team");
  const slug = await uniqueTeamSlug(baseSlug);

  const team = await prisma.team.create({
    data: {
      name: suggestedName || "Team",
      slug,
      createdByUserId: userId,
      members: {
        create: {
          userId,
          roleId: founderRole.id,
          title: "Founder",
        },
      },
    },
    select: { id: true },
  });

  return team.id;
}

export async function getDefaultTeamId(userId: string) {
  const tm = await prisma.teamMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { joinedAt: "asc" },
    select: { teamId: true },
  });
  return tm?.teamId ?? null;
}

async function uniqueTeamSlug(base: string) {
  const candidate = base || "team";
  const exists = await prisma.team.findUnique({ where: { slug: candidate }, select: { id: true } });
  if (!exists) return candidate;
  for (let i = 2; i <= 20; i++) {
    const next = `${candidate}-${i}`;
    const e = await prisma.team.findUnique({ where: { slug: next }, select: { id: true } });
    if (!e) return next;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}

