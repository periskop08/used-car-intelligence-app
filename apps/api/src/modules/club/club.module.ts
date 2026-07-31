import { Module } from '@nestjs/common';
import { ClubController } from './club.controller';
import { AdminClubController } from './admin-club.controller';
import { ClubService } from './club.service';
import { PrismaService } from '../../prisma.service';
import { R2Service } from '../listing/r2.service';

@Module({
  controllers: [ClubController, AdminClubController],
  providers: [ClubService, PrismaService, R2Service],
  exports: [ClubService],
})
export class ClubModule {}
