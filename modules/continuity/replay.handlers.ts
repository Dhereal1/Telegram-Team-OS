import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getQueue } from "@/modules/scheduler/queues";
import { HttpError } from "@/packages/core/http-error";

export const dynamic = "force-dynamic";

export const replayDomainEventPOST = withApi(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const { id } = await ctx.params;
  const evt = await prisma.domainEvent.findUnique({ where: { id }, select: { id: true, teamId: true } });
  if (!evt || evt.teamId !== session.teamId) throw new HttpError("Not found", 404, "NOT_FOUND");
  const queue = getQueue("domain-events");
  if (!queue) throw new HttpError("Queue not configured", 400, "QUEUE_DISABLED");
  await queue.add("dispatch", { eventId: id }, { jobId: `replay:${id}:${Date.now()}`, attempts: 5, backoff: { type: "exponential", delay: 2000 } });
  return jsonOk({ replayed: true, eventId: id });
});

export const retryNotificationPOST = withApi(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const { id } = await ctx.params;
  const notif = await prisma.notification.findUnique({ where: { id }, select: { id: true, teamId: true } });
  if (!notif || notif.teamId !== session.teamId) throw new HttpError("Not found", 404, "NOT_FOUND");
  const queue = getQueue("notifications");
  if (!queue) throw new HttpError("Queue not configured", 400, "QUEUE_DISABLED");
  await queue.add("deliver", { notificationId: id }, { jobId: `retry:${id}:${Date.now()}`, attempts: 8, backoff: { type: "exponential", delay: 5000 } });
  return jsonOk({ retried: true, notificationId: id });
});

