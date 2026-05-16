import "dotenv/config";

async function main() {
  try {
    const { default: validateEnv } = await import("@/lib/env");
    validateEnv();
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : "Environment validation failed");
    process.exit(1);
  }

  await import("@/modules/bootstrap/server");

  const { startNotificationsWorker } = await import("@/workers/notifications.worker");
  const { startCronWorker } = await import("@/workers/cron.worker");
  const { scheduleRecurringJobs } = await import("@/workers/scheduler");
  const { registerBotCommands } = await import("@/lib/telegram/register-commands");

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
