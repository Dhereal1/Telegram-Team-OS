import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { z } from "zod";
import { trackEvent } from "@/modules/product-analytics/events.repository";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  name: z.string().min(1).max(80),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const productEventPOST = withApi(async (request) => {
  const session = await requireApiSession();
  const body = eventSchema.parse(await request.json());
  await trackEvent({ teamId: session.teamId!, userId: session.userId, name: body.name, metadata: (body.metadata ?? null) as never });
  return jsonOk({ ok: true });
});
