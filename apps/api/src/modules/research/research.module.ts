import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { TavilySearchProvider } from './providers/tavily-search.provider';
import { GeminiGroundingProvider } from './providers/gemini-grounding.provider';
import { FirecrawlExtractProvider } from './providers/firecrawl-extract.provider';
import { AiAnalysisService } from './ai-analysis.service';
import { CoverageService } from './coverage.service';
import { AiReportGeneratorService } from './ai-report-generator.service';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';
import { AdminApprovalController } from './admin-approval.controller';
import { EvidenceRulesService } from './evidence-rules.service';
import { ResearchWorkerService } from './research-worker.service';

import { IdentityGateService } from './identity-gate.service';
import { ResearchConfidenceService } from './research-confidence.service';
import { ClaimEvidenceService } from './claim-evidence.service';
import { EvidenceValidatorService } from './evidence-validator.service';

@Module({
  imports: [],
  controllers: [ResearchController, AdminApprovalController],
  providers: [
    PrismaService,
    WebSearchProvider,
    TavilySearchProvider,
    GeminiGroundingProvider,
    FirecrawlExtractProvider,
    IdentityGateService,
    ResearchConfidenceService,
    ClaimEvidenceService,
    EvidenceValidatorService,
    AiAnalysisService,
    CoverageService,
    AiReportGeneratorService,
    EvidenceRulesService,
    ResearchService,
    ResearchWorkerService,
  ],
  exports: [
    ResearchService,
    AiReportGeneratorService,
    CoverageService,
    EvidenceRulesService,
    IdentityGateService,
    ResearchConfidenceService,
    ClaimEvidenceService,
    EvidenceValidatorService,
    TavilySearchProvider,
    GeminiGroundingProvider,
    FirecrawlExtractProvider,
  ],
})
export class ResearchModule {}
