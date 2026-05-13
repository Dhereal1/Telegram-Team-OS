-- Phase 9 foundations: explainability, orchestration suggestions, predictions, risks, and insight kinds.

-- Enums
CREATE TYPE "InsightKind" AS ENUM ('OPERATIONAL', 'STRATEGIC', 'PREDICTION', 'RISK', 'ORCHESTRATION', 'SIMULATION');
CREATE TYPE "ExplainabilityKind" AS ENUM ('RECOMMENDATION', 'PREDICTION', 'RISK', 'ORCHESTRATION', 'SIMULATION');
CREATE TYPE "OrchestrationSuggestionStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELED');
CREATE TYPE "PredictionKind" AS ENUM ('WORKFLOW_DELAY', 'BURNOUT_RISK', 'OVERLOAD', 'ESCALATION_PROBABILITY', 'RECURRING_FAILURE');
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SimulationRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- OperationalInsight additions
ALTER TABLE "OperationalInsight" ADD COLUMN IF NOT EXISTS "kind" "InsightKind" NOT NULL DEFAULT 'OPERATIONAL';
ALTER TABLE "OperationalInsight" ADD COLUMN IF NOT EXISTS "explainLogId" TEXT;

-- ExplainabilityLog
CREATE TABLE "ExplainabilityLog" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "kind" "ExplainabilityKind" NOT NULL,
  "engine" TEXT NOT NULL,
  "model" TEXT,
  "inputHash" TEXT,
  "trace" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExplainabilityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExplainabilityLog_teamId_createdAt_idx" ON "ExplainabilityLog"("teamId", "createdAt");
CREATE INDEX "ExplainabilityLog_teamId_kind_createdAt_idx" ON "ExplainabilityLog"("teamId", "kind", "createdAt");

ALTER TABLE "ExplainabilityLog" ADD CONSTRAINT "ExplainabilityLog_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OperationalInsight" ADD CONSTRAINT "OperationalInsight_explainLogId_fkey"
  FOREIGN KEY ("explainLogId") REFERENCES "ExplainabilityLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrchestrationSuggestion
CREATE TABLE "OrchestrationSuggestion" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "status" "OrchestrationSuggestionStatus" NOT NULL DEFAULT 'PROPOSED',
  "createdByUserId" TEXT,
  "decidedByUserId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrchestrationSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrchestrationSuggestion_teamId_status_createdAt_idx" ON "OrchestrationSuggestion"("teamId", "status", "createdAt");
CREATE INDEX "OrchestrationSuggestion_teamId_type_createdAt_idx" ON "OrchestrationSuggestion"("teamId", "type", "createdAt");

ALTER TABLE "OrchestrationSuggestion" ADD CONSTRAINT "OrchestrationSuggestion_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrchestrationSuggestion" ADD CONSTRAINT "OrchestrationSuggestion_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrchestrationSuggestion" ADD CONSTRAINT "OrchestrationSuggestion_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PredictionSignal
CREATE TABLE "PredictionSignal" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "kind" "PredictionKind" NOT NULL,
  "userId" TEXT,
  "workflowId" TEXT,
  "taskId" TEXT,
  "probability" DOUBLE PRECISION NOT NULL,
  "forecastValue" DOUBLE PRECISION,
  "horizonDays" INTEGER NOT NULL,
  "confidence" DOUBLE PRECISION,
  "factors" JSONB,
  "explainLogId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PredictionSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PredictionSignal_teamId_kind_createdAt_idx" ON "PredictionSignal"("teamId", "kind", "createdAt");
CREATE INDEX "PredictionSignal_userId_createdAt_idx" ON "PredictionSignal"("userId", "createdAt");
CREATE INDEX "PredictionSignal_workflowId_createdAt_idx" ON "PredictionSignal"("workflowId", "createdAt");
CREATE INDEX "PredictionSignal_taskId_createdAt_idx" ON "PredictionSignal"("taskId", "createdAt");

ALTER TABLE "PredictionSignal" ADD CONSTRAINT "PredictionSignal_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PredictionSignal" ADD CONSTRAINT "PredictionSignal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PredictionSignal" ADD CONSTRAINT "PredictionSignal_explainLogId_fkey"
  FOREIGN KEY ("explainLogId") REFERENCES "ExplainabilityLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RiskSignal
CREATE TABLE "RiskSignal" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" "RiskSeverity" NOT NULL DEFAULT 'LOW',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "mitigation" TEXT,
  "evidence" JSONB,
  "explainLogId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RiskSignal_teamId_severity_createdAt_idx" ON "RiskSignal"("teamId", "severity", "createdAt");
CREATE INDEX "RiskSignal_teamId_type_createdAt_idx" ON "RiskSignal"("teamId", "type", "createdAt");

ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_explainLogId_fkey"
  FOREIGN KEY ("explainLogId") REFERENCES "ExplainabilityLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SimulationRun
CREATE TABLE "SimulationRun" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "SimulationRunStatus" NOT NULL DEFAULT 'RUNNING',
  "inputs" JSONB NOT NULL,
  "results" JSONB,
  "lastError" TEXT,
  "explainLogId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SimulationRun_teamId_status_createdAt_idx" ON "SimulationRun"("teamId", "status", "createdAt");
CREATE INDEX "SimulationRun_teamId_type_createdAt_idx" ON "SimulationRun"("teamId", "type", "createdAt");

ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_explainLogId_fkey"
  FOREIGN KEY ("explainLogId") REFERENCES "ExplainabilityLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
