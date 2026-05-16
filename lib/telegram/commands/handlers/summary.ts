import "server-only";

import type { CommandContext } from "@/lib/telegram/commands/handlers/types";
import { prisma } from "@/lib/db/prisma";
import { calculateTeamScores } from "@/lib/scores/calculate-team-scores";
import { getMissedReportsToday } from "@/lib/reports/missed-reports";

function isAdminRole(roleKey: string | null | undefined) {
  return roleKey === "FOUNDER" || roleKey === "ADMIN";
}

function emojiFor(label: "Excellent" | "Good" | "Fair" | "Low") {
  if (label === "Excellent") return "🟢";
  if (label === "Good") return "🟡";
  if (label === "Fair") return "🟠";
  return "🔴";
}

export async function handleSummary(ctx: CommandContext): Promise<string> {
  const actorMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: ctx.teamId, userId: ctx.actorUserId } },
    select: { isActive: true, status: true, role: { select: { key: true } } },
  });
  if (!actorMembership?.isActive || actorMembership.status !== "ACTIVE" || !isAdminRole(actorMembership.role.key)) {
    return "Only admins can view the team summary.";
  }

  const [scores, missed, openTasks, overdueTasks, membersCount] = await Promise.all([
    calculateTeamScores(ctx.teamId, 7),
    getMissedReportsToday(ctx.teamId),
    prisma.task.count({
      where: { teamId: ctx.teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
    }),
    prisma.task.count({
      where: { teamId: ctx.teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: new Date() } },
    }),
    prisma.teamMember.count({ where: { teamId: ctx.teamId, isActive: true, status: "ACTIVE" } }),
  ]);

  const perfLines = scores.map((s) => {
    const name = s.username ? `@${s.username}` : s.firstName ?? s.userId.slice(0, 6);
    return `${emojiFor(s.label)} ${name} — ${s.totalScore}/100 (${s.label})`;
  });

  const reportsSubmitted = membersCount - missed.length;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  return [
    "Team summary — last 7 days",
    "",
    "Performance:",
    ...perfLines,
    "🟢 = Excellent, 🟡 = Good, 🟠 = Fair, 🔴 = Low",
    "",
    "Today:",
    `• Reports submitted: ${reportsSubmitted} / ${membersCount} members`,
    `• Open tasks: ${openTasks} (${overdueTasks} overdue)`,
    "",
    `View full dashboard: ${appUrl ? `${appUrl}/dashboard` : "[NEXT_PUBLIC_APP_URL]/dashboard"}`,
  ].join("\n");
}

