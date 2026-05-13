export type SummarizeReportInput = {
  reportText: string;
};

export type ScoreStaffInput = {
  staffUserId: string;
  signals: Array<{ key: string; value: number }>;
};

export type DailyDigestInput = {
  teamId: string;
  metrics?: {
    overdueTasks: number;
    blockedTasks: number;
    reportsToday: number;
    missingReports: number;
  };
  items: Array<{ title: string; body: string }>;
};

export interface AIProvider {
  id: string;
  summarizeReport(input: SummarizeReportInput): Promise<string>;
  scoreStaffPerformance(input: ScoreStaffInput): Promise<{ score: number; rationale: string }>;
  generateDailyDigest(input: DailyDigestInput): Promise<string>;
}
