-- Phase 2 foundations: durable domain events, workflows, notifications.
-- Generated manually to avoid requiring a live DB during bootstrap.

-- Enums
CREATE TYPE "DomainEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');
CREATE TYPE "WorkflowStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'IN_APP', 'EMAIL', 'PUSH');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELED');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- DomainEvent
CREATE TABLE "DomainEvent" (
  "id" TEXT NOT NULL,
  "teamId" TEXT,
  "name" TEXT NOT NULL,
  "dedupeKey" TEXT,
  "payload" JSONB NOT NULL,
  "status" "DomainEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomainEvent_name_createdAt_idx" ON "DomainEvent"("name", "createdAt");
CREATE INDEX "DomainEvent_teamId_createdAt_idx" ON "DomainEvent"("teamId", "createdAt");
CREATE INDEX "DomainEvent_status_createdAt_idx" ON "DomainEvent"("status", "createdAt");
CREATE UNIQUE INDEX "DomainEvent_name_teamId_dedupeKey_key" ON "DomainEvent"("name", "teamId", "dedupeKey");

-- Workflow + versions + executions + logs
CREATE TABLE "Workflow" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workflow_teamId_status_idx" ON "Workflow"("teamId", "status");

CREATE TABLE "WorkflowVersion" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");
CREATE INDEX "WorkflowVersion_workflowId_isCurrent_idx" ON "WorkflowVersion"("workflowId", "isCurrent");

ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkflowExecution" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "workflowVersionId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'RUNNING',
  "triggerEventId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowExecution_teamId_startedAt_idx" ON "WorkflowExecution"("teamId", "startedAt");
CREATE INDEX "WorkflowExecution_workflowId_startedAt_idx" ON "WorkflowExecution"("workflowId", "startedAt");
CREATE INDEX "WorkflowExecution_status_startedAt_idx" ON "WorkflowExecution"("status", "startedAt");

ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowVersionId_fkey"
  FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WorkflowLog" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowLog_executionId_createdAt_idx" ON "WorkflowLog"("executionId", "createdAt");

ALTER TABLE "WorkflowLog" ADD CONSTRAINT "WorkflowLog_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification templates / prefs / notifications
CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "teamId" TEXT,
  "key" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_teamId_key_channel_key" ON "NotificationTemplate"("teamId", "key", "channel");
CREATE INDEX "NotificationTemplate_key_idx" ON "NotificationTemplate"("key");

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "teamId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_teamId_channel_key" ON "NotificationPreference"("userId", "teamId", "channel");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_teamId_idx" ON "NotificationPreference"("teamId");

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "templateKey" TEXT,
  "payload" JSONB NOT NULL,
  "dedupeKey" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_teamId_createdAt_idx" ON "Notification"("teamId", "createdAt");
CREATE INDEX "Notification_status_scheduledAt_idx" ON "Notification"("status", "scheduledAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE UNIQUE INDEX "Notification_teamId_channel_dedupeKey_key" ON "Notification"("teamId", "channel", "dedupeKey");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
