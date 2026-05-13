import "server-only";

import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/services/activity/activity-service";
import { summarizeAndStore } from "@/services/ai/ai-service";
import { recordUsage } from "@/services/billing/billing-service";

export async function listReports(teamId: string) {
  return prisma.report.findMany({
    where: { teamId },
    orderBy: [{ updatedAt: "desc" }],
    take: 30,
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      periodStart: true,
      periodEnd: true,
      reviewNotes: true,
      reviewedAt: true,
      reviewedById: true,
      author: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
      reviewedBy: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function createReport(input: {
  teamId: string;
  authorId: string;
  title: string;
  body: string;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  const report = await prisma.report.create({
    data: {
      teamId: input.teamId,
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: "SUBMITTED",
    },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      periodStart: true,
      periodEnd: true,
      reviewNotes: true,
      reviewedAt: true,
      reviewedById: true,
      author: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
      reviewedBy: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
    },
  });

  void recordUsage({ teamId: input.teamId, key: "reports" }).catch(() => {});

  await logActivity({
    teamId: input.teamId,
    actorId: input.authorId,
    action: "report.submitted",
    entityType: "Report",
    entityId: report.id,
    metadata: { title: report.title },
  });

  void summarizeAndStore(input.teamId, report.id, report.body).catch(() => {});
  return report;
}

export async function getReport(teamId: string, reportId: string) {
  return prisma.report.findFirst({
    where: { id: reportId, teamId },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      periodStart: true,
      periodEnd: true,
      reviewNotes: true,
      reviewedAt: true,
      reviewedById: true,
      author: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
      reviewedBy: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function reviewReport(input: {
  teamId: string;
  reportId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  const updated = await prisma.report.update({
    where: { id: input.reportId },
    data: {
      status: "REVIEWED",
      reviewNotes: input.reviewNotes ?? undefined,
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
    },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      periodStart: true,
      periodEnd: true,
      reviewNotes: true,
      reviewedAt: true,
      reviewedById: true,
      author: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
      reviewedBy: {
        select: { id: true, username: true, firstName: true, lastName: true },
      },
    },
  });

  await logActivity({
    teamId: input.teamId,
    actorId: input.reviewerId,
    action: "report.reviewed",
    entityType: "Report",
    entityId: updated.id,
    metadata: { title: updated.title },
  });

  return updated;
}
