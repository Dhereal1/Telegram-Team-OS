import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { createTaskSchema } from "@/lib/validators/tasks";
import { createTask, listTasks } from "@/services/tasks/task-service";
import { requireRole } from "@/lib/auth/permissions";
import { logActivity } from "@/services/activity/activity-service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { beginIdempotency, finishIdempotency, getIdempotencyResult } from "@/lib/idempotency";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/tasks");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const tasks = await listTasks(session.teamId!);
    obsEnd(obs, 200);
    return jsonOk({ tasks }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function POST(request: Request) {
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
    const task = await createTask({
      teamId: session.teamId!,
      createdById: session.userId,
      title: body.title,
      description: body.description,
      assignedToId: body.assignedToUserId,
      priority: body.priority,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    });

    await logActivity({
      teamId: session.teamId!,
      actorId: session.userId,
      action: "task.created",
      entityType: "Task",
      entityId: task.id,
      metadata: { title: task.title },
    });

    await finishIdempotency({ redisKey: idem?.redisKey ?? null, result: { task } });
    obsEnd(obs, 201);
    return jsonOk({ task }, { status: 201, headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
