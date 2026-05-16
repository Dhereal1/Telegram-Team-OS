import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export const reportSelect = {
  id: true,
  title: true,
  body: true,
  status: true,
  reportDate: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  reviewNotes: true,
  reviewedAt: true,
  reviewedById: true,
  author: {
    select: { id: true, username: true, firstName: true, lastName: true },
  },
  reviewedBy: {
    select: { id: true, username: true, firstName: true, lastName: true },
  },
} satisfies Prisma.ReportSelect;

export function listReports(teamId: string, options?: { take?: number; cursorId?: string | null }) {
  const take = options?.take ?? 30;
  return prisma.report.findMany({
    where: { teamId },
    orderBy: [{ updatedAt: "desc" }],
    take,
    ...(options?.cursorId ? { cursor: { id: options.cursorId }, skip: 1 } : {}),
    select: reportSelect,
  });
}

export function createReport(input: {
  teamId: string;
  authorId: string;
  reportDate: Date;
  title: string;
  body: string;
}) {
  return prisma.report.upsert({
    where: { teamId_authorId_reportDate: { teamId: input.teamId, authorId: input.authorId, reportDate: input.reportDate } },
    create: {
      teamId: input.teamId,
      authorId: input.authorId,
      reportDate: input.reportDate,
      title: input.title,
      body: input.body,
      status: "SUBMITTED",
    },
    update: {
      title: input.title,
      body: input.body,
      status: "SUBMITTED",
      updatedAt: new Date(),
    },
    select: reportSelect,
  });
}

export function getReport(teamId: string, reportId: string) {
  return prisma.report.findFirst({
    where: { id: reportId, teamId },
    select: reportSelect,
  });
}

export function reviewReport(input: {
  teamId: string;
  reportId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  return prisma.report.update({
    where: { id: input.reportId },
    data: {
      status: "REVIEWED",
      reviewNotes: input.reviewNotes ?? undefined,
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
    },
    select: reportSelect,
  });
}

export function getLatestSummary(teamId: string, reportId: string) {
  return prisma.aIInsight.findFirst({
    where: { teamId, reportId, type: "SUMMARY" },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });
}
