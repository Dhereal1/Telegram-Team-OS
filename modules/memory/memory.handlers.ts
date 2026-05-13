import "@/modules/bootstrap/server";

import { withApi, jsonOk } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { createMemorySchema, listMemorySchema } from "@/modules/memory/memory.validators";
import { createMemoryEntry, listMemoryEntries, setPinned } from "@/modules/memory/memory.repository";

export const dynamic = "force-dynamic";

export const memoryGET = withApi(async (request) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "STAFF");
  const url = new URL(request.url);
  const parsed = listMemorySchema.parse({
    take: url.searchParams.get("take"),
    q: url.searchParams.get("q") ?? undefined,
    pinned: url.searchParams.get("pinned") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });
  const entries = await listMemoryEntries({ teamId: session.teamId!, ...parsed });
  return jsonOk({ entries });
});

export const memoryPOST = withApi(async (request) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "STAFF");
  const body = createMemorySchema.parse(await request.json());
  const entry = await createMemoryEntry({
    teamId: session.teamId!,
    createdById: session.userId,
    type: body.type,
    title: body.title,
    body: body.body,
    tags: body.tags,
    pinned: body.pinned,
    source: "miniapp",
  });
  return jsonOk({ entry }, { status: 201 });
});

export const memoryPIN = withApi(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession();
  requireRole(session.roleKey ?? null, "ADMIN");
  const { id } = await ctx.params;
  const { pinned } = (await request.json()) as { pinned?: boolean };
  const updated = await setPinned({ teamId: session.teamId!, id, pinned: Boolean(pinned) });
  return jsonOk({ updated });
});

