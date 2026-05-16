import "@/modules/bootstrap/server";

import { withApi, jsonOk, jsonErr } from "@/packages/validation/api";
import { requireApiSession } from "@/lib/auth/api";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { HttpError } from "@/packages/core/http-error";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ plan: z.enum(["PRO", "BUSINESS"]) });

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/billing/checkout");
  try {
    const session = await requireApiSession();
    obs.userId = session.userId;
    obs.teamId = session.teamId;

    const body = bodySchema.parse(await request.json());
    const stripe = getStripe();

    const team = await prisma.team.findUnique({
      where: { id: session.teamId! },
      select: { id: true, name: true, billingCustomerId: true },
    });
    if (!team) throw new HttpError("Not found", 404, "NOT_FOUND");

    let customerId = team.billingCustomerId;
    if (!customerId) {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } });
      const customer = await stripe.customers.create({
        name: team.name,
        metadata: { teamId: team.id, createdBy: user?.username ?? session.userId },
      });
      customerId = customer.id;
      await prisma.team.update({ where: { id: team.id }, data: { billingCustomerId: customerId, billingProvider: "stripe" }, select: { id: true } });
    }

    const priceId = body.plan === "PRO" ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_BUSINESS;
    if (!priceId) throw new HttpError("Stripe price is not configured", 500, "MISCONFIGURED");

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/dashboard/settings`,
      metadata: { teamId: team.id },
    });

    obsEnd(obs, 200);
    return jsonOk({ url: checkout.url }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    if (e instanceof HttpError) return jsonErr(e.message, { status: e.status, code: e.code, headers: { "x-request-id": obs.requestId } });
    throw e;
  }
});
