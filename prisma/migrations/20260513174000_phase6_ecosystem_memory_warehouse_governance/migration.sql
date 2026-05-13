-- Phase 6 foundations: organizational memory, snapshots, warehouse daily aggregates, governance registries.

CREATE TYPE "MemoryType" AS ENUM ('NOTE', 'DECISION', 'PROCEDURE', 'INCIDENT');
CREATE TYPE "GovernanceStatus" AS ENUM ('ACTIVE', 'DEPRECATED');

CREATE TABLE "OperationalMemoryEntry" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "type" "MemoryType" NOT NULL DEFAULT 'NOTE',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalMemoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalMemoryEntry_teamId_createdAt_idx" ON "OperationalMemoryEntry"("teamId", "createdAt");
CREATE INDEX "OperationalMemoryEntry_teamId_type_createdAt_idx" ON "OperationalMemoryEntry"("teamId", "type", "createdAt");
CREATE INDEX "OperationalMemoryEntry_pinned_createdAt_idx" ON "OperationalMemoryEntry"("pinned", "createdAt");

ALTER TABLE "OperationalMemoryEntry" ADD CONSTRAINT "OperationalMemoryEntry_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalMemoryEntry" ADD CONSTRAINT "OperationalMemoryEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OperationalSnapshot" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalSnapshot_teamId_dateKey_key" ON "OperationalSnapshot"("teamId", "dateKey");
CREATE INDEX "OperationalSnapshot_teamId_createdAt_idx" ON "OperationalSnapshot"("teamId", "createdAt");

ALTER TABLE "OperationalSnapshot" ADD CONSTRAINT "OperationalSnapshot_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WarehouseEventDaily" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "namespace" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "sample" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseEventDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseEventDaily_teamId_dateKey_namespace_eventName_key" ON "WarehouseEventDaily"("teamId", "dateKey", "namespace", "eventName");
CREATE INDEX "WarehouseEventDaily_teamId_dateKey_idx" ON "WarehouseEventDaily"("teamId", "dateKey");
CREATE INDEX "WarehouseEventDaily_namespace_eventName_dateKey_idx" ON "WarehouseEventDaily"("namespace", "eventName", "dateKey");

ALTER TABLE "WarehouseEventDaily" ADD CONSTRAINT "WarehouseEventDaily_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EventSchemaRegistry" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "schemaKey" TEXT NOT NULL,
  "jsonSchema" JSONB NOT NULL,
  "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventSchemaRegistry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventSchemaRegistry_name_version_key" ON "EventSchemaRegistry"("name", "version");
CREATE INDEX "EventSchemaRegistry_schemaKey_idx" ON "EventSchemaRegistry"("schemaKey");

CREATE TABLE "ServiceOwnership" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "slackChannel" TEXT,
  "status" "GovernanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOwnership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceOwnership_serviceId_key" ON "ServiceOwnership"("serviceId");

