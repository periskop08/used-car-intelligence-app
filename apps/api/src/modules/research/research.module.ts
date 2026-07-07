import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { AiAnalysisService } from './ai-analysis.service';
import { CoverageService } from './coverage.service';
import { AiReportGeneratorService } from './ai-report-generator.service';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';
import { AdminApprovalController } from './admin-approval.controller';

import { EvidenceRulesService } from './evidence-rules.service';
import { ResearchWorkerService } from './research-worker.service';

@Module({
  imports: [],
  controllers: [ResearchController, AdminApprovalController],
  providers: [
    PrismaService,
    WebSearchProvider,
    AiAnalysisService,
    CoverageService,
    AiReportGeneratorService,
    EvidenceRulesService,
    ResearchService,
    ResearchWorkerService,
  ],
  exports: [ResearchService, AiReportGeneratorService, CoverageService, EvidenceRulesService],
})
export class ResearchModule {}
