import "server-only";

import { getQueue } from "@/modules/scheduler/queues";
import * as repo from "@/modules/notifications/notifications.repository";

export async function enqueueTelegramNotification(input: {
  teamId: string;
  chatId: number | string;
  text: string;
  dedupeKey?: string | null;
  scheduledAt?: Date | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}) {
  const notif = await repo.createNotification({
    teamId: input.teamId,
    channel: "TELEGRAM",
    priority: input.priority ?? "NORMAL",
    dedupeKey: input.dedupeKey ?? null,
    scheduledAt: input.scheduledAt ?? null,
    payload: {
      chatId: input.chatId,
      text: input.text,
      parseMode: "HTML",
      disableWebPreview: true,
    },
  });

  const queue = getQueue("notifications");
  if (queue) {
    const delayMs = input.scheduledAt ? Math.max(0, input.scheduledAt.getTime() - Date.now()) : 0;
    await queue.add(
      "deliver",
      { notificationId: notif.id },
      {
        jobId: notif.id,
        delay: delayMs,
        attempts: 10,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 2000,
        removeOnFail: 10_000,
      },
    );
  }

  return notif;
}

