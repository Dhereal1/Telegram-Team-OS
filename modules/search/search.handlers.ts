import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { searchQuerySchema } from "@/modules/search/search.validators";
import { searchOperational } from "@/modules/search/search.repository";

export const dynamic = "force-dynamic";

export const searchGET = withApi(async (request) => {
  const obs = obsStart(request, "/api/search");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    const url = new URL(request.url);
    const parsed = searchQuerySchema.parse({ q: url.searchParams.get("q"), take: url.searchParams.get("take") });
    const result = await searchOperational(session.teamId!, parsed.q, parsed.take);

    obsEnd(obs, 200);
    return jsonOk({ q: parsed.q, ...result }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

