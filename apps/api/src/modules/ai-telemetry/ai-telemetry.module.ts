import { Module, Global } from '@nestjs/common';
import { AiTelemetryService } from './ai-telemetry.service';
import { AdminAiTelemetryController } from './admin-ai-telemetry.controller';
import { PrismaService } from '../../prisma.service';

@Global()
@Module({
  controllers: [AdminAiTelemetryController],
  providers: [AiTelemetryService, PrismaService],
  exports: [AiTelemetryService],
})
export class AiTelemetryModule {}
