-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- AlterTable
ALTER TABLE "Team"
ADD COLUMN     "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planStartedAt" TIMESTAMP(3),
ADD COLUMN     "billingProvider" TEXT,
ADD COLUMN     "billingCustomerId" TEXT,
ADD COLUMN     "billingStatus" TEXT,
ADD COLUMN     "usageWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "usageTasksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageReportsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageInvitesCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Team_planTier_idx" ON "Team"("planTier");

