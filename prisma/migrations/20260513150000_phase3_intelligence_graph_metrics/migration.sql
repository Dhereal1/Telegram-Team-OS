-- Phase 3 foundations: OperationalInsights, org graph edges, metrics timeseries.
-- Generated manually to allow offline development; validate on Neon before prod.

CREATE TYPE "InsightStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "InsightRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "GraphEdgeType" AS ENUM ('REPORTS_TO', 'COLLABORATES_WITH', 'DELEGATES_TO', 'REVIEWS_FOR');

CREATE TABLE "OperationalInsight" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "status" "InsightStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "InsightSeverity" NOT NULL DEFAULT 'INFO',
  "score" INTEGER NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "recommendation" TEXT,
  "evidence" JSONB,
  "dedupeKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalInsight_teamId_createdAt_idx" ON "OperationalInsight"("teamId", "createdAt");
CREATE INDEX "OperationalInsight_teamId_key_createdAt_idx" ON "OperationalInsight"("teamId", "key", "createdAt");
CREATE INDEX "OperationalInsight_status_createdAt_idx" ON "OperationalInsight"("status", "createdAt");
CREATE UNIQUE INDEX "OperationalInsight_teamId_key_dedupeKey_key" ON "OperationalInsight"("teamId", "key", "dedupeKey");

ALTER TABLE "OperationalInsight" ADD CONSTRAINT "OperationalInsight_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InsightRun" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" "InsightRunStatus" NOT NULL DEFAULT 'RUNNING',
  "stats" JSONB,
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "InsightRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsightRun_teamId_startedAt_idx" ON "InsightRun"("teamId", "startedAt");
CREATE INDEX "InsightRun_status_startedAt_idx" ON "InsightRun"("status", "startedAt");

ALTER TABLE "InsightRun" ADD CONSTRAINT "InsightRun_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrgGraphEdge" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "type" "GraphEdgeType" NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "OrgGraphEdge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgGraphEdge_teamId_type_fromUserId_toUserId_key" ON "OrgGraphEdge"("teamId", "type", "fromUserId", "toUserId");
CREATE INDEX "OrgGraphEdge_teamId_type_idx" ON "OrgGraphEdge"("teamId", "type");
CREATE INDEX "OrgGraphEdge_fromUserId_idx" ON "OrgGraphEdge"("fromUserId");
CREATE INDEX "OrgGraphEdge_toUserId_idx" ON "OrgGraphEdge"("toUserId");

ALTER TABLE "OrgGraphEdge" ADD CONSTRAINT "OrgGraphEdge_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgGraphEdge" ADD CONSTRAINT "OrgGraphEdge_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgGraphEdge" ADD CONSTRAINT "OrgGraphEdge_toUserId_fkey"
  FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MetricTimeseriesPoint" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "value" DOUBLE PRECISION NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "MetricTimeseriesPoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetricTimeseriesPoint_teamId_key_ts_idx" ON "MetricTimeseriesPoint"("teamId", "key", "ts");
CREATE INDEX "MetricTimeseriesPoint_key_ts_idx" ON "MetricTimeseriesPoint"("key", "ts");

ALTER TABLE "MetricTimeseriesPoint" ADD CONSTRAINT "MetricTimeseriesPoint_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

