import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/billing/portal");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    const team = await prisma.team.findUnique({
      where: { id: session.teamId! },
      select: { billingCustomerId: true },
    });
    if (!team) throw new HttpError("Not found", 404, "NOT_FOUND");
    if (!team.billingCustomerId) throw new HttpError("No billing customer", 400, "NO_CUSTOMER");

    const stripe = getStripe();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const portal = await stripe.billingPortal.sessions.create({
      customer: team.billingCustomerId,
      return_url: `${appUrl}/settings`,
    });

    obsEnd(obs, 200);
    return jsonOk({ url: portal.url }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});

