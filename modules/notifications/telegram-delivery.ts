import "server-only";

import { sendMessage } from "@/lib/telegram/bot";
import { HttpError } from "@/packages/core/http-error";

type TelegramNotificationPayload = {
  chatId: number | string;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPreview?: boolean;
  replyMarkup?: unknown;
};

export async function deliverTelegramNotification(payload: unknown) {
  const p = payload as Partial<TelegramNotificationPayload>;
  if (!p.chatId || !p.text) throw new HttpError("Invalid telegram notification payload", 400, "INVALID_PAYLOAD");
  await sendMessage(BigInt(p.chatId), p.text, {
    parse_mode: p.parseMode ?? "HTML",
    disable_web_page_preview: p.disableWebPreview ?? true,
    reply_markup: p.replyMarkup,
  });
}
