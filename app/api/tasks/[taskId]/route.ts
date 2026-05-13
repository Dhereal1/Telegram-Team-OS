import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { can, requireRole } from "@/lib/auth/permissions";
import { updateTaskSchema } from "@/lib/validators/tasks";
import { archiveTask, getTask, updateTask } from "@/services/tasks/task-service";
import { logActivity } from "@/services/activity/activity-service";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

function ensureCanMutate(session: Awaited<ReturnType<typeof requireApiSession>>, task: { createdById: string; assignedToId: string | null }) {
  const role = session.roleKey ?? null;
  if (can(role, "ADMIN")) return;
  const isOwner = task.createdById === session.userId;
  const isAssignee = task.assignedToId === session.userId;
  if (!isOwner && !isAssignee) throw new HttpError("Forbidden", 403, "FORBIDDEN");
}

export async function GET(request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const obs = obsStart(request, "/api/tasks/[taskId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const { taskId } = await ctx.params;
    const task = await getTask(session.teamId!, taskId);
    if (!task) throw new HttpError("Not found", 404, "NOT_FOUND");
    obsEnd(obs, 200);
    return jsonOk({ task }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const obs = obsStart(request, "/api/tasks/[taskId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    const { taskId } = await ctx.params;
    const existing = await prisma.task.findFirst({
      where: { id: taskId, teamId: session.teamId!, archivedAt: null },
      select: { id: true, title: true, status: true, priority: true, dueAt: true, createdById: true, assignedToId: true },
    });
    if (!existing) throw new HttpError("Not found", 404, "NOT_FOUND");
    ensureCanMutate(session, { createdById: existing.createdById, assignedToId: existing.assignedToId });

    const body = updateTaskSchema.parse(await request.json());

    if (body.assignedToUserId !== undefined) requireRole(session.roleKey ?? null, "ADMIN");

    const updated = await updateTask({
      teamId: session.teamId!,
      taskId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueAt: body.dueAt === undefined ? undefined : body.dueAt === null ? null : new Date(body.dueAt),
      assignedToId: body.assignedToUserId,
    });

    const assignmentChanged = body.assignedToUserId !== undefined && body.assignedToUserId !== existing.assignedToId;
    const statusChanged = body.status !== undefined && body.status !== existing.status;

    await logActivity({
      teamId: session.teamId!,
      actorId: session.userId,
      action: assignmentChanged ? "task.assigned" : statusChanged ? "task.status_changed" : "task.updated",
      entityType: "Task",
      entityId: updated.id,
      metadata: {
        title: updated.title,
        ...(assignmentChanged ? { assignedToUserId: body.assignedToUserId } : {}),
        ...(statusChanged ? { status: body.status } : {}),
      },
    });

    obsEnd(obs, 200);
    return jsonOk({ task: updated }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const obs = obsStart(request, "/api/tasks/[taskId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    const { taskId } = await ctx.params;
    const existing = await prisma.task.findFirst({
      where: { id: taskId, teamId: session.teamId!, archivedAt: null },
      select: { id: true, title: true, createdById: true, assignedToId: true },
    });
    if (!existing) throw new HttpError("Not found", 404, "NOT_FOUND");
    ensureCanMutate(session, { createdById: existing.createdById, assignedToId: existing.assignedToId });

    const archived = await archiveTask(session.teamId!, taskId);
    await logActivity({
      teamId: session.teamId!,
      actorId: session.userId,
      action: "task.archived",
      entityType: "Task",
      entityId: archived.id,
      metadata: { title: archived.title },
    });

    obsEnd(obs, 200);
    return jsonOk({ archived: true }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
