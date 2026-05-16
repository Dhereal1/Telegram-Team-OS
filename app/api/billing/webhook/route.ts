import "server-only";

import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";
import { notificationsQueue } from "@/lib/queues";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function planFromPrice(priceId: string | null) {
  if (!priceId) return "FREE" as const;
  if (env.STRIPE_PRICE_BUSINESS && priceId === env.STRIPE_PRICE_BUSINESS) return "BUSINESS" as const;
  if (env.STRIPE_PRICE_PRO && priceId === env.STRIPE_PRICE_PRO) return "PRO" as const;
  return "FREE" as const;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing webhook secret", { status: 200 });

  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 200 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e: unknown) {
    console.error(`stripe.webhook.invalid: ${e instanceof Error ? e.message : "invalid"}`);
    return new Response("Invalid signature", { status: 200 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const teamId = session.metadata?.teamId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!teamId || !customerId || !subscriptionId) return new Response("ok", { status: 200 });

      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
      const priceId = sub.items.data[0]?.price?.id ?? null;
      const tier = planFromPrice(priceId);

      await prisma.team.update({
        where: { id: teamId },
        data: {
          billingProvider: "stripe",
          billingCustomerId: customerId,
          billingStatus: sub.status,
          planTier: tier,
          planStartedAt: new Date(),
        },
        select: { id: true },
      });
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!customerId) return new Response("ok", { status: 200 });

      const priceId = sub.items.data[0]?.price?.id ?? null;
      const tier = planFromPrice(priceId);

      await prisma.team.updateMany({
        where: { billingCustomerId: customerId },
        data: { billingStatus: sub.status, ...(sub.status === "active" ? { planTier: tier } : {}) },
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!customerId) return new Response("ok", { status: 200 });

      const team = await prisma.team.findFirst({ where: { billingCustomerId: customerId }, select: { id: true, name: true } });
      if (!team) return new Response("ok", { status: 200 });

      await prisma.team.update({
        where: { id: team.id },
        data: { planTier: "FREE", billingStatus: "canceled" },
        select: { id: true },
      });

      const founder = await prisma.teamMember.findFirst({
        where: { teamId: team.id, isActive: true, status: "ACTIVE", role: { key: "FOUNDER" } },
        select: { userId: true, user: { select: { telegramId: true } } },
      });
      const tg = founder?.user.telegramId;
      if (tg) {
        await notificationsQueue().add(
          "dm",
          {
            teamId: team.id,
            userId: founder.userId,
            telegramUserId: tg,
            message: "Your Dhereal TeamOS subscription has ended. Your workspace is now on the FREE plan.",
          },
          { removeOnComplete: 1000, removeOnFail: 5000, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
        );
      }
    }
  } catch (e: unknown) {
    console.error(`stripe.webhook.handler_error: ${e instanceof Error ? e.message : "error"}`);
  }

  return new Response("ok", { status: 200 });
}
