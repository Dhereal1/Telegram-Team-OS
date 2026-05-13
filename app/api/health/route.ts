import { jsonErr, jsonOk } from "@/lib/utils/api";
import { prisma } from "@/lib/db/prisma";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const obs = obsStart(request, "/api/health");
  try {
    const url = new URL(request.url);
    const deep = url.searchParams.get("deep") === "1";

    if (deep) {
      await prisma.$queryRaw`SELECT 1`;
    }

    obsEnd(obs, 200, { deep });
    return jsonOk(
      {
        ok: true,
        deep,
        ts: new Date().toISOString(),
      },
      { headers: { "x-request-id": obs.requestId } },
    );
  } catch (e: unknown) {
    obsError(obs, e);
    return jsonErr("Unhealthy", { status: 500, code: "UNHEALTHY", headers: { "x-request-id": obs.requestId } });
  }
}

