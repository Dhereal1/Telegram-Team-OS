import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getRedisConnection } from "@/modules/scheduler/redis";
import { getQueue } from "@/modules/scheduler/queues";

export const dynamic = "force-dynamic";

export const healthGET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");

  // DB probe
  const dbOk = await prisma.team.count({ take: 1 }).then(() => true).catch(() => false);

  // Redis (BullMQ)
  const redis = getRedisConnection();
  const redisOk = redis ? await redis.ping().then((r) => r === "PONG").catch(() => false) : false;

  const queues = {
    domainEvents: Boolean(getQueue("domain-events")),
    notifications: Boolean(getQueue("notifications")),
    workflows: Boolean(getQueue("workflow-executions")),
    cron: Boolean(getQueue("cron")),
  };

  return jsonOk({
    ok: dbOk,
    dbOk,
    redisOk,
    queues,
    time: new Date().toISOString(),
    teamId: session.teamId,
  });
});

export const dlqGET = withApi(async () => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");

  const [events, notifications, workflows] = await Promise.all([
    prisma.domainEvent.findMany({
      where: { teamId: session.teamId!, status: { in: ["DEAD_LETTER", "FAILED"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, name: true, status: true, attempts: true, lastError: true, createdAt: true, updatedAt: true },
    }),
    prisma.notification.findMany({
      where: { teamId: session.teamId!, status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, channel: true, status: true, attempts: true, lastError: true, createdAt: true, updatedAt: true },
    }),
    prisma.workflowExecution.findMany({
      where: { teamId: session.teamId!, status: "FAILED" },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: { id: true, status: true, attempts: true, lastError: true, startedAt: true, finishedAt: true, workflow: { select: { name: true } } },
    }),
  ]);

  return jsonOk({ events, notifications, workflows });
});

