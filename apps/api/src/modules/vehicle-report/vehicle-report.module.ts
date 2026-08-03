import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportController } from './vehicle-report.controller';
import { VehicleReportService } from './vehicle-report.service';
import { VehicleReportContextBuilderService } from './vehicle-report-context-builder.service';
import { ListingReportContextService } from './listing-report-context.service';
import { VehicleReportDataService } from './vehicle-report-data.service';
import { VehicleReportScoringService } from './vehicle-report-scoring.service';
import { VehicleReportContradictionService } from './vehicle-report-contradiction.service';
import { VehicleReportPromptService } from './vehicle-report-prompt.service';
import { VehicleReportProviderService } from './vehicle-report-provider.service';
import { VehicleReportSemanticValidationService } from './vehicle-report-semantic-validation.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { VehicleReportCacheService } from './vehicle-report-cache.service';
import { VehicleReportQuotaService } from './vehicle-report-quota.service';
import { VehicleReportJobWorkerService } from './vehicle-report-job-worker.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VehicleReportController],
  providers: [
    PrismaService,
    VehicleReportService,
    VehicleReportContextBuilderService,
    ListingReportContextService,
    VehicleReportDataService,
    VehicleReportScoringService,
    VehicleReportContradictionService,
    VehicleReportPromptService,
    VehicleReportProviderService,
    VehicleReportSemanticValidationService,
    VehicleReportFallbackService,
    VehicleReportCacheService,
    VehicleReportQuotaService,
    VehicleReportJobWorkerService,
  ],
  exports: [VehicleReportService],
})
export class VehicleReportModule {}
