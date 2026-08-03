import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ResearchModule } from '../research/research.module';
import { ListingAiController } from './listing-ai.controller';
import { ListingAiService } from './listing-ai.service';
import { ListingAiContextBuilderService } from './listing-ai-context-builder.service';
import { ListingAiQuotaService } from './listing-ai-quota.service';
import { ListingAiScopeClassifierService } from './listing-ai-scope-classifier.service';
import { ListingAiSemanticValidationService } from './listing-ai-semantic-validation.service';
import { ListingAiProviderService } from './listing-ai-provider.service';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { SafeFallbackAdapter } from './adapters/safe-fallback.adapter';

@Module({
  imports: [ResearchModule],
  controllers: [ListingAiController],
  providers: [
    PrismaService,
    ListingAiService,
    ListingAiContextBuilderService,
    ListingAiQuotaService,
    ListingAiScopeClassifierService,
    ListingAiSemanticValidationService,
    ListingAiProviderService,
    GeminiAdapter,
    OpenAiAdapter,
    SafeFallbackAdapter,
  ],
  exports: [ListingAiService, ListingAiQuotaService, ListingAiProviderService],
})
export class ListingAiModule {}
