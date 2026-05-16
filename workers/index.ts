import "dotenv/config";
import "@/modules/bootstrap/server";

import { startNotificationsWorker } from "@/workers/notifications.worker";
import { startCronWorker } from "@/workers/cron.worker";
import { scheduleRecurringJobs } from "@/workers/scheduler";

async function main() {
  const notifications = startNotificationsWorker();
  const cron = startCronWorker();
  await scheduleRecurringJobs();

  console.log("Workers started");

  const shutdown = async () => {
    await Promise.allSettled([notifications.close(), cron.close()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

void main();

