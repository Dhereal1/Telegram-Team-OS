import "dotenv/config";
import "@/modules/bootstrap/server";

import { Worker } from "bullmq";
import { prisma } from "@/lib/db/prisma";
import { getRedisConnection, notificationsQueue, type DailyDigestJob, type ReportReminderJob } from "@/lib/queues";
import { sendDM } from "@/lib/telegram/bot";

function getTeamTimezone(): string {
  // Team timezone is not modeled in the current Prisma schema; default to UTC.
  return "UTC";
}

function dateKeyToday(tz: string) {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function utcRangeForDateKey(dateKey: string, tz: string) {
  // Compute UTC boundaries for the given local date in `tz` without extra deps.
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  if (!y || !m || !d) {
    const now = new Date();
    return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)), end: new Date() };
  }

  const start = zonedTimeToUtc(y, m, d, 0, 0, 0, tz);
  const end = zonedTimeToUtc(y, m, d, 23, 59, 59, tz);
  end.setUTCMilliseconds(999);
  return { start, end };
}

function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, tz: string) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));
  const offsetMs = tzOffsetMs(utcGuess, tz);
  return new Date(utcGuess.getTime() - offsetMs);
}

function tzOffsetMs(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const hh = Number(get("hour"));
  const mm = Number(get("minute"));
  const ss = Number(get("second"));
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
  return asUtc - date.getTime();
}

export function startCronWorker() {
  const worker = new Worker(
    "cron",
    async (job) => {
      if (job.name === "report-reminder") {
        const data = job.data as ReportReminderJob;
        const teamId = data.teamId;
        const tz = getTeamTimezone();
        const dateKey = dateKeyToday(tz);
        const range = utcRangeForDateKey(dateKey, tz);

        const members = await prisma.teamMember.findMany({
          where: { teamId, isActive: true },
          select: { userId: true, user: { select: { telegramId: true } } },
          take: 5000,
        });

        const userIds = members.map((m) => m.userId);
        const reports = await prisma.report.findMany({
          where: { teamId, status: "SUBMITTED", authorId: { in: userIds }, createdAt: { gte: range.start, lte: range.end } },
          select: { authorId: true },
          take: 5000,
        });
        const submitted = new Set(reports.map((r) => r.authorId));

        for (const m of members) {
          if (submitted.has(m.userId)) continue;
          const telegramId = m.user.telegramId;
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

        const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
        if (!team) return;

        const tz = getTeamTimezone();
        const dateKey = dateKeyToday(tz);
        const range = utcRangeForDateKey(dateKey, tz);

        const owner = await prisma.teamMember.findFirst({
          where: { teamId, isActive: true, role: { key: { in: ["FOUNDER", "ADMIN"] } } },
          orderBy: [{ role: { key: "asc" } }, { joinedAt: "asc" }],
          select: { user: { select: { telegramId: true } } },
        });
        const ownerTg = owner?.user.telegramId;
        if (!ownerTg) return;

        const reports = await prisma.report.findMany({
          where: { teamId, status: "SUBMITTED", createdAt: { gte: range.start, lte: range.end } },
          select: { body: true, author: { select: { firstName: true, username: true } } },
          take: 50,
          orderBy: { createdAt: "asc" },
        });

        const completed = await prisma.task.findMany({
          where: { teamId, status: "DONE", completedAt: { gte: range.start, lte: range.end } },
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

