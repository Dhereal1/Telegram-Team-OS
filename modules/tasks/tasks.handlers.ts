import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { enforceRateLimit } from "@/lib/ratelimit";
import { beginIdempotency, finishIdempotency, getIdempotencyResult } from "@/lib/idempotency";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/tasks";
import * as tasksService from "@/modules/tasks/tasks.service";
import { HttpError } from "@/packages/core/http-error";
import { checkLimit } from "@/lib/billing/plans";
import { prisma } from "@/lib/db/prisma";

export const tasksGET = withApi(async (request) => {
  const obs = obsStart(request, "/api/tasks");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const tasks = await tasksService.listTasks(session.teamId!);
    obsEnd(obs, 200);
    return jsonOk({ tasks }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const tasksPOST = withApi(async (request) => {
  const obs = obsStart(request, "/api/tasks");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    requireRole(session.roleKey ?? null, "STAFF");

    const existing = await getIdempotencyResult<{ task: unknown }>({ request, teamId: session.teamId!, route: "/api/tasks:POST" });
    if (existing) {
      obsEnd(obs, 200, { idempotent: true });
      return jsonOk(existing, { headers: { "x-request-id": obs.requestId } });
    }

    const idem = await beginIdempotency({ request, teamId: session.teamId!, route: "/api/tasks:POST" });
    const body = createTaskSchema.parse(await request.json());

    const limit = await checkLimit(session.teamId!, "tasks");
    if (!limit.allowed) return jsonErr(limit.reason ?? "Upgrade required.", { status: 402, headers: { "x-request-id": obs.requestId } });

    const task = await tasksService.createTask({
      teamId: session.teamId!,
      actorId: session.userId,
      title: body.title,
      description: body.description,
      assignedToId: body.assignedToUserId,
      priority: body.priority,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    });

    await prisma.team.update({ where: { id: session.teamId! }, data: { usageTasksCount: { increment: 1 } }, select: { id: true } });

    await finishIdempotency({ redisKey: idem?.redisKey ?? null, result: { task } });
    obsEnd(obs, 201);
    return jsonOk({ task }, { status: 201, headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const taskIdGET = withApi(async (request, ctx: { params: Promise<{ taskId: string }> }) => {
  const obs = obsStart(request, "/api/tasks/[taskId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const { taskId } = await ctx.params;
    const task = await tasksService.getTask(session.teamId!, taskId);
    if (!task) throw new HttpError("Task not found", 404, "NOT_FOUND");
    obsEnd(obs, 200);
    return jsonOk({ task }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const taskIdPATCH = withApi(async (request, ctx: { params: Promise<{ taskId: string }> }) => {
  const obs = obsStart(request, "/api/tasks/[taskId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    requireRole(session.roleKey ?? null, "STAFF");

    const { taskId } = await ctx.params;
    const body = updateTaskSchema.parse(await request.json());
    const task = await tasksService.updateTask({
      teamId: session.teamId!,
      actorId: session.userId,
      taskId,
      patch: {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueAt: body.dueAt === undefined ? undefined : body.dueAt === null ? null : new Date(body.dueAt),
        assignedToId: body.assignedToUserId,
      },
    });
    obsEnd(obs, 200);
    return jsonOk({ task }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const taskIdDELETE = withApi(async (request, ctx: { params: Promise<{ taskId: string }> }) => {
  const obs = obsStart(request, "/api/tasks/[taskId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    requireRole(session.roleKey ?? null, "STAFF");

    const { taskId } = await ctx.params;
    const archived = await tasksService.archiveTask({ teamId: session.teamId!, actorId: session.userId, taskId });
    obsEnd(obs, 200);
    return jsonOk({ archived }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});
