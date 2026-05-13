import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function logSecurityEvent(input: {
  teamId?: string | null;
  userId?: string | null;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  message: string;
  metadata?: unknown;
}) {
  await prisma.securityEvent.create({
    data: {
      teamId: input.teamId ?? null,
      userId: input.userId ?? null,
      severity: input.severity ?? "INFO",
      type: input.type,
      message: input.message,
      metadata: (input.metadata ?? null) as never,
    },
    select: { id: true },
  });
}

