-- Phase 4 foundations: platform apps/installs/service registry + event mesh versioning.

CREATE TYPE "PlatformAppStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "InstallStatus" AS ENUM ('ENABLED', 'DISABLED');

-- DomainEvent additions
ALTER TABLE "DomainEvent" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DomainEvent" ADD COLUMN IF NOT EXISTS "schemaKey" TEXT;

-- PlatformApp
CREATE TABLE "PlatformApp" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "PlatformAppStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformApp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformApp_key_key" ON "PlatformApp"("key");

-- WorkspaceAppInstall
CREATE TABLE "WorkspaceAppInstall" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "status" "InstallStatus" NOT NULL DEFAULT 'ENABLED',
  "grants" JSONB,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceAppInstall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceAppInstall_teamId_appId_key" ON "WorkspaceAppInstall"("teamId", "appId");
CREATE INDEX "WorkspaceAppInstall_teamId_status_idx" ON "WorkspaceAppInstall"("teamId", "status");
CREATE INDEX "WorkspaceAppInstall_appId_status_idx" ON "WorkspaceAppInstall"("appId", "status");

ALTER TABLE "WorkspaceAppInstall" ADD CONSTRAINT "WorkspaceAppInstall_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceAppInstall" ADD CONSTRAINT "WorkspaceAppInstall_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "PlatformApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PlatformServiceRegistration
CREATE TABLE "PlatformServiceRegistration" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "capabilities" JSONB NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformServiceRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformServiceRegistration_serviceId_version_key" ON "PlatformServiceRegistration"("serviceId", "version");
CREATE INDEX "PlatformServiceRegistration_serviceId_idx" ON "PlatformServiceRegistration"("serviceId");

