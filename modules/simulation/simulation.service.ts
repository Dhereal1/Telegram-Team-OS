import "server-only";

import { prisma } from "@/lib/db/prisma";
import { createExplainabilityLog } from "@/modules/intelligence/explainability";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export async function runCapacityScenario(input: { teamId: string; createdByUserId: string; horizonDays: number; additionalTasks?: number }) {
  const horizonDays = clamp(Math.round(input.horizonDays), 1, 90);
  const now = new Date();
  const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [completed7, created7, activeStaff] = await Promise.all([
    prisma.task.count({ where: { teamId: input.teamId, completedAt: { gte: windowStart }, archivedAt: null } }),
    prisma.task.count({ where: { teamId: input.teamId, createdAt: { gte: windowStart }, archivedAt: null } }),
    prisma.teamMember.count({ where: { teamId: input.teamId, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } } }),
  ]);

  const completionRatePerDay = completed7 / 7;
  const intakeRatePerDay = created7 / 7;
  const additional = Math.max(0, Math.round(input.additionalTasks ?? 0));

  const projectedCompleted = Math.round(completionRatePerDay * horizonDays);
  const projectedCreated = Math.round(intakeRatePerDay * horizonDays) + additional;
  const projectedDelta = projectedCreated - projectedCompleted;

  const trace = {
    rule: "phase9.simulation.capacity.v1",
    horizonDays,
    additionalTasks: additional,
    metrics: { completed7, created7, activeStaff, completionRatePerDay, intakeRatePerDay },
    result: { projectedCompleted, projectedCreated, projectedDelta },
    note: "Simple scenario simulation based on last 7-day rates; interpret as directional guidance only.",
    since: since.toISOString(),
  };
  const explainLogId = await createExplainabilityLog({ teamId: input.teamId, kind: "SIMULATION", engine: "heuristic", trace });

  const run = await prisma.simulationRun.create({
    data: {
      teamId: input.teamId,
      type: "scenario.capacity",
      status: "SUCCEEDED",
      inputs: { horizonDays, additionalTasks: additional } as never,
      results: { projectedCompleted, projectedCreated, projectedDelta } as never,
      lastError: null,
      explainLogId,
      createdByUserId: input.createdByUserId,
      finishedAt: new Date(),
    },
    select: { id: true, status: true, results: true, createdAt: true },
  });

  return run;
}

