import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";

function parseInviteToken(raw: string | undefined | null) {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.startsWith("ws_") ? t.slice(3) : t;
}

export async function handleStart(
  ctx: CommandContext,
): Promise<string> {
  const isGroup = ctx.chatType === "group" || ctx.chatType === "supergroup";
  const isPrivate = ctx.chatType === "private";

  if (isPrivate) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return `Hi! To get started, add me to your team's Telegram group using the invite link from your dashboard at ${appUrl || "[NEXT_PUBLIC_APP_URL]"}`;
  }

  if (!isGroup) {
    return "Unsupported chat type.";
  }

  const token = parseInviteToken(ctx.args[0]);
  if (!token) {
    return "To link this group to your workspace, use the invite link from your dashboard. It looks like: t.me/YourBot?start=ws_yourtoken";
  }

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      usedAt: true,
      team: { select: { id: true, name: true, telegramChatId: true } },
    },
  });

  if (!invite || !invite.team) return "Invalid invite link. Please get a fresh link from your dashboard.";
  if (invite.expiresAt.getTime() <= Date.now()) return "This invite link has expired. Please generate a new one from your dashboard.";

  const existingChat = invite.team.telegramChatId;
  if (existingChat && existingChat !== ctx.chatId) return "This workspace is already linked to a different group.";
  if (existingChat && existingChat === ctx.chatId) {
    return `This group is already linked to ${invite.team.name}. Type /help to see available commands.`;
  }

  if (!ctx.actorUserId) {
    return "Please sign in to TeamOS first, then use the invite link from your dashboard to link this group.";
  }

  await prisma.team.update({ where: { id: invite.team.id }, data: { telegramChatId: ctx.chatId } });
  await prisma.teamInvite.update({ where: { id: invite.id }, data: { usedAt: new Date(), usedById: ctx.actorUserId } });
  await prisma.activityLog.create({
    data: {
      teamId: invite.team.id,
      actorId: ctx.actorUserId,
      action: "team.telegram_linked",
      entityType: "Team",
      entityId: invite.team.id,
      metadata: { chatId: ctx.chatId.toString() },
    },
  });

  return [
    `Workspace linked! Welcome to ${invite.team.name} on Dhereal TeamOS.`,
    "",
    "Your team can now use:",
    "/assign @user task — assign a task",
    "/report — submit daily report",
    "/tasks — view open tasks",
    "/help — all commands",
    "",
    "Get started by assigning your first task.",
  ].join("\n");
}

