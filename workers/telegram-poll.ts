import "dotenv/config";
import "@/modules/bootstrap/server";

import { env } from "@/lib/env";
import { handleWebhookUpdate } from "@/services/telegram/telegram-service";

type TelegramUpdateEnvelope = { ok: true; result: unknown[] } | { ok: false; description?: string };

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function tgGetUpdates(input: { offset?: number; timeoutSeconds?: number }) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  url.searchParams.set("allowed_updates", JSON.stringify(["message", "callback_query"]));
  if (typeof input.offset === "number") url.searchParams.set("offset", String(input.offset));
  url.searchParams.set("timeout", String(input.timeoutSeconds ?? 25));

  const res = await fetch(url, { method: "GET" });
  const json = (await res.json()) as TelegramUpdateEnvelope;
  if (!json.ok) throw new Error(("description" in json && json.description) || "Telegram getUpdates failed");
  return json.result as unknown[];
}

async function tgDeleteWebhook() {
  const token = env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: "POST" });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(json.description ?? "Telegram deleteWebhook failed");
}

function log(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), type: "telegram.poller", event, ...extra }));
}

async function main() {
  log("started");

  if (process.env.TELEGRAM_POLL_DELETE_WEBHOOK === "1") {
    try {
      await tgDeleteWebhook();
      log("deleteWebhook.ok");
    } catch (e: unknown) {
      log("deleteWebhook.error", { message: e instanceof Error ? e.message : "deleteWebhook failed" });
    }
  }

  let offset: number | undefined = undefined;
  while (true) {
    try {
      const updates = await tgGetUpdates({ offset, timeoutSeconds: 25 });
      for (const u of updates) {
        const update = u as { update_id?: number };
        if (typeof update.update_id === "number") offset = update.update_id + 1;
        await handleWebhookUpdate(u as never);
      }
    } catch (e: unknown) {
      log("error", { message: e instanceof Error ? e.message : "Poller error" });
      await sleep(1500);
    }
  }
}

void main();
