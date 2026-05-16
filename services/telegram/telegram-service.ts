import "server-only";

import { answerCallbackQuery, sendMessage } from "@/lib/telegram/bot";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { listTasks, updateTask } from "@/services/tasks/task-service";
import { createReport } from "@/services/reports/report-service";
import { logActivity } from "@/services/activity/activity-service";
import { redis } from "@/lib/redis/redis";
import { formatPersonName, formatTaskStatus, getDueState } from "@/lib/ops";

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: { id: number; type: string; title?: string; username?: string };
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      chat: { id: number; type: string };
    };
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
  };
};

function normalizeUsername(input: string) {
  return input.replace(/^@/, "").trim().toLowerCase();
}

function commandKeyboard() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return {
    inline_keyboard: [
      [
        appUrl
          ? {
              text: "Open TeamOS",
              web_app: { url: `${appUrl.replace(/\/$/, "")}/dashboard` },
            }
          : { text: "View tasks", callback_data: "cmd:tasks" },
      ],
      [
        { text: "My tasks", callback_data: "cmd:tasks" },
        { text: "Report prompt", callback_data: "cmd:report_prompt" },
      ],
    ],
  };
}

async function sendRichMessage(input: {
  chatId: number;
  text: string;
  replyMarkup?: unknown;
}) {
  await sendMessage(input.chatId, input.text, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: input.replyMarkup,
  });
}

async function isDuplicateUpdate(updateId: number) {
  const key = `tg:webhook:${updateId}`;

  if (redis) {
    const created = await redis.set(key, "1", { nx: true, ex: 60 * 60 * 6 });
    return created !== "OK";
  }

  const existing = await prisma.activityLog.findFirst({
    where: {
      action: "telegram.webhook_received",
      entityType: "TelegramUpdate",
      entityId: String(updateId),
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function resolveTeamAndActor(update: TelegramUpdate) {
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  const fromId = update.message?.from?.id ?? update.callback_query?.from?.id;
  if (!chatId || !fromId) return null;

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(fromId) },
    select: { id: true, username: true, firstName: true },
  });
  if (!user) return { chatId, user: null, teamId: null, roleKey: null };

  const teamByChat = await prisma.team.findFirst({
    where: { telegramChatId: BigInt(chatId) },
    select: { id: true },
  });
  const teamId =
    teamByChat?.id ??
    (await prisma.teamMember
      .findFirst({ where: { userId: user.id, isActive: true }, orderBy: { joinedAt: "asc" }, select: { teamId: true } })
      .then((m) => m?.teamId ?? null));

  if (teamId && !teamByChat) {
    await prisma.team.update({ where: { id: teamId }, data: { telegramChatId: BigInt(chatId) } }).catch(() => {});
  }

  const roleKey = teamId
    ? await prisma.teamMember
        .findUnique({
          where: { teamId_userId: { teamId, userId: user.id } },
          select: { role: { select: { key: true } }, isActive: true },
        })
        .then((m) => (m?.isActive ? m.role.key : null))
    : null;

  return { chatId, user, teamId, roleKey };
}

async function renderTasksCommand(ctx: NonNullable<Awaited<ReturnType<typeof resolveTeamAndActor>>>) {
  const tasks = await listTasks(ctx.teamId!);
  const visible = can(ctx.roleKey, "ADMIN")
    ? tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELED").slice(0, 6)
    : tasks
        .filter((task) => task.assignedToId === ctx.user?.id && task.status !== "DONE" && task.status !== "CANCELED")
        .slice(0, 6);

  if (!visible.length) {
    return {
      text:
        ctx.roleKey === "STAFF"
          ? "<b>Your lane is clear.</b>\nNo active assigned tasks right now.\n\n<i>Built by Dhereal1</i>"
          : "<b>No open tasks.</b>\nThe board is currently clear.\n\n<i>Built by Dhereal1</i>",
      replyMarkup: commandKeyboard(),
    };
  }

  const lines = visible.map((task) => {
    const due = getDueState(task.dueAt);
    return `• <b>${task.title}</b>\n  ${formatTaskStatus(task.status)} · ${due.label} · ${formatPersonName(task.assignedTo)}`;
  });

  return {
    text: [
      `<b>${can(ctx.roleKey, "ADMIN") ? "Open execution board" : "Your task lane"}</b>`,
      `${visible.length} priority item${visible.length === 1 ? "" : "s"} surfaced from TeamOS.`,
      "",
      ...lines,
      "",
      "<i>Built by Dhereal1</i>",
    ].join("\n"),
    replyMarkup: commandKeyboard(),
  };
}

function renderHelpCommand(roleKey: string | null) {
  const base = [
    "<b>Dhereal TeamOS command center</b>",
    "Founder-grade Telegram operations for Dhereal1 teams.",
    "",
    "<b>Core commands</b>",
    "/start - reconnect your control surface",
    "/tasks - view active execution",
    "/report &lt;text&gt; - submit a daily closeout",
  ];

  if (roleKey && can(roleKey as "FOUNDER" | "ADMIN" | "STAFF", "ADMIN")) {
    base.push("/assign &lt;taskId&gt; @username - move ownership");
  }

  base.push("", "<b>Daily flow</b>", "1. Check /tasks", "2. Execute work", "3. Submit /report", "", "<i>Built by Dhereal1</i>");
  return base.join("\n");
}

export async function handleWebhookUpdate(update: TelegramUpdate) {
  if (await isDuplicateUpdate(update.update_id)) return;

  const text = update.message?.text?.trim() ?? update.callback_query?.data?.trim();
  if (!text) return;
  const ctx = await resolveTeamAndActor(update);
  if (!ctx?.chatId) return;

  if (ctx.teamId) {
    await logActivity({
      teamId: ctx.teamId,
      actorId: ctx.user?.id ?? null,
      action: "telegram.webhook_received",
      entityType: "TelegramUpdate",
      entityId: String(update.update_id),
      metadata: { text: text.slice(0, 200) },
    }).catch(() => {});
  }

  const chatId = ctx.chatId;
  const callbackId = update.callback_query?.id;

  if (callbackId) {
    await answerCallbackQuery(callbackId).catch(() => {});
  }

  const normalizedText = text.startsWith("cmd:tasks")
    ? "/tasks"
    : text.startsWith("cmd:report_prompt")
      ? "/report"
      : text;

  if (normalizedText.startsWith("/start")) {
    if (!ctx.user) {
      await sendRichMessage({
        chatId,
        text:
          "<b>Welcome to Dhereal TeamOS.</b>\nLogin through the Mini App first, then return here for commands and updates.\n\n<i>Built by Dhereal1</i>",
        replyMarkup: commandKeyboard(),
      });
      return;
    }
    await sendRichMessage({
      chatId,
      text:
        "<b>Dhereal TeamOS is live.</b>\nUse this chat for fast task visibility, report submission, and assignment control.\n\n<i>Built by Dhereal1</i>",
      replyMarkup: commandKeyboard(),
    });
    return;
  }

  if (normalizedText.startsWith("/help")) {
    await sendRichMessage({
      chatId,
      text: renderHelpCommand(ctx.roleKey),
      replyMarkup: commandKeyboard(),
    });
    return;
  }

  if (!ctx.user || !ctx.teamId || !ctx.roleKey) {
    await sendRichMessage({
      chatId,
      text: "<b>Team context missing.</b>\nLogin through the Mini App to connect your account and team.\n\n<i>Built by Dhereal1</i>",
      replyMarkup: commandKeyboard(),
    });
    return;
  }

  if (normalizedText.startsWith("/tasks")) {
    const message = await renderTasksCommand(ctx);
    await sendRichMessage({ chatId, text: message.text, replyMarkup: message.replyMarkup });
    return;
  }

  if (normalizedText.startsWith("/report")) {
    const body = normalizedText.replace("/report", "").trim();
    if (!body) {
      await sendRichMessage({
        chatId,
        text:
          "<b>Daily report prompt</b>\nUse:\n<code>/report What was completed? | What is blocked? | What needs attention next?</code>\n\nFast example:\n<code>/report Completed onboarding review. Blocked on client files. Need founder approval tomorrow.</code>\n\n<i>Built by Dhereal1</i>",
        replyMarkup: commandKeyboard(),
      });
      return;
    }
    const title = `Telegram report · ${new Date().toISOString().slice(0, 10)}`;
    const report = await createReport({ teamId: ctx.teamId, authorId: ctx.user.id, title, body });
    await sendRichMessage({
      chatId,
      text: `<b>Report submitted.</b>\nSaved as <code>${report.id}</code> and pushed into founder review.\n\n<i>Built by Dhereal1</i>`,
      replyMarkup: commandKeyboard(),
    });
    return;
  }

  if (normalizedText.startsWith("/assign")) {
    if (!can(ctx.roleKey, "ADMIN")) {
      await sendRichMessage({
        chatId,
        text: "<b>Permission denied.</b>\nFounder or admin access is required for assignment changes.\n\n<i>Built by Dhereal1</i>",
      });
      return;
    }
    const parts = normalizedText.split(/\s+/).slice(1);
    const taskId = parts[0];
    const usernameRaw = parts[1];
    if (!taskId || !usernameRaw) {
      await sendRichMessage({
        chatId,
        text: "<b>Assignment format</b>\n<code>/assign &lt;taskId&gt; @username</code>\n\n<i>Built by Dhereal1</i>",
      });
      return;
    }
    const username = normalizeUsername(usernameRaw);
    const assignee = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true, firstName: true, lastName: true },
    });
    if (!assignee) {
      await sendRichMessage({ chatId, text: "<b>User not found.</b>\nCheck the Telegram username and try again.\n\n<i>Built by Dhereal1</i>" });
      return;
    }
    const task = await prisma.task.findFirst({ where: { id: taskId, teamId: ctx.teamId, archivedAt: null } });
    if (!task) {
      await sendRichMessage({ chatId, text: "<b>Task not found.</b>\nCheck the task ID from `/tasks` and try again.\n\n<i>Built by Dhereal1</i>" });
      return;
    }
    await updateTask({ teamId: ctx.teamId, taskId, assignedToId: assignee.id, actorId: ctx.user.id });
    await logActivity({
      teamId: ctx.teamId,
      actorId: ctx.user.id,
      action: "task.assigned",
      entityType: "Task",
      entityId: taskId,
      metadata: { assignedToUsername: username },
    });
    await sendRichMessage({
      chatId,
      text: `<b>Assignment updated.</b>\n<b>${task.title}</b> is now owned by ${formatPersonName(assignee)}.\n\n<i>Built by Dhereal1</i>`,
      replyMarkup: commandKeyboard(),
    });
    return;
  }

  await sendRichMessage({
    chatId,
    text: "<b>Command not recognized.</b>\nUse /help for the available founder and staff workflows.\n\n<i>Built by Dhereal1</i>",
    replyMarkup: commandKeyboard(),
  });
}
