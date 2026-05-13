import "server-only";

import { prisma } from "@/lib/db/prisma";
import { webhookSignatureHeader } from "@/webhooks/signing";
import { getDelivery, markDeliveryFailed, markDeliverySucceeded } from "@/webhooks/webhooks.repository";
import { logSecurityEvent } from "@/modules/security/security-events.service";

export async function deliverWebhook(deliveryId: string, opts?: { attempt: number; maxAttempts: number }) {
  const delivery = await getDelivery(deliveryId);
  if (!delivery) return;
  if (delivery.subscription.status !== "ACTIVE") return;

  const evt = await prisma.domainEvent.findUnique({
    where: { id: delivery.eventId },
    select: { id: true, name: true, version: true, createdAt: true, teamId: true, payload: true },
  });
  if (!evt) {
    await markDeliveryFailed({ deliveryId, error: "Missing event", terminal: true });
    return;
  }

  const payload = {
    id: evt.id,
    name: evt.name,
    version: evt.version,
    occurredAt: evt.createdAt.toISOString(),
    teamId: evt.teamId,
    data: evt.payload,
  };
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const sig = webhookSignatureHeader({ secret: delivery.subscription.secret, timestamp: ts, body });
  const attempt = opts?.attempt ?? 1;
  const maxAttempts = opts?.maxAttempts ?? 1;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(delivery.subscription.url, {
      method: "POST",
      // Phase 10: avoid redirect-based SSRF. Treat redirects as failures.
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        "user-agent": "TeamOS-Webhooks/1.0",
        "x-teamos-event-id": evt.id,
        "x-teamos-event-name": String(evt.name),
        "x-teamos-signature": sig,
        "x-teamos-timestamp": String(ts),
        "x-teamos-delivery-id": deliveryId,
        "x-teamos-delivery-attempt": String(attempt),
      },
      body,
      signal: controller.signal,
    });

    if (res.ok) {
      await markDeliverySucceeded({ deliveryId, responseCode: res.status });
      return;
    }

    const terminal = attempt >= maxAttempts;
    await markDeliveryFailed({ deliveryId, error: `HTTP ${res.status}`, responseCode: res.status, terminal });
    if (terminal) {
      void logSecurityEvent({
        teamId: delivery.subscription.install.teamId,
        severity: "WARNING",
        type: "public_webhook.delivery.dead_letter",
        message: "Webhook delivery dead-lettered",
        metadata: { deliveryId, subscriptionId: delivery.subscription.id, url: delivery.subscription.url, eventId: evt.id, eventName: evt.name, responseCode: res.status },
      }).catch(() => {});
    }
    if (!terminal) throw new Error(`Webhook HTTP ${res.status}`);
  } catch (e: unknown) {
    const terminal = attempt >= maxAttempts;
    const msg = e instanceof Error ? e.message : "Webhook delivery failed";
    await markDeliveryFailed({ deliveryId, error: msg, terminal });
    if (terminal) {
      void logSecurityEvent({
        teamId: delivery.subscription.install.teamId,
        severity: "WARNING",
        type: "public_webhook.delivery.dead_letter",
        message: "Webhook delivery dead-lettered",
        metadata: { deliveryId, subscriptionId: delivery.subscription.id, url: delivery.subscription.url, eventId: evt?.id ?? null, eventName: evt?.name ?? null, error: msg },
      }).catch(() => {});
    }
    if (!terminal) throw e;
  } finally {
    clearTimeout(timeout);
  }
}
