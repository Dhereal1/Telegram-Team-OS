import "server-only";

import { HttpError } from "@/packages/core/http-error";
import { emitDomainEvent } from "@/modules/events/event-dispatcher";
import * as repo from "@/modules/reports/reports.repository";
import { recordUsage } from "@/services/billing/billing-service";
import { summarizeAndStore } from "@/services/ai/ai-service";

export function listReports(teamId: string, options?: { take?: number; cursorId?: string | null }) {
  return repo.listReports(teamId, options);
}

export function getReport(teamId: string, reportId: string) {
  return repo.getReport(teamId, reportId);
}

export async function createReport(input: {
  teamId: string;
  actorId: string;
  reportDate: Date;
  title: string;
  body: string;
}) {
  const report = await repo.createReport({
    teamId: input.teamId,
    authorId: input.actorId,
    reportDate: input.reportDate,
    title: input.title,
    body: input.body,
  });

  void recordUsage({ teamId: input.teamId, key: "reports" }).catch(() => {});
  void summarizeAndStore(input.teamId, report.id, report.body).catch(() => {});
  void emitDomainEvent("report.submitted", { teamId: input.teamId, actorId: input.actorId, reportId: report.id, title: report.title });

  return report;
}

export async function reviewReport(input: {
  teamId: string;
  actorId: string;
  reportId: string;
  reviewNotes?: string | null;
}) {
  const existing = await repo.getReport(input.teamId, input.reportId);
  if (!existing) throw new HttpError("Not found", 404, "NOT_FOUND");
  const updated = await repo.reviewReport({
    teamId: input.teamId,
    reportId: input.reportId,
    reviewerId: input.actorId,
    reviewNotes: input.reviewNotes ?? undefined,
  });
  // Keep the old audit verb for compatibility; event system can be expanded later.
  return updated;
}

export async function getReportWithSummary(teamId: string, reportId: string) {
  const report = await repo.getReport(teamId, reportId);
  if (!report) throw new HttpError("Not found", 404, "NOT_FOUND");
  const summary = await repo.getLatestSummary(teamId, reportId);
  return { report, summary: summary?.content ?? null };
}
