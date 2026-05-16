import "@/modules/bootstrap/server";

import { z } from "zod";
import { withApi, jsonOk } from "@/packages/validation/api";
import { prisma } from "@/lib/db/prisma";
import { requirePublicApiAuth } from "@/api-platform/auth/public-api-auth";
import { enforceRateLimit } from "@/lib/ratelimit";
import { recordPublicApiUsage } from "@/api-platform/usage/record-usage";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";

export const dynamic = "force-dynamic";

// Phase 10: validate query params so public API never throws 500s for bad inputs.
const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(4000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dueAt: z.string().datetime().optional(),
  assignedToId: z.string().optional(),
});

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/public/v1/tasks");
  let ok = false;
  let auth: Awaited<ReturnType<typeof requirePublicApiAuth>> | null = null;
  try {
    auth = await requirePublicApiAuth(request, ["teamos.tasks.read"]);
    obs.teamId = auth.teamId;

    await enforceRateLimit({ request, preset: "public_api", key: "tasks.list", namespace: "public:v1", identity: auth.apiKeyId });

    const url = new URL(request.url);
    const query = listTasksQuerySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });

    const tasks = await prisma.task.findMany({
      where: {
        teamId: auth.teamId,
        archivedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        assignedToId: true,
      },
    });

    ok = true;
    obsEnd(obs, 200, { count: tasks.length });
    return jsonOk({ tasks }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  } finally {
    if (auth) void recordPublicApiUsage({ teamId: auth.teamId, apiKeyId: auth.apiKeyId, ok }).catch(() => {});
  }
});

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/public/v1/tasks");
  let ok = false;
  let auth: Awaited<ReturnType<typeof requirePublicApiAuth>> | null = null;
  try {
    auth = await requirePublicApiAuth(request, ["teamos.tasks.write"]);
    obs.teamId = auth.teamId;

    await enforceRateLimit({ request, preset: "public_api", key: "tasks.create", namespace: "public:v1", identity: auth.apiKeyId });

    const body = createTaskSchema.parse(await request.json());
    if (!auth.actorUserId) throw new HttpError("API key missing actor identity", 403, "FORBIDDEN");

    const task = await prisma.task.create({
      data: {
        teamId: auth.teamId,
        createdById: auth.actorUserId,
        assignedToId: body.assignedToId ?? null,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? "NORMAL",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      },
      select: { id: true, title: true, status: true, priority: true, createdAt: true },
    });

    void emitDomainEvent("task.created", {
      teamId: auth.teamId,
      actorId: auth.actorUserId,
      taskId: task.id,
      title: task.title,
    });

    ok = true;
    obsEnd(obs, 200, { taskId: task.id });
    return jsonOk({ task }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  } finally {
    if (auth) void recordPublicApiUsage({ teamId: auth.teamId, apiKeyId: auth.apiKeyId, ok }).catch(() => {});
  }
});
