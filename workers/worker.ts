import "@/modules/bootstrap/server";

import { createWorker } from "@/modules/scheduler/worker-runtime";
import type { Job } from "bullmq";
import { getDomainEvent, markDomainEventStatus } from "@/modules/events/domain-events.repository";
import { eventBus } from "@/packages/events/events";
import { runWorkflowsForEvent } from "@/modules/workflow/workflow.service";
import { getNotification, markNotificationFailed, markNotificationSending, markNotificationSent } from "@/modules/notifications/notifications.repository";
import { deliverTelegramNotification } from "@/modules/notifications/telegram-delivery";
import { getQueue } from "@/modules/scheduler/queues";
import { scanMissedReports, scanOverdueTasks } from "@/modules/automation/cron-jobs";
import { generateDailyTeamInsights, maybeNotifyFounderDigest } from "@/modules/intelligence/intelligence.service";
import { prisma } from "@/lib/db/prisma";
import { enqueueTelegramNotification } from "@/modules/notifications/notifications.service";
import { aggregateDomainEventsDaily, writeOperationalSnapshot } from "@/modules/warehouse/warehouse.service";

// Domain events -> in-process listeners + workflows
createWorker("domain-events", async (job) => {
  const j = job as Job;
  const eventId = (j.data as { eventId?: string }).eventId;
  if (!eventId) return;

  const evt = await getDomainEvent(eventId);
  if (!evt) return;

  await markDomainEventStatus({ id: evt.id, status: "PROCESSING" }).catch(() => {});

  try {
    // 1) in-process listeners (best effort)
    const payload = evt.payload as unknown;
    await eventBus.emit(evt.name as never, payload as never);

    // 2) workflow engine
    if (evt.teamId) {
      await runWorkflowsForEvent({
        teamId: evt.teamId,
        eventId: evt.id,
        eventName: evt.name,
        payload: (typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {}),
      });
    }

    await markDomainEventStatus({ id: evt.id, status: "SUCCEEDED", processedAt: new Date(), lastError: null }).catch(() => {});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Domain event failed";
    await markDomainEventStatus({ id: evt.id, status: j.attemptsMade + 1 >= (j.opts.attempts ?? 1) ? "DEAD_LETTER" : "FAILED", lastError: msg }).catch(() => {});
    throw e;
  }
});

// Notifications delivery
createWorker("notifications", async (job) => {
  const j = job as Job;
  const notificationId = (j.data as { notificationId?: string }).notificationId;
  if (!notificationId) return;

  const notif = await getNotification(notificationId);
  if (!notif) return;

  await markNotificationSending(notificationId);
  try {
    if (notif.channel === "TELEGRAM") {
      await deliverTelegramNotification(notif.payload);
      await markNotificationSent(notificationId);
      return;
    }
    throw new Error(`Unsupported notification channel: ${notif.channel}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Notification failed";
    await markNotificationFailed({ id: notificationId, error: msg });
    throw e;
  }
});

// Keep process alive when workers are enabled.
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

console.log("[worker] started");

// Cron worker: lightweight periodic scans (Phase 2 accountability foundations).
createWorker("cron", async (job) => {
  const j = job as Job;
  if (j.name === "scan-overdue") {
    await scanOverdueTasks();
    return;
  }
  if (j.name === "scan-missed-reports") {
    await scanMissedReports();
    return;
  }
  if (j.name === "generate-insights") {
    const teams = await prisma.team.findMany({ select: { id: true }, take: 500 });
    for (const t of teams) {
      await generateDailyTeamInsights(t.id);
      await maybeNotifyFounderDigest(t.id).catch(() => {});
    }
    return;
  }
  if (j.name === "habit-reminders") {
    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const teams = await prisma.team.findMany({ select: { id: true, telegramChatId: true }, take: 500 });
    for (const team of teams) {
      if (!team.telegramChatId) continue;
      const activeStaff = await prisma.teamMember.findMany({
        where: { teamId: team.id, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } },
        select: { userId: true },
        take: 500,
      });
      const checkins = await prisma.dailyCheckin.findMany({
        where: { teamId: team.id, dateKey: startOfTodayUtc.toISOString().slice(0, 10) },
        select: { userId: true },
        take: 1000,
      });
      const checked = new Set(checkins.map((c) => c.userId));
      const missing = activeStaff.filter((m) => !checked.has(m.userId));
      if (missing.length === 0) continue;

      await enqueueTelegramNotification({
        teamId: team.id,
        chatId: String(team.telegramChatId),
        text: `<b>Daily check-in</b>\n${missing.length} teammate${missing.length === 1 ? "" : "s"} haven’t checked in today.\n\n<i>Open TeamOS → Dashboard to check in.</i>`,
        dedupeKey: `habit-reminder:${new Date().toISOString().slice(0, 10)}`,
      }).catch(() => {});
    }
    return;
  }
  if (j.name === "warehouse-daily") {
    await aggregateDomainEventsDaily({});
    const teams = await prisma.team.findMany({ select: { id: true }, take: 1000 });
    for (const t of teams) {
      await writeOperationalSnapshot(t.id, {}).catch(() => {});
    }
    return;
  }
});

// Ensure repeatable cron jobs exist when BullMQ is enabled.
const cronQueue = getQueue("cron");
if (cronQueue) {
  void cronQueue.add(
    "scan-overdue",
    {},
    { repeat: { every: 5 * 60 * 1000 }, jobId: "cron:scan-overdue", removeOnComplete: 10, removeOnFail: 50 },
  );
  void cronQueue.add(
    "scan-missed-reports",
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: "cron:scan-missed-reports", removeOnComplete: 10, removeOnFail: 50 },
  );
  void cronQueue.add(
    "generate-insights",
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: "cron:generate-insights", removeOnComplete: 10, removeOnFail: 50 },
  );
  void cronQueue.add(
    "habit-reminders",
    {},
    { repeat: { every: 4 * 60 * 60 * 1000 }, jobId: "cron:habit-reminders", removeOnComplete: 10, removeOnFail: 50 },
  );
  void cronQueue.add(
    "warehouse-daily",
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: "cron:warehouse-daily", removeOnComplete: 5, removeOnFail: 50 },
  );
}
