import "server-only";

import { cookies, headers } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db/prisma";

export type ServerSession = {
  sessionId: string;
  userId: string;
  teamId?: string | null;
  roleKey?: "FOUNDER" | "ADMIN" | "STAFF" | null;
};

export async function getServerSession(): Promise<ServerSession | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: { id: true, userId: true, teamId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  let roleKey: ServerSession["roleKey"] = null;
  if (session.teamId) {
    const tm = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: session.teamId, userId: session.userId } },
      select: { role: { select: { key: true } }, isActive: true, status: true },
    });
    roleKey = tm?.isActive && tm.status === "ACTIVE" ? (tm.role.key as ServerSession["roleKey"]) : null;
  }

  const h = await headers();
  const userAgent = h.get("user-agent") ?? undefined;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  void prisma.session
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), userAgent, ip },
    })
    .catch(() => {});

  return { sessionId: session.id, userId: session.userId, teamId: session.teamId, roleKey };
}
