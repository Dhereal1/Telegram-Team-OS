import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function listActiveSubscriptionsForTeam(teamId: string) {
  return prisma.webhookSubscription.findMany({
    where: { status: "ACTIVE", install: { teamId, status: "ENABLED" } },
    select: {
      id: true,
      url: true,
      secret: true,
      events: true,
      status: true,
      installId: true,
    },
    take: 1000,
  });
}

export async function listSubscriptionsForInstall(installId: string) {
  return prisma.webhookSubscription.findMany({
    where: { installId },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, status: true, events: true, createdAt: true, updatedAt: true, lastDeliveredAt: true, lastError: true },
    take: 200,
  });
}

export async function createSubscription(input: { installId: string; url: string; secret: string; events: string[] }) {
  return prisma.webhookSubscription.create({
    data: { installId: input.installId, url: input.url, secret: input.secret, status: "ACTIVE", events: input.events as never },
    select: { id: true, url: true, status: true, events: true, createdAt: true },
  });
}

export async function createDelivery(input: { subscriptionId: string; eventId: string; eventName: string }) {
  return prisma.webhookDelivery.create({
    data: { subscriptionId: input.subscriptionId, eventId: input.eventId, eventName: input.eventName, status: "PENDING", attempt: 0 },
    select: { id: true },
  });
}

export async function getDelivery(deliveryId: string) {
  return prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      status: true,
      attempt: true,
      eventId: true,
      eventName: true,
      subscription: { select: { id: true, url: true, secret: true, status: true, install: { select: { teamId: true } } } },
    },
  });
}

export async function markDeliverySucceeded(input: { deliveryId: string; responseCode: number }) {
  const now = new Date();
  await prisma.webhookDelivery.update({
    where: { id: input.deliveryId },
    data: { status: "SUCCEEDED", deliveredAt: now, responseCode: input.responseCode, error: null, attempt: { increment: 1 } },
  });
  // Best-effort subscription health.
  const d = await prisma.webhookDelivery.findUnique({ where: { id: input.deliveryId }, select: { subscriptionId: true } });
  if (d) void prisma.webhookSubscription.update({ where: { id: d.subscriptionId }, data: { lastDeliveredAt: now, lastError: null } }).catch(() => {});
}

export async function markDeliveryFailed(input: { deliveryId: string; error: string; responseCode?: number | null; terminal: boolean }) {
  const now = new Date();
  await prisma.webhookDelivery.update({
    where: { id: input.deliveryId },
    data: {
      status: input.terminal ? "DEAD_LETTER" : "FAILED",
      responseCode: input.responseCode ?? null,
      error: input.error.slice(0, 2000),
      attempt: { increment: 1 },
      deliveredAt: input.terminal ? now : null,
    },
  });
  const d = await prisma.webhookDelivery.findUnique({ where: { id: input.deliveryId }, select: { subscriptionId: true } });
  if (d) void prisma.webhookSubscription.update({ where: { id: d.subscriptionId }, data: { lastError: input.error.slice(0, 500) } }).catch(() => {});
}

