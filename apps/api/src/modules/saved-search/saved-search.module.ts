import { Module } from '@nestjs/common';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchService } from './saved-search.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SavedSearchController],
  providers: [SavedSearchService, PrismaService],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
