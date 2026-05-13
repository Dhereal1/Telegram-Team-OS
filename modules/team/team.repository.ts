import "server-only";

import { prisma } from "@/lib/db/prisma";

export function listRoleKeys() {
  return prisma.role.findMany({ select: { key: true } });
}

export function createRoles(data: Array<{ key: "FOUNDER" | "ADMIN" | "STAFF"; name: string; description: string }>) {
  return prisma.role.createMany({ data });
}

export function getRoleByKey(key: "FOUNDER" | "ADMIN" | "STAFF") {
  return prisma.role.findUnique({ where: { key }, select: { id: true, key: true } });
}

export function findActiveMembership(userId: string) {
  return prisma.teamMember.findFirst({
    where: { userId, isActive: true },
    select: { teamId: true },
  });
}

export function createTeamWithFounder(input: { userId: string; teamName: string; slug: string; founderRoleId: string }) {
  return prisma.team.create({
    data: {
      name: input.teamName,
      slug: input.slug,
      createdByUserId: input.userId,
      members: {
        create: {
          userId: input.userId,
          roleId: input.founderRoleId,
          title: "Founder",
        },
      },
    },
    select: { id: true, members: { select: { id: true } } },
  });
}

export function getTeamBySlug(slug: string) {
  return prisma.team.findUnique({ where: { slug }, select: { id: true } });
}

export function getDefaultTeamId(userId: string) {
  return prisma.teamMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { joinedAt: "asc" },
    select: { teamId: true },
  });
}

export function upsertMember(input: { teamId: string; userId: string; roleId: string; title: string }) {
  return prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
    update: { isActive: true, roleId: input.roleId },
    create: { teamId: input.teamId, userId: input.userId, roleId: input.roleId, title: input.title },
    select: { id: true, teamId: true },
  });
}

