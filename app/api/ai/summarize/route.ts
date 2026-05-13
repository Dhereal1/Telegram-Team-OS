import { jsonErr, jsonOk, HttpError } from "@/lib/utils/api";
import { requireApiSession } from "@/lib/auth/api";
import { summarizeSchema } from "@/lib/validators/ai";
import { prisma } from "@/lib/db/prisma";
import { summarizeAndStore } from "@/services/ai/ai-service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { obsEnd, obsError, obsStart, obsLog } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const obs = obsStart(request, "/api/ai/summarize");
  try {
    const session = await requireApiSession();
    const teamId = session.teamId!;
    obs.userId = session.userId;
    obs.teamId = teamId;
    await enforceRateLimit({ request, preset: "mutation", identity: `u:${session.userId}`, key: "mut" });

    const body = summarizeSchema.parse(await request.json());
    if (!body.reportId && !body.text) throw new HttpError("Provide reportId or text", 400);

    const text = body.text
      ? body.text
      : await prisma.report
          .findUnique({ where: { id: body.reportId! }, select: { body: true } })
          .then((r: { body: string } | null) => r?.body ?? null);
    if (!text) throw new HttpError("Report not found", 404);

    obsLog("ai.request", { requestId: obs.requestId, route: obs.route, method: obs.method, userId: session.userId, teamId }, { provider: "stub", reportId: body.reportId ?? null, hasText: Boolean(body.text) });
    const result = await summarizeAndStore(teamId, body.reportId ?? null, text);
    obsEnd(obs, 200);
    return jsonOk(result, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error && e.name === "ZodError") return jsonErr(e.message, { status: 400, headers: { "x-request-id": obs.requestId } });
    if (e instanceof Error) return jsonErr(e.message, { status: 500, headers: { "x-request-id": obs.requestId } });
    return jsonErr("Error", { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
