import "dotenv/config";
import "@/modules/bootstrap/server";

import { startNotificationsWorker } from "@/workers/notifications.worker";
import { startCronWorker } from "@/workers/cron.worker";
import { scheduleRecurringJobs } from "@/workers/scheduler";
import { registerBotCommands } from "@/lib/telegram/register-commands";

async function main() {
  const notifications = startNotificationsWorker();
  const cron = startCronWorker();
  try {
    await registerBotCommands();
    console.log("Bot commands registered with Telegram");
  } catch (e: unknown) {
    console.error(`Bot command registration failed: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
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
