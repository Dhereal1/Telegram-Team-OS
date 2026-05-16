import "dotenv/config";
import "@/modules/bootstrap/server";

import { Worker } from "bullmq";
import { prisma } from "@/lib/db/prisma";
import { getRedisConnection, notificationsQueue, type DailyDigestJob, type ReportReminderJob } from "@/lib/queues";
import { sendDM } from "@/lib/telegram/bot";
import { getMissedReportsToday } from "@/lib/reports/missed-reports";

function dateKeyToday(tz: string) {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function startCronWorker() {
  const worker = new Worker(
    "cron",
    async (job) => {
      if (job.name === "report-reminder") {
        const data = job.data as ReportReminderJob;
        const teamId = data.teamId;
        const missed = await getMissedReportsToday(teamId);
        for (const m of missed) {
          const user = await prisma.user.findUnique({ where: { id: m.userId }, select: { telegramId: true } });
          const telegramId = user?.telegramId;
          if (!telegramId) continue;
          await notificationsQueue().add(
            "dm",
            {
              teamId,
              userId: m.userId,
              telegramUserId: telegramId,
              message: "Reminder: you haven't submitted your daily report yet. Use /report in your team group.",
            },
            { removeOnComplete: 1000, removeOnFail: 5000, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
          );
        }

        return;
      }

      if (job.name === "daily-digest") {
        const data = job.data as DailyDigestJob;
        const teamId = data.teamId;

        const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true, timezone: true } });
        if (!team) return;

        const tz = team.timezone ?? "UTC";
        const dateKey = dateKeyToday(tz);
        const reportDate = new Date(`${dateKey}T00:00:00.000Z`);
        const startOfDay = new Date(`${dateKey}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateKey}T23:59:59.999Z`);

        const owner = await prisma.teamMember.findFirst({
          where: { teamId, isActive: true, role: { key: { in: ["FOUNDER", "ADMIN"] } } },
          orderBy: [{ role: { key: "asc" } }, { joinedAt: "asc" }],
          select: { user: { select: { telegramId: true } } },
        });
        const ownerTg = owner?.user.telegramId;
        if (!ownerTg) return;

        const reports = await prisma.report.findMany({
          where: { teamId, reportDate },
          select: { body: true, author: { select: { firstName: true, username: true } } },
          take: 50,
          orderBy: { createdAt: "asc" },
        });

        const completed = await prisma.task.findMany({
          where: { teamId, status: "DONE", completedAt: { gte: startOfDay, lt: endOfDay } },
          select: { id: true },
          take: 5000,
        });

        const openCount = await prisma.task.count({
          where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
        });

        if (reports.length === 0 && completed.length === 0) return;

        const reportLines =
          reports.length === 0
            ? ["(none)"]
            : reports.map((r) => {
                const who = r.author.firstName?.trim() || (r.author.username ? `@${r.author.username}` : "Member");
                const snip = r.body.replace(/\s+/g, " ").trim().slice(0, 60);
                return `- ${who}: ${snip}${r.body.length > 60 ? "…" : ""}`;
              });

        const msg = [
          `Daily digest for ${team.name}`,
          "",
          `Reports today: ${reports.length}`,
          ...reportLines,
          "",
          `Completed today: ${completed.length} tasks`,
          `Still open: ${openCount} tasks`,
        ].join("\n");

        await sendDM(ownerTg, msg);
        return;
      }
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  worker.on("error", (err) => {
    console.error(`Cron worker error: ${err instanceof Error ? err.message : String(err)}`);
  });

  return worker;
}
