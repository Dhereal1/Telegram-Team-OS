import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

function hashJson(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function createExplainabilityLog(input: {
  teamId: string;
  kind: "RECOMMENDATION" | "PREDICTION" | "RISK" | "ORCHESTRATION" | "SIMULATION";
  engine: string;
  model?: string | null;
  trace: unknown;
  inputHash?: string | null;
}) {
  const inputHash = input.inputHash ?? hashJson(input.trace);
  const row = await prisma.explainabilityLog.create({
    data: {
      teamId: input.teamId,
      kind: input.kind as never,
      engine: input.engine,
      model: input.model ?? null,
      inputHash,
      trace: input.trace as never,
    },
    select: { id: true },
  });
  return row.id;
}

