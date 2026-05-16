import "server-only";

import { env } from "@/lib/env";

async function tgFetch<T>(method: string, body: unknown): Promise<T> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set (required to call Telegram Bot API)");
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(json.description ?? "Telegram API error");
  return json.result as T;
}

export async function sendMessage(
  chatId: number | bigint,
  text: string,
  options?: {
    parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
    disable_web_page_preview?: boolean;
    reply_markup?: unknown;
  },
) {
  return tgFetch("sendMessage", {
    chat_id: typeof chatId === "bigint" ? chatId.toString() : chatId,
    text,
    ...options,
  });
}

export async function sendDM(telegramUserId: number | bigint, text: string) {
  return sendMessage(telegramUserId, text);
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return tgFetch("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}
