import { Module } from '@nestjs/common';
import { ClubController } from './club.controller';
import { AdminClubController } from './admin-club.controller';
import { ClubService } from './club.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ClubController, AdminClubController],
  providers: [ClubService, PrismaService],
  exports: [ClubService],
})
export class ClubModule {}
