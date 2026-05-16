import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { enforceRateLimit } from "@/lib/ratelimit";
import { beginIdempotency, finishIdempotency, getIdempotencyResult } from "@/lib/idempotency";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { createReportSchema } from "@/lib/validators/reports";
import { reviewReportSchema } from "@/lib/validators/reports-review";
import * as reportsService from "@/modules/reports/reports.service";
import { HttpError } from "@/packages/core/http-error";
import { prisma } from "@/lib/db/prisma";

export const reportsGET = withApi(async (request) => {
  const obs = obsStart(request, "/api/reports");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    let reportDate: Date | null = null;
    if (date === "today") {
      const team = await prisma.team.findUnique({ where: { id: session.teamId! }, select: { timezone: true } });
      const tz = team?.timezone ?? "UTC";
      const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
        new Date(),
      );
      reportDate = new Date(`${dateKey}T00:00:00.000Z`);
    }

    const reports = await reportsService.listReports(session.teamId!, { reportDate });
    obsEnd(obs, 200);
    return jsonOk({ reports }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const reportsPOST = withApi(async (request) => {
  const obs = obsStart(request, "/api/reports");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });

    const existing = await getIdempotencyResult<{ report: unknown }>({ request, teamId: session.teamId!, route: "/api/reports:POST" });
    if (existing) {
      obsEnd(obs, 200, { idempotent: true });
      return jsonOk(existing, { headers: { "x-request-id": obs.requestId } });
    }

    const idem = await beginIdempotency({ request, teamId: session.teamId!, route: "/api/reports:POST" });
    const body = createReportSchema.parse(await request.json());

    const team = await prisma.team.findUnique({ where: { id: session.teamId! }, select: { timezone: true } });
    const tz = team?.timezone ?? "UTC";
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(),
    );
    const reportDate = new Date(`${dateKey}T00:00:00.000Z`);

    const report = await reportsService.createReport({
      teamId: session.teamId!,
      actorId: session.userId,
      reportDate,
      title: body.title,
      body: body.body,
    });
    await finishIdempotency({ redisKey: idem?.redisKey ?? null, result: { report } });
    obsEnd(obs, 201);
    return jsonOk({ report }, { status: 201, headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const reportIdGET = withApi(async (request, ctx: { params: Promise<{ reportId: string }> }) => {
  const obs = obsStart(request, "/api/reports/[reportId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const { reportId } = await ctx.params;
    const result = await reportsService.getReportWithSummary(session.teamId!, reportId);
    obsEnd(obs, 200);
    return jsonOk(result, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

export const reportIdPATCH = withApi(async (request, ctx: { params: Promise<{ reportId: string }> }) => {
  const obs = obsStart(request, "/api/reports/[reportId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    requireRole(session.roleKey ?? null, "ADMIN");
    const { reportId } = await ctx.params;
    const body = reviewReportSchema.parse(await request.json());
    const report = await reportsService.reviewReport({
      teamId: session.teamId!,
      actorId: session.userId,
      reportId,
      reviewNotes: body.reviewNotes ?? undefined,
    });
    obsEnd(obs, 200);
    return jsonOk({ report }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});
