import "server-only";

import { prisma } from "@/lib/db/prisma";

function utcDateKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function namespaceFromEventName(name: string) {
  const [ns] = name.split(".");
  return ns || "unknown";
}

export async function aggregateDomainEventsDaily(input: { date?: Date }) {
  const day = input.date ?? new Date();
  const dateKey = utcDateKey(day);
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));

  const events = await prisma.domainEvent.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      teamId: { not: null },
      status: { in: ["SUCCEEDED", "FAILED", "DEAD_LETTER", "PENDING", "PROCESSING"] },
    },
    select: { teamId: true, name: true, id: true },
    take: 50_000,
  });

  const counts = new Map<string, { teamId: string; namespace: string; eventName: string; count: number; sampleId?: string }>();
  for (const e of events) {
    if (!e.teamId) continue;
    const namespace = namespaceFromEventName(e.name);
    const key = `${e.teamId}:${dateKey}:${namespace}:${e.name}`;
    const cur = counts.get(key) ?? { teamId: e.teamId, namespace, eventName: e.name, count: 0, sampleId: e.id };
    cur.count += 1;
    counts.set(key, cur);
  }

  for (const row of counts.values()) {
    await prisma.warehouseEventDaily.upsert({
      where: { teamId_dateKey_namespace_eventName: { teamId: row.teamId, dateKey, namespace: row.namespace, eventName: row.eventName } },
      update: { count: row.count, sample: row.sampleId ? { eventId: row.sampleId } : undefined },
      create: {
        teamId: row.teamId,
        dateKey,
        namespace: row.namespace,
        eventName: row.eventName,
        count: row.count,
        sample: row.sampleId ? ({ eventId: row.sampleId } as never) : undefined,
      },
      select: { id: true },
    });
  }

  return { dateKey, rows: counts.size };
}

export async function writeOperationalSnapshot(teamId: string, input: { date?: Date }) {
  const day = input.date ?? new Date();
  const dateKey = utcDateKey(day);

  const [dashboard, openInsights] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true, planTier: true, usageTasksCount: true, usageReportsCount: true, usageInvitesCount: true } }),
    prisma.operationalInsight.findMany({
      where: { teamId, status: "OPEN" },
      orderBy: [{ severity: "desc" }, { score: "desc" }],
      take: 10,
      select: { key: true, severity: true, score: true, title: true },
    }),
  ]);

  const payload = {
    dateKey,
    team: dashboard,
    openInsights,
  };

  await prisma.operationalSnapshot.upsert({
    where: { teamId_dateKey: { teamId, dateKey } },
    update: { payload: payload as never },
    create: { teamId, dateKey, payload: payload as never },
    select: { id: true },
  });

  return { teamId, dateKey };
}

