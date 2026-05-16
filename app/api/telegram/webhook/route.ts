import { env } from "@/lib/env";
import { jsonErr, jsonOk } from "@/lib/utils/api";
import { obsEnd, obsError, obsStart, obsLog } from "@/lib/obs/server";
import { enforceRateLimit } from "@/lib/ratelimit";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { parseCommand } from "@/lib/telegram/commands/parser";
import { sendMessage } from "@/lib/telegram/bot";
import { handleAssign } from "@/lib/telegram/commands/handlers/assign";
import { handleReport } from "@/lib/telegram/commands/handlers/report";
import { handleTasks } from "@/lib/telegram/commands/handlers/tasks";
import { handleDone } from "@/lib/telegram/commands/handlers/done";
import { handleHelp } from "@/lib/telegram/commands/handlers/help";

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
    if (!rawBody.trim()) {
      obsEnd(obs, 200);
      return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
    }

    const update = JSON.parse(rawBody) as { update_id: number };
    const parsed = telegramUpdateSchema.safeParse(update);
    if (!parsed.success) {
      obsEnd(obs, 200);
      return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
    }

    obsLog("telegram.webhook", { requestId: obs.requestId, route: obs.route, method: obs.method }, { update_id: parsed.data.update_id });

    const maybeText = (update as unknown as { message?: { text?: string } }).message?.text;
    const cmd = typeof maybeText === "string" ? parseCommand(maybeText) : null;
    if (!cmd) {
      obsEnd(obs, 200);
      return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
    }

    const message = (update as unknown as { message?: { chat?: { id?: number }; from?: { id?: number } } }).message;
    const chatIdNum = message?.chat?.id;
    const fromIdNum = message?.from?.id;
    if (typeof chatIdNum !== "number" || typeof fromIdNum !== "number") {
      obsEnd(obs, 200);
      return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
    }

    const chatId = BigInt(chatIdNum);
    const fromId = BigInt(fromIdNum);

    void (async () => {
      try {
        const team = await prisma.team.findFirst({
          where: { telegramChatId: chatId },
          select: { id: true },
        });

        if (!team) {
          await sendMessage(chatId, "This group is not registered. Visit the dashboard to set up.");
          return;
        }

        const actor = await prisma.user.findFirst({
          where: { telegramId: fromId },
          select: { id: true },
        });

        if (!actor) {
          await sendMessage(chatId, "You are not a member of this workspace.");
          return;
        }

        const member = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: team.id, userId: actor.id } },
          select: { isActive: true },
        });

        if (!member?.isActive) {
          await sendMessage(chatId, "You are not a member of this workspace.");
          return;
        }

        const ctx = { teamId: team.id, actorUserId: actor.id, args: cmd.args, chatId };

        let out: string;
        if (cmd.command === "assign") out = await handleAssign(ctx);
        else if (cmd.command === "report") out = await handleReport(ctx);
        else if (cmd.command === "tasks") out = await handleTasks(ctx);
        else if (cmd.command === "done") out = await handleDone(ctx);
        else if (cmd.command === "help") out = await handleHelp(ctx);
        else out = "Unknown command. Use /help to see available commands.";

        await sendMessage(chatId, out);
      } catch (e: unknown) {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            type: "telegram.webhook.command_error",
            requestId: obs.requestId,
            message: e instanceof Error ? e.message : "Command processing error",
          }),
        );
      }
    })();

    obsEnd(obs, 200);
    return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
  } catch (e: unknown) {
    obsError(obs, e, { status: 400 });
    // Never let Telegram webhook time out due to internal errors.
    return jsonOk({ received: true }, { headers: { "x-request-id": obs.requestId } });
  }
}
