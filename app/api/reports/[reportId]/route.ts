import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { requireRole } from "@/lib/auth/permissions";
import { reviewReportSchema } from "@/lib/validators/reports-review";
import { getReport, reviewReport } from "@/services/reports/report-service";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ reportId: string }> }) {
  const obs = obsStart(request, "/api/reports/[reportId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    const { reportId } = await ctx.params;
    const report = await getReport(session.teamId!, reportId);
    if (!report) throw new HttpError("Not found", 404, "NOT_FOUND");

    const summary = await prisma.aIInsight.findFirst({
      where: { teamId: session.teamId!, reportId, type: "SUMMARY" },
      orderBy: { createdAt: "desc" },
      select: { content: true },
    });

    obsEnd(obs, 200);
    return jsonOk({ report, summary: summary?.content ?? null }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ reportId: string }> }) {
  const obs = obsStart(request, "/api/reports/[reportId]");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });
    requireRole(session.roleKey ?? null, "ADMIN");
    const { reportId } = await ctx.params;

    const body = reviewReportSchema.parse(await request.json());
    const updated = await reviewReport({
      teamId: session.teamId!,
      reportId,
      reviewerId: session.userId,
      reviewNotes: body.reviewNotes ?? undefined,
    });

    obsEnd(obs, 200);
    return jsonOk({ report: updated }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
