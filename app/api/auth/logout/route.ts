import { cookies } from "next/headers";
import { jsonOk } from "@/lib/utils/api";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db/prisma";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { enforceRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const obs = obsStart(request, "/api/auth/logout");
  try {
    await enforceRateLimit({ request, preset: "mutation", identity: "logout", key: "logout" });
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
      jar.set(AUTH_COOKIE_NAME, "", { ...getAuthCookieOptions(), maxAge: 0 });
    }
    obsEnd(obs, 200);
    return jsonOk({ loggedOut: true }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    return jsonOk({ loggedOut: false }, { status: 500, headers: { "x-request-id": obs.requestId } });
  }
}
