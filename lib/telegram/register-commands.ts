import "server-only";

import { env } from "@/lib/env";

type TelegramBotCommand = { command: string; description: string };

export async function registerBotCommands() {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set (required to register Telegram commands)");

  const commands: TelegramBotCommand[] = [
    { command: "start", description: "Link this group to your workspace" },
    { command: "assign", description: "Assign a task: /assign @user task title" },
    { command: "report", description: "Submit your daily report" },
    { command: "tasks", description: "View open tasks" },
    { command: "mytasks", description: "View your assigned tasks" },
    { command: "done", description: "Mark a task done: /done taskId" },
    { command: "approve", description: "Approve a pending member: /approve @user" },
    { command: "remove", description: "Remove a member: /remove @user" },
    { command: "summary", description: "Team performance summary (admin only)" },
    { command: "help", description: "Show available commands" },
  ];

  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ commands, scope: { type: "all_group_chats" } }),
  });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(json.description ?? "Telegram setMyCommands failed");
}
