import "dotenv/config";
import "@/modules/bootstrap/server";

import { Worker } from "bullmq";
import { sendDM } from "@/lib/telegram/bot";
import { getRedisConnection, type NotificationJob } from "@/lib/queues";

export function startNotificationsWorker() {
  const worker = new Worker<NotificationJob>(
    "notifications",
    async (job) => {
      const { teamId, userId, telegramUserId, message } = job.data;
      try {
        const tgId = typeof telegramUserId === "bigint" ? telegramUserId : BigInt(telegramUserId);
        await sendDM(tgId, message);
      } catch (e: unknown) {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            type: "worker.notifications.failed",
            teamId,
            userId,
            jobId: job.id ?? null,
            message: e instanceof Error ? e.message : "Notification delivery failed",
          }),
        );
        // Do not rethrow: job will be marked as failed.
        return;
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on("error", (err) => {
    console.error(`Notifications worker error: ${err instanceof Error ? err.message : String(err)}`);
  });

  return worker;
}

