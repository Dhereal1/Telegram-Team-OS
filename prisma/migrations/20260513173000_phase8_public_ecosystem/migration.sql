-- Phase 8 foundations: public API keys + usage analytics.

CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "WebhookSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

-- WorkspaceAppApiKey
CREATE TABLE "WorkspaceAppApiKey" (
  "id" TEXT NOT NULL,
  "installId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "actorUserId" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceAppApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceAppApiKey_prefix_key" ON "WorkspaceAppApiKey"("prefix");
CREATE INDEX "WorkspaceAppApiKey_installId_status_idx" ON "WorkspaceAppApiKey"("installId", "status");
CREATE INDEX "WorkspaceAppApiKey_installId_createdAt_idx" ON "WorkspaceAppApiKey"("installId", "createdAt");

ALTER TABLE "WorkspaceAppApiKey" ADD CONSTRAINT "WorkspaceAppApiKey_installId_fkey"
  FOREIGN KEY ("installId") REFERENCES "WorkspaceAppInstall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceAppApiKey" ADD CONSTRAINT "WorkspaceAppApiKey_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ApiUsageDaily (per API key)
CREATE TABLE "ApiUsageDaily" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0,
  "lastRequestAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiUsageDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiUsageDaily_dateKey_apiKeyId_key" ON "ApiUsageDaily"("dateKey", "apiKeyId");
CREATE INDEX "ApiUsageDaily_teamId_dateKey_idx" ON "ApiUsageDaily"("teamId", "dateKey");
CREATE INDEX "ApiUsageDaily_apiKeyId_dateKey_idx" ON "ApiUsageDaily"("apiKeyId", "dateKey");

ALTER TABLE "ApiUsageDaily" ADD CONSTRAINT "ApiUsageDaily_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiUsageDaily" ADD CONSTRAINT "ApiUsageDaily_apiKeyId_fkey"
  FOREIGN KEY ("apiKeyId") REFERENCES "WorkspaceAppApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WebhookSubscription
CREATE TABLE "WebhookSubscription" (
  "id" TEXT NOT NULL,
  "installId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "status" "WebhookSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "events" JSONB NOT NULL,
  "lastDeliveredAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookSubscription_installId_url_key" ON "WebhookSubscription"("installId", "url");
CREATE INDEX "WebhookSubscription_installId_status_idx" ON "WebhookSubscription"("installId", "status");
CREATE INDEX "WebhookSubscription_status_updatedAt_idx" ON "WebhookSubscription"("status", "updatedAt");

ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_installId_fkey"
  FOREIGN KEY ("installId") REFERENCES "WorkspaceAppInstall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WebhookDelivery
CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "responseCode" INTEGER,
  "error" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookDelivery_subscriptionId_status_createdAt_idx" ON "WebhookDelivery"("subscriptionId", "status", "createdAt");
CREATE INDEX "WebhookDelivery_eventId_createdAt_idx" ON "WebhookDelivery"("eventId", "createdAt");

ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
