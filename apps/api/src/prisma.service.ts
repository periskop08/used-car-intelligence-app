import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureClubTablesExist();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureClubTablesExist() {
    const sqlStatements = [
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'TANISMA';`,
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'YETKIN';`,
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'PROFESYONEL';`,
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'FREE';`,
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'STANDARD';`,
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'PREMIUM';`,
      `ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'PRO';`,
      `ALTER TYPE "FeatureKey" ADD VALUE IF NOT EXISTS 'AI_REPORT';`,

      `DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubPostStatus') THEN
              CREATE TYPE "ClubPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubCommentStatus') THEN
              CREATE TYPE "ClubCommentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'PENDING_REVIEW', 'DELETED');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubRestrictionType') THEN
              CREATE TYPE "ClubRestrictionType" AS ENUM ('MUTE', 'BAN');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubMediaStatus') THEN
              CREATE TYPE "ClubMediaStatus" AS ENUM ('TEMP', 'ATTACHED', 'DELETED');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationContextType') THEN
              CREATE TYPE "ConversationContextType" AS ENUM ('LISTING', 'CLUB_ADMIN', 'SUPPORT');
          END IF;
      END $$;`,

      `CREATE TABLE IF NOT EXISTS "ClubPost" (
          "id" TEXT NOT NULL,
          "authorId" TEXT NOT NULL,
          "title" TEXT,
          "content" TEXT NOT NULL,
          "status" "ClubPostStatus" NOT NULL DEFAULT 'DRAFT',
          "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
          "isPinned" BOOLEAN NOT NULL DEFAULT false,
          "pinnedOrder" INTEGER,
          "publishedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP(3),
          CONSTRAINT "ClubPost_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS "ClubPostMedia" (
          "id" TEXT NOT NULL,
          "postId" TEXT,
          "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
          "mediaUrl" TEXT NOT NULL,
          "thumbnailUrl" TEXT,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "status" "ClubMediaStatus" NOT NULL DEFAULT 'TEMP',
          "uploadedById" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ClubPostMedia_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ClubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ClubPostMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS "ClubComment" (
          "id" TEXT NOT NULL,
          "postId" TEXT NOT NULL,
          "authorId" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "status" "ClubCommentStatus" NOT NULL DEFAULT 'VISIBLE',
          "editedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP(3),
          CONSTRAINT "ClubComment_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ClubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ClubComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS "ClubModeratorAssignment" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "assignedByAdminId" TEXT NOT NULL,
          "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "revokedByAdminId" TEXT,
          "revokedAt" TIMESTAMP(3),
          CONSTRAINT "ClubModeratorAssignment_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubModeratorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ClubModeratorAssignment_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS "ClubRestriction" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "type" "ClubRestrictionType" NOT NULL,
          "reason" TEXT NOT NULL,
          "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3),
          "createdById" TEXT NOT NULL,
          "revokedAt" TIMESTAMP(3),
          "revokedById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ClubRestriction_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ClubRestriction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS "ClubModerationLog" (
          "id" TEXT NOT NULL,
          "actorId" TEXT NOT NULL,
          "actorRole" TEXT NOT NULL,
          "actionType" TEXT NOT NULL,
          "targetUserId" TEXT,
          "postId" TEXT,
          "commentId" TEXT,
          "reason" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ClubModerationLog_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubModerationLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS "ClubPostLike" (
          "id" TEXT NOT NULL,
          "postId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ClubPostLike_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ClubPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ClubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ClubPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ClubPostLike_postId_userId_key" UNIQUE ("postId", "userId")
      );`,

      `ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "contextType" "ConversationContextType" NOT NULL DEFAULT 'LISTING';`,
      `ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "contextEntityId" TEXT;`,
      `ALTER TABLE "Conversation" ALTER COLUMN "listingId" DROP NOT NULL;`,
      `DELETE FROM "FeatureUsage" WHERE "featureKey" = 'AI_CHAT';`,
    ];

    for (const stmt of sqlStatements) {
      try {
        await this.$executeRawUnsafe(stmt);
      } catch (err: any) {
        this.logger.warn(`Notice running table bootstrap stmt: ${err?.message}`);
      }
    }
    this.logger.log('✓ Verified and bootstrapped Tork Scout Club database tables.');
  }
}
