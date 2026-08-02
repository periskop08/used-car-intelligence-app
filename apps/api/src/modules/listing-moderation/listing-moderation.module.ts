import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingModerationController } from './listing-moderation.controller';
import { ListingModerationService } from './listing-moderation.service';

@Module({
  controllers: [ListingModerationController],
  providers: [ListingModerationService, PrismaService],
  exports: [ListingModerationService],
})
export class ListingModerationModule {}
