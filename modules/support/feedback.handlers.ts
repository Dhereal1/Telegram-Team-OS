import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  kind: z.enum(["bug", "feedback"]).default("feedback"),
  message: z.string().min(5).max(4000),
  page: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const feedbackPOST = withApi(async (request) => {
  const session = await requireApiSession();
  const body = feedbackSchema.parse(await request.json());
  await prisma.feedback.create({
    data: {
      teamId: session.teamId,
      userId: session.userId,
      kind: body.kind,
      message: body.message,
      page: body.page,
      metadata: (body.metadata ?? null) as never,
    },
    select: { id: true },
  });
  return jsonOk({ ok: true }, { status: 201 });
});
