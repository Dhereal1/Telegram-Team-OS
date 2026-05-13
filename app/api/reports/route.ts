import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { createReportSchema } from "@/lib/validators/reports";
import { createReport, listReports } from "@/services/reports/report-service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { beginIdempotency, finishIdempotency, getIdempotencyResult } from "@/lib/idempotency";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/reports");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const reports = await listReports(session.teamId!);
    obsEnd(obs, 200);
    return jsonOk({ reports }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function POST(request: Request) {
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
    const report = await createReport({
      teamId: session.teamId!,
      authorId: session.userId,
      title: body.title,
      body: body.body,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
    });
    await finishIdempotency({ redisKey: idem?.redisKey ?? null, result: { report } });
    obsEnd(obs, 201);
    return jsonOk({ report }, { status: 201, headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
