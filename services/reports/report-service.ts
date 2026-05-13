import * as v2 from "@/modules/reports/reports.service";

export function listReports(teamId: string) {
  return v2.listReports(teamId);
}

export function getReport(teamId: string, reportId: string) {
  return v2.getReport(teamId, reportId);
}

export async function createReport(input: {
  teamId: string;
  authorId: string;
  title: string;
  body: string;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  return v2.createReport({
    teamId: input.teamId,
    actorId: input.authorId,
    title: input.title,
    body: input.body,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });
}

export async function reviewReport(input: {
  teamId: string;
  reportId: string;
  reviewerId: string;
  reviewNotes?: string | null;
}) {
  return v2.reviewReport({
    teamId: input.teamId,
    actorId: input.reviewerId,
    reportId: input.reportId,
    reviewNotes: input.reviewNotes ?? undefined,
  });
}

