import { env } from "@/lib/env";
import { jsonOk } from "@/lib/utils/api";
import { obsEnd, obsError, obsStart, obsLog } from "@/lib/obs/server";
import { enforceRateLimit } from "@/lib/ratelimit";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { parseCommand } from "@/lib/telegram/commands/parser";
import { sendMessage } from "@/lib/telegram/bot";
import { logSecurityEvent } from "@/modules/security/security-events.service";
import { handleAssign } from "@/lib/telegram/commands/handlers/assign";
import { handleReport } from "@/lib/telegram/commands/handlers/report";
import { handleTasks } from "@/lib/telegram/commands/handlers/tasks";
import { handleDone } from "@/lib/telegram/commands/handlers/done";
import { handleHelp } from "@/lib/telegram/commands/handlers/help";
import { handleStart } from "@/lib/telegram/commands/handlers/start";
import { handleApprove } from "@/lib/telegram/commands/handlers/approve";
import { handleRemove } from "@/lib/telegram/commands/handlers/remove";
import { handleMyTasks } from "@/lib/telegram/commands/handlers/mytasks";
import { handleSummary } from "@/lib/telegram/commands/handlers/summary";
import { handleSetRole } from "@/lib/telegram/commands/handlers/setrole";
import { handleOverdue } from "@/lib/telegram/commands/handlers/overdue";
import { handleStatus } from "@/lib/telegram/commands/handlers/status";

export const dynamic = "force-dynamic";

const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
}).passthrough();

export async function POST(request: Request) {
  const obs = obsStart(request, "/api/telegram/webhook");
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  const header = request.headers.get("x-telegram-bot-api-secret-token");
  if (!header) {
    void logSecurityEvent({
      type: "webhook.invalid_secret",
      severity: "WARNING",
      message: "Missing Telegram webhook secret header",
      metadata: { ip: request.headers.get("x-forwarded-for") },
    });
    return new Response("Forbidden", { status: 403, headers: { "x-request-id": obs.requestId } });
  }

  const secretBuf = Buffer.from(secret);
  const headerBuf = Buffer.from(header);
  const ok = secretBuf.length === headerBuf.length && crypto.timingSafeEqual(secretBuf, headerBuf);
  if (!ok) {
    void logSecurityEvent({
      type: "webhook.invalid_secret",
      severity: "WARNING",
      message: "Invalid Telegram webhook secret token",
      metadata: { ip: request.headers.get("x-forwarded-for") },
    });
    return new Response("Forbidden", { status: 403, headers: { "x-request-id": obs.requestId } });
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
    const chatType = (update as unknown as { message?: { chat?: { type?: string } } }).message?.chat?.type ?? "unknown";

    void (async () => {
      try {
        // /start is the onboarding entry point and may run before the user is a workspace member.
        if (cmd.command === "start") {
          const actor = await prisma.user.findFirst({ where: { telegramId: fromId }, select: { id: true } });
          const out = await handleStart({
            teamId: "",
            actorUserId: actor?.id ?? "",
            args: cmd.args,
            chatId,
            chatType,
            fromTelegramId: fromId,
          });
          await sendMessage(chatId, out);
          return;
        }

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

        const ctx = { teamId: team.id, actorUserId: actor.id, args: cmd.args, chatId, chatType, fromTelegramId: fromId };

        let out: string;
        if (cmd.command === "assign") out = await handleAssign(ctx);
        else if (cmd.command === "report") out = await handleReport(ctx);
        else if (cmd.command === "tasks") out = await handleTasks(ctx);
        else if (cmd.command === "mytasks") out = await handleMyTasks(ctx);
        else if (cmd.command === "done") out = await handleDone(ctx);
        else if (cmd.command === "overdue") out = await handleOverdue(ctx);
        else if (cmd.command === "help") out = await handleHelp(ctx);
        else if (cmd.command === "approve") out = await handleApprove(ctx);
        else if (cmd.command === "remove") out = await handleRemove(ctx);
        else if (cmd.command === "setrole") out = await handleSetRole(ctx);
        else if (cmd.command === "status") out = await handleStatus(ctx);
        else if (cmd.command === "summary") out = await handleSummary(ctx);
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
        try {
          await sendMessage(chatId, "An error occurred. Please try again.");
        } catch {
          // ignore
        }
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
