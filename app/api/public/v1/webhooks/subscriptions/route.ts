import "@/modules/bootstrap/server";

import { z } from "zod";
import { withApi, jsonErr, jsonOk } from "@/packages/validation/api";
import { requirePublicApiAuth } from "@/api-platform/auth/public-api-auth";
import { enforceRateLimit } from "@/lib/ratelimit";
import { listSubscriptionsForInstall, createSubscription } from "@/webhooks/webhooks.repository";
import { issueWebhookSecret } from "@/webhooks/webhooks.service";
import { isPublicEvent } from "@/public-events/allowlist";
import { obsEnd, obsError, obsStart } from "@/lib/obs/server";
import { logSecurityEvent } from "@/modules/security/security-events.service";
import { validateWebhookTargetUrl } from "@/webhooks/security";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  url: z.string().url().max(2000),
  events: z.array(z.string().min(1).max(120)).min(1).max(50),
});

export const GET = withApi(async (request) => {
  const obs = obsStart(request, "/api/public/v1/webhooks/subscriptions");
  try {
    const auth = await requirePublicApiAuth(request, ["teamos.events.subscribe"]);
    obs.teamId = auth.teamId;

    await enforceRateLimit({
      request,
      preset: "public_api",
      key: "webhooks.subscriptions.list",
      namespace: "public:v1",
      identity: auth.apiKeyId,
    });

    const subs = await listSubscriptionsForInstall(auth.installId);
    obsEnd(obs, 200, { count: subs.length });
    return jsonOk({ subscriptions: subs }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});

export const POST = withApi(async (request) => {
  const obs = obsStart(request, "/api/public/v1/webhooks/subscriptions");
  try {
    const auth = await requirePublicApiAuth(request, ["teamos.events.subscribe"]);
    obs.teamId = auth.teamId;

    await enforceRateLimit({
      request,
      preset: "public_api",
      key: "webhooks.subscriptions.create",
      namespace: "public:v1",
      identity: auth.apiKeyId,
    });

    const body = createSchema.parse(await request.json());
    const url = await validateWebhookTargetUrl(body.url);
    const events = body.events.filter((e) => isPublicEvent(e));
    if (events.length === 0) return jsonErr("No allowed events", { status: 400, code: "VALIDATION_ERROR", headers: { "x-request-id": obs.requestId } });

    const secret = issueWebhookSecret();
    const sub = await createSubscription({ installId: auth.installId, url, secret, events });

    void logSecurityEvent({
      teamId: auth.teamId,
      userId: auth.actorUserId,
      severity: "INFO",
      type: "public_webhook.subscription.created",
      message: "Webhook subscription created",
      metadata: { subscriptionId: sub.id, installId: auth.installId, apiKeyId: auth.apiKeyId, url, events },
    }).catch(() => {});

    obsEnd(obs, 200, { subscriptionId: sub.id });
    return jsonOk({ subscription: { ...sub, secret } }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e);
    throw e;
  }
});
