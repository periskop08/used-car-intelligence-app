import { forwardRef, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportController } from './vehicle-report.controller';
import { VehicleReportService } from './vehicle-report.service';
import { VehicleReportContextBuilderService } from './vehicle-report-context-builder.service';
import { ListingReportContextService } from './listing-report-context.service';
import { VehicleReportDataService } from './vehicle-report-data.service';
import { VehicleReportScoringService } from './vehicle-report-scoring.service';
import { VehicleReportScoringV6Service } from './vehicle-report-scoring-v6.service';
import { TorqueScoutDecisionScoreService } from './torque-scout-decision-score.service';
import { VehicleReportContradictionService } from './vehicle-report-contradiction.service';
import { VehicleReportPromptService } from './vehicle-report-prompt.service';
import { VehicleReportProviderService } from './vehicle-report-provider.service';
import { VehicleReportSemanticValidationService } from './vehicle-report-semantic-validation.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { VehicleReportCacheService } from './vehicle-report-cache.service';
import { VehicleReportQuotaService } from './vehicle-report-quota.service';
import { VehicleReportJobWorkerService } from './vehicle-report-job-worker.service';
import { VehicleReportNarrativeQualityService } from './vehicle-report-narrative-quality.service';
import { ResearchEvidenceValidationService } from './research-evidence-validation.service';
import { VehicleReportAuditorService } from './vehicle-report-auditor.service';
import { AuthModule } from '../auth/auth.module';
import { ResearchModule } from '../research/research.module';
import { ListingAiModule } from '../listing-ai/listing-ai.module';
import { VehicleModule } from '../vehicle/vehicle.module';

@Module({
  imports: [AuthModule, ResearchModule, ListingAiModule, forwardRef(() => VehicleModule)],
  controllers: [VehicleReportController],
  providers: [
    PrismaService,
    VehicleReportService,
    VehicleReportContextBuilderService,
    ListingReportContextService,
    VehicleReportDataService,
    VehicleReportScoringService,
    VehicleReportScoringV6Service,
    TorqueScoutDecisionScoreService,
    VehicleReportContradictionService,
    VehicleReportPromptService,
    VehicleReportProviderService,
    VehicleReportAuditorService,
    VehicleReportSemanticValidationService,
    VehicleReportNarrativeQualityService,
    ResearchEvidenceValidationService,
    VehicleReportFallbackService,
    VehicleReportCacheService,
    VehicleReportQuotaService,
    VehicleReportJobWorkerService,
  ],
  exports: [VehicleReportService, VehicleReportScoringV6Service, TorqueScoutDecisionScoreService, VehicleReportAuditorService],
})
export class VehicleReportModule {}
