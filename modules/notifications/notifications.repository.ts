import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { NotificationChannel, NotificationPriority, Prisma } from "@/lib/generated/prisma/client";

export async function createNotification(input: {
  teamId: string;
  userId?: string | null;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  templateKey?: string | null;
  payload: Prisma.InputJsonValue;
  dedupeKey?: string | null;
  scheduledAt?: Date | null;
}) {
  return prisma.notification.create({
    data: {
      teamId: input.teamId,
      userId: input.userId ?? null,
      channel: input.channel,
      priority: input.priority ?? "NORMAL",
      templateKey: input.templateKey ?? null,
      payload: input.payload,
      dedupeKey: input.dedupeKey ?? null,
      scheduledAt: input.scheduledAt ?? null,
    },
    select: { id: true, teamId: true, userId: true, channel: true, status: true, scheduledAt: true, createdAt: true },
  });
}

export async function markNotificationSending(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { status: "SENDING", attempts: { increment: 1 } },
    select: { id: true, status: true, attempts: true },
  });
}

export async function markNotificationSent(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    select: { id: true, status: true },
  });
}

export async function markNotificationFailed(input: { id: string; error: string }) {
  return prisma.notification.update({
    where: { id: input.id },
    data: { status: "FAILED", lastError: input.error.slice(0, 2000) },
    select: { id: true, status: true },
  });
}

export async function getNotification(id: string) {
  return prisma.notification.findUnique({
    where: { id },
    select: { id: true, teamId: true, userId: true, channel: true, payload: true, status: true, attempts: true, scheduledAt: true },
  });
}

