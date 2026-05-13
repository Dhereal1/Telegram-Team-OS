import "server-only";

import type { RoleKey } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatPersonName } from "@/lib/ops";
import { listRecentActivity } from "@/services/activity/activity-service";
import { getOrCreateDailyDigest } from "@/services/ai/ai-service";
import { cacheGetJson, cacheSetJson } from "@/modules/performance/cache";

async function getDashboardUncached(teamId: string, options?: { userId?: string; roleKey?: RoleKey | null }) {
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const teamSelect = {
    id: true,
    name: true,
    slug: true,
    telegramChatId: true,
    planTier: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  const [
    team,
    taskPending,
    taskCompleted,
    taskOverdue,
    blockedTasks,
    dueToday,
    reportsToday,
    members,
    activity,
    digest,
    overdueTasks,
    blockedTaskList,
    activeMembers,
    todayReportAuthors,
    myOpenTasks,
    inviteCount,
    totalTaskCount,
    totalReportCount,
  ] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: teamSelect as unknown as never,
    }),
    prisma.task.count({
      where: { teamId, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
    }),
    prisma.task.count({ where: { teamId, archivedAt: null, status: "DONE" } }),
    prisma.task.count({
      where: {
        teamId,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueAt: { lt: new Date() },
      },
    }),
    prisma.task.count({
      where: { teamId, archivedAt: null, status: "BLOCKED" },
    }),
    prisma.task.count({
      where: {
        teamId,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueAt: { gte: startOfTodayUtc, lte: endOfTodayUtc },
      },
    }),
    prisma.report.count({ where: { teamId, createdAt: { gte: startOfTodayUtc } } }),
    prisma.teamMember.count({ where: { teamId, isActive: true } }),
    listRecentActivity(teamId, 18),
    getOrCreateDailyDigest(teamId, {
      startOfTodayUtc,
    }),
    prisma.task.findMany({
      where: {
        teamId,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueAt: { lt: now },
      },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        assignedTo: { select: { username: true, firstName: true, lastName: true } },
      },
    }),
    prisma.task.findMany({
      where: { teamId, archivedAt: null, status: "BLOCKED" },
      orderBy: [{ updatedAt: "desc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
        assignedTo: { select: { username: true, firstName: true, lastName: true } },
      },
    }),
    prisma.teamMember.findMany({
      where: { teamId, isActive: true, role: { key: { in: ["ADMIN", "STAFF"] } } },
      orderBy: { joinedAt: "asc" },
      select: {
        id: true,
        title: true,
        role: { select: { key: true, name: true } },
        user: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    }),
    prisma.report.findMany({
      where: { teamId, createdAt: { gte: startOfTodayUtc } },
      select: { authorId: true },
    }),
    options?.userId
      ? prisma.task.count({
          where: {
            teamId,
            archivedAt: null,
            assignedToId: options.userId,
            status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
          },
        })
      : Promise.resolve(0),
    prisma.teamInvite.count({ where: { teamId } }),
    prisma.task.count({ where: { teamId } }),
    prisma.report.count({ where: { teamId } }),
  ]);

  if (!team) throw new Error("Team not found");
  const teamSafe = team as unknown as {
    id: string;
    name: string;
    slug: string;
    telegramChatId: bigint | null;
    planTier: "FREE" | "PRO" | "BUSINESS";
    createdAt: Date;
    updatedAt: Date;
  };
  const teamDto = {
    ...teamSafe,
    telegramChatId: teamSafe.telegramChatId ? String(teamSafe.telegramChatId) : null,
  };

  const submittedToday = new Set(todayReportAuthors.map((report) => report.authorId));
  const missingReports = activeMembers.filter((member) => !submittedToday.has(member.user.id));
  const completionRate = taskCompleted + taskPending === 0 ? 100 : Math.round((taskCompleted / (taskCompleted + taskPending)) * 100);

  const isDefaultTeamName = teamSafe.name === "Team" || /'s Team$/i.test(teamSafe.name);
  const onboarding = {
    teamNameCustomized: !isDefaultTeamName,
    invitedStaff: inviteCount > 0 || members > 1,
    createdFirstTask: totalTaskCount > 0,
    submittedFirstReport: totalReportCount > 0,
    telegramConnected: teamSafe.telegramChatId !== null,
  };
  const onboardingComplete =
    onboarding.teamNameCustomized &&
    onboarding.invitedStaff &&
    onboarding.createdFirstTask &&
    onboarding.submittedFirstReport &&
    onboarding.telegramConnected;

  const nextAction = !onboarding.teamNameCustomized
    ? "Set team name"
    : !onboarding.invitedStaff
      ? "Invite first staff"
      : !onboarding.createdFirstTask
        ? "Create first task"
        : !onboarding.submittedFirstReport
          ? "Submit first report"
          : !onboarding.telegramConnected
            ? "Connect Telegram chat"
            : "Onboarding complete";

  const focusItems =
    options?.roleKey === "STAFF"
      ? [
          myOpenTasks > 0 ? `${myOpenTasks} active task${myOpenTasks === 1 ? "" : "s"} on your queue.` : "Your queue is clear right now.",
          dueToday > 0 ? `${dueToday} task${dueToday === 1 ? "" : "s"} due today across the team.` : "No tasks due today.",
          blockedTasks > 0 ? `${blockedTasks} blocked item${blockedTasks === 1 ? "" : "s"} need escalation.` : "No blocked work currently flagged.",
        ]
      : [
          taskOverdue > 0 ? `${taskOverdue} overdue task${taskOverdue === 1 ? "" : "s"} need attention.` : "No overdue tasks on the board.",
          missingReports.length > 0
            ? `${missingReports.length} teammate${missingReports.length === 1 ? "" : "s"} have not submitted today.`
            : "Daily reporting coverage is complete so far.",
          blockedTasks > 0 ? `${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"} are slowing execution.` : "No blocked tasks slowing execution.",
        ];

  return {
    team: teamDto,
    stats: {
      taskPending,
      taskCompleted,
      taskOverdue,
      blockedTasks,
      dueToday,
      reportsToday,
      missingReports: missingReports.length,
      completionRate,
      myOpenTasks,
      members,
    },
    onboarding: {
      ...onboarding,
      complete: onboardingComplete,
      nextAction,
    },
    summary: {
      headline:
        options?.roleKey === "STAFF"
          ? myOpenTasks > 0
            ? "Your execution lane is active."
            : "Your lane is currently clear."
          : taskOverdue > 0 || blockedTasks > 0
            ? "Execution needs founder attention."
            : "Operations are moving cleanly.",
      subheadline:
        options?.roleKey === "STAFF"
          ? "Focus on due work, surface blockers early, and close the loop in reports."
          : "Use the feed below to resolve blocked work, chase missing reports, and keep the team shipping.",
      focusItems,
    },
    attention: {
      overdueTasks: overdueTasks.map((task) => ({
        ...task,
        assigneeLabel: formatPersonName(task.assignedTo),
      })),
      blockedTasks: blockedTaskList.map((task) => ({
        ...task,
        assigneeLabel: formatPersonName(task.assignedTo),
      })),
      missingReports: missingReports.map((member) => ({
        id: member.id,
        name: formatPersonName(member.user),
        roleKey: member.role.key,
        title: member.title,
      })),
    },
    activity,
    digest,
  };
}

export type DashboardResult = Awaited<ReturnType<typeof getDashboardUncached>>;

export async function getDashboard(teamId: string, options?: { userId?: string; roleKey?: RoleKey | null }) {
  const cacheKey = options?.userId ? `dash:v1:${teamId}:u:${options.userId}` : `dash:v1:${teamId}:u:none`;
  const cached = await cacheGetJson<DashboardResult>(cacheKey).catch(() => null);
  if (cached) return cached;

  const fresh = await getDashboardUncached(teamId, options);
  void cacheSetJson(cacheKey, fresh, 20).catch(() => {});
  return fresh;
}
