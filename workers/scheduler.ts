import "dotenv/config";
import "@/modules/bootstrap/server";

import { prisma } from "@/lib/db/prisma";
import { cronQueue } from "@/lib/queues";

export async function scheduleRecurringJobs() {
  const teams = await prisma.team.findMany({
    where: { telegramChatId: { not: null } },
    select: { id: true, timezone: true },
    take: 5000,
  });

  for (const t of teams) {
    const tz = t.timezone ?? "UTC";
    await cronQueue().add(
      "report-reminder",
      { teamId: t.id },
      {
        jobId: `report-reminder-${t.id}`,
        repeat: { pattern: "0 16 * * *", tz },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    await cronQueue().add(
      "daily-digest",
      { teamId: t.id },
      {
        jobId: `daily-digest-${t.id}`,
        repeat: { pattern: "0 18 * * *", tz },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  console.log(JSON.stringify({ ts: new Date().toISOString(), type: "worker.scheduler", scheduledTeams: teams.length }));
  return teams.length;
}
