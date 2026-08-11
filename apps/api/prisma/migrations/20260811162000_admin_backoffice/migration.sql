-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerNo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE UNIQUE INDEX IF NOT EXISTS "User_customerNo_key" ON "User"("customerNo");

-- CreateTable AdminAuditLog
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changedFields" TEXT[],
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable AdminUserNote
CREATE TABLE IF NOT EXISTS "AdminUserNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable AdminUserMessage
CREATE TABLE IF NOT EXISTS "AdminUserMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sendInApp" BOOLEAN NOT NULL DEFAULT true,
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerNoCounter
CREATE TABLE IF NOT EXISTS "CustomerNoCounter" (
    "period" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNoCounter_pkey" PRIMARY KEY ("period")
);

-- CreateTable DataQualitySnapshot
CREATE TABLE IF NOT EXISTS "DataQualitySnapshot" (
    "id" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "totalDuplicates" INTEGER NOT NULL,
    "missingTrims" INTEGER NOT NULL,
    "missingEngines" INTEGER NOT NULL,
    "missingTrans" INTEGER NOT NULL,
    "orphanRecords" INTEGER NOT NULL,
    "suspiciousYears" INTEGER NOT NULL,
    "issuesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminUserNote_userId_idx" ON "AdminUserNote"("userId");
CREATE INDEX IF NOT EXISTS "AdminUserMessage_userId_idx" ON "AdminUserMessage"("userId");
