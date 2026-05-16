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
  const chatId =
    typeof p.chatId === "number"
      ? p.chatId
      : typeof p.chatId === "string" && /^\d+$/.test(p.chatId)
        ? BigInt(p.chatId)
        : null;
  if (!chatId) throw new HttpError("Unsupported Telegram chatId format", 400, "INVALID_PAYLOAD");

  await sendMessage(chatId, p.text, {
    parse_mode: p.parseMode ?? "HTML",
    disable_web_page_preview: p.disableWebPreview ?? true,
    reply_markup: p.replyMarkup,
  });
}
