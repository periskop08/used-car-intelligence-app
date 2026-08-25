import { Module, Global } from '@nestjs/common';
import { AiTelemetryService } from './ai-telemetry.service';
import { AdminAiTelemetryController } from './admin-ai-telemetry.controller';

@Global()
@Module({
  controllers: [AdminAiTelemetryController],
  providers: [AiTelemetryService],
  exports: [AiTelemetryService],
})
export class AiTelemetryModule {}
