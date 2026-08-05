import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingModerationController } from './listing-moderation.controller';
import { ListingModerationService } from './listing-moderation.service';
import { ListingPromotionModule } from '../listing-promotion/listing-promotion.module';

@Module({
  imports: [ListingPromotionModule],
  controllers: [ListingModerationController],
  providers: [ListingModerationService, PrismaService],
  exports: [ListingModerationService],
})
export class ListingModerationModule {}
