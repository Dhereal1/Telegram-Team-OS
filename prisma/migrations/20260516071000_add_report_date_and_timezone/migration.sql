-- Add Team.timezone (queryable column for scheduler/cron)
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- Add Report.reportDate (date key used for reminders/dedup)
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "reportDate" DATE;

-- Backfill existing rows (best-effort, safe for empty DBs too)
UPDATE "Report"
SET "reportDate" = COALESCE("reportDate", ("createdAt")::date)
WHERE "reportDate" IS NULL;

ALTER TABLE "Report" ALTER COLUMN "reportDate" SET NOT NULL;

-- Enforce one daily report per user per team
CREATE UNIQUE INDEX IF NOT EXISTS "Report_teamId_authorId_reportDate_key"
ON "Report"("teamId", "authorId", "reportDate");

-- Remove unused period fields (replaced by reportDate)
ALTER TABLE "Report" DROP COLUMN IF EXISTS "periodStart";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "periodEnd";

