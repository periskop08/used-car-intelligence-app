import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../../prisma.service';
import { ListingModule } from '../listing/listing.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [ListingModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, PrismaService, JwtService],
})
export class FeedbackModule {}
