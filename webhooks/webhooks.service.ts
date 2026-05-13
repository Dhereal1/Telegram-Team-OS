import "server-only";

import crypto from "crypto";
import { isPublicEvent } from "@/public-events/allowlist";
import { listActiveSubscriptionsForTeam, createDelivery } from "@/webhooks/webhooks.repository";
import { getQueue } from "@/modules/scheduler/queues";

function randomSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export function issueWebhookSecret() {
  return randomSecret();
}

function subscriptionAllowsEvent(events: unknown, name: string) {
  if (!Array.isArray(events)) return false;
  return events.some((e) => typeof e === "string" && e === name);
}

export async function enqueueWebhooksForDomainEvent(input: { teamId: string | null; eventId: string; eventName: string }) {
  if (!input.teamId) return;
  if (!isPublicEvent(input.eventName)) return;

  const subs = await listActiveSubscriptionsForTeam(input.teamId);
  const queue = getQueue("webhooks");

  for (const sub of subs) {
    if (sub.status !== "ACTIVE") continue;
    if (!subscriptionAllowsEvent(sub.events, input.eventName)) continue;

    const delivery = await createDelivery({ subscriptionId: sub.id, eventId: input.eventId, eventName: input.eventName });
    if (queue) {
      await queue.add(
        "deliver",
        { deliveryId: delivery.id },
        { jobId: delivery.id, attempts: 10, backoff: { type: "exponential", delay: 5_000 }, removeOnComplete: 5000, removeOnFail: 10000 },
      );
    } else {
      // Degraded mode: if BullMQ/Redis isn't configured, skip external delivery rather than blocking domain event processing.
      // Delivery remains persisted for replay tooling.
    }
  }
}
