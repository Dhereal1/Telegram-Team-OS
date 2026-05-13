import "server-only";

import { env } from "@/lib/env";

type TelegramSendMessage = {
  chat_id: number | string;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
  disable_web_page_preview?: boolean;
  reply_markup?: unknown;
};

type TelegramAnswerCallbackQuery = {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
};

async function tgFetch<T>(method: string, body: unknown): Promise<T> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(json.description ?? "Telegram API error");
  return json.result as T;
}

export async function sendMessage(payload: TelegramSendMessage) {
  return tgFetch("sendMessage", payload);
}

export async function answerCallbackQuery(payload: TelegramAnswerCallbackQuery) {
  return tgFetch("answerCallbackQuery", payload);
}
