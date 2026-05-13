import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  take: z.coerce.number().int().min(1).max(30).default(20),
});

export const feedGET = withApi(async (request) => {
  const session = await requireApiSession();
  const url = new URL(request.url);
  const { take } = querySchema.parse({ take: url.searchParams.get("take") });

  const [activity, events, notifications] = await Promise.all([
    prisma.activityLog.findMany({
      where: { teamId: session.teamId! },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, metadata: true },
    }),
    prisma.domainEvent.findMany({
      where: { teamId: session.teamId! },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, version: true, createdAt: true, status: true },
    }),
    prisma.notification.findMany({
      where: { teamId: session.teamId!, userId: session.userId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, channel: true, status: true, createdAt: true, sentAt: true },
    }),
  ]);

  return jsonOk({ activity, events, notifications });
});

