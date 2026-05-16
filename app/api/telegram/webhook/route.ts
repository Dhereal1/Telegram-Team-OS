import { env } from "@/lib/env";
import { jsonErr, jsonOk } from "@/lib/utils/api";
import { handleWebhookUpdate } from "@/services/telegram/telegram-service";
import { obsEnd, obsError, obsStart, obsLog } from "@/lib/obs/server";
import { enforceRateLimit } from "@/lib/ratelimit";
import crypto from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
}).passthrough();

export async function POST(request: Request) {
  const obs = obsStart(request, "/api/telegram/webhook");
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        type: "telegram.webhook.misconfig",
        message: "TELEGRAM_WEBHOOK_SECRET is required in production",
        route: obs.route,
        requestId: obs.requestId,
      }),
    );
    return jsonErr("Server misconfigured: TELEGRAM_WEBHOOK_SECRET is required in production", {
      status: 500,
      headers: { "x-request-id": obs.requestId },
    });
  }

  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (!header) return jsonErr("Invalid webhook secret", { status: 401, headers: { "x-request-id": obs.requestId } });

    const secretBuf = Buffer.from(secret);
    const headerBuf = Buffer.from(header);
    const ok = secretBuf.length === headerBuf.length && crypto.timingSafeEqual(secretBuf, headerBuf);
    if (!ok) return jsonErr("Invalid webhook secret", { status: 401, headers: { "x-request-id": obs.requestId } });
  }

  try {
    await enforceRateLimit({ request, preset: "webhook", identity: "global", key: "global" });
    const rawBody = await request.text();
    if (!rawBody.trim()) return jsonErr("Empty webhook body", { status: 400, headers: { "x-request-id": obs.requestId } });

    const update = JSON.parse(rawBody) as { update_id: number };
    const parsed = telegramUpdateSchema.safeParse(update);
    if (!parsed.success) return jsonErr("Invalid Telegram update", { status: 400, code: "TELEGRAM_INVALID", headers: { "x-request-id": obs.requestId } });

    obsLog("telegram.webhook", { requestId: obs.requestId, route: obs.route, method: obs.method }, { update_id: parsed.data.update_id });
    await handleWebhookUpdate(update as never);
    obsEnd(obs, 200);
    return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e, { status: 400 });
    return jsonErr(e instanceof Error ? e.message : "Webhook error", { status: 400, headers: { "x-request-id": obs.requestId } });
  }
}
