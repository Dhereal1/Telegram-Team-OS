-- Phase 5 foundations: habits, flags, templates, product analytics, feedback.

-- ProductEvent
CREATE TABLE "ProductEvent" (
  "id" TEXT NOT NULL,
  "teamId" TEXT,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductEvent_teamId_createdAt_idx" ON "ProductEvent"("teamId", "createdAt");
CREATE INDEX "ProductEvent_userId_createdAt_idx" ON "ProductEvent"("userId", "createdAt");
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "ProductEvent"("name", "createdAt");

ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Feedback
CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "teamId" TEXT,
  "userId" TEXT,
  "kind" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "page" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_teamId_createdAt_idx" ON "Feedback"("teamId", "createdAt");
CREATE INDEX "Feedback_kind_createdAt_idx" ON "Feedback"("kind", "createdAt");

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Feature flags
CREATE TABLE "FeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

CREATE TABLE "WorkspaceFlagOverride" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "flagId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceFlagOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceFlagOverride_teamId_flagId_key" ON "WorkspaceFlagOverride"("teamId", "flagId");
CREATE INDEX "WorkspaceFlagOverride_teamId_idx" ON "WorkspaceFlagOverride"("teamId");
CREATE INDEX "WorkspaceFlagOverride_flagId_idx" ON "WorkspaceFlagOverride"("flagId");

ALTER TABLE "WorkspaceFlagOverride" ADD CONSTRAINT "WorkspaceFlagOverride_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceFlagOverride" ADD CONSTRAINT "WorkspaceFlagOverride_flagId_fkey"
  FOREIGN KEY ("flagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habits
CREATE TABLE "DailyCheckin" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyCheckin_teamId_userId_dateKey_key" ON "DailyCheckin"("teamId", "userId", "dateKey");
CREATE INDEX "DailyCheckin_teamId_dateKey_idx" ON "DailyCheckin"("teamId", "dateKey");
CREATE INDEX "DailyCheckin_userId_dateKey_idx" ON "DailyCheckin"("userId", "dateKey");

ALTER TABLE "DailyCheckin" ADD CONSTRAINT "DailyCheckin_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyCheckin" ADD CONSTRAINT "DailyCheckin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HabitStreak" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "current" INTEGER NOT NULL DEFAULT 0,
  "best" INTEGER NOT NULL DEFAULT 0,
  "lastDateKey" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HabitStreak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HabitStreak_teamId_userId_key" ON "HabitStreak"("teamId", "userId");
CREATE INDEX "HabitStreak_teamId_idx" ON "HabitStreak"("teamId");
CREATE INDEX "HabitStreak_userId_idx" ON "HabitStreak"("userId");

ALTER TABLE "HabitStreak" ADD CONSTRAINT "HabitStreak_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitStreak" ADD CONSTRAINT "HabitStreak_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Templates
CREATE TABLE "WorkspaceTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceTemplate_key_key" ON "WorkspaceTemplate"("key");

CREATE TABLE "TemplateInstall" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "installedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TemplateInstall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateInstall_teamId_templateId_key" ON "TemplateInstall"("teamId", "templateId");
CREATE INDEX "TemplateInstall_teamId_createdAt_idx" ON "TemplateInstall"("teamId", "createdAt");

ALTER TABLE "TemplateInstall" ADD CONSTRAINT "TemplateInstall_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateInstall" ADD CONSTRAINT "TemplateInstall_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "WorkspaceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateInstall" ADD CONSTRAINT "TemplateInstall_installedById_fkey"
  FOREIGN KEY ("installedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

