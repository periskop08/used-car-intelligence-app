import { Injectable, Logger } from '@nestjs/common';
import { AiProviderAdapter, AiProviderResponse } from './adapters/ai-provider.interface';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { SafeFallbackAdapter } from './adapters/safe-fallback.adapter';
import { ListingAiSemanticValidationService } from './listing-ai-semantic-validation.service';

@Injectable()
export class ListingAiProviderService {
  private readonly logger = new Logger(ListingAiProviderService.name);

  constructor(
    private geminiAdapter: GeminiAdapter,
    private openAiAdapter: OpenAiAdapter,
    private safeFallbackAdapter: SafeFallbackAdapter,
    private semanticValidationService: ListingAiSemanticValidationService,
  ) {}

  private getSystemPrompt(): string {
    return `Sen TorqueScout'un doğrulanmış veritabanı verileriyle çalışan uzman otomotiv danışmanısın.
Kullanıcı şu anda seçili araç hakkında seninle sohbet ediyor: VEHICLE_OR_LISTING_CONTEXT.

TEMEL DAYANAKLARIN & KURALLARIN:
1. GERÇEK VERİTABANI RAPORU (verifiedDatabaseVehicleReport / vehicle): Veritabanında kayıtlı DOĞRULANMIŞ kronik arıza, risk puanı, geri çağırmalar ve teknik özellikleri esas al.
2. İLAN VE TEKNİK PARAMETRELER: Araç model yılı, kilometresi, şanzımanı, yakıt türü ve teknik detaylarını veritabanı raporu ile eksiksiz harmanla.
3. KESİNLİKLE UYDURMA BİLGİ VERME: Var olmayan fiyat veya hayali kronik arıza UYDURMA. Doğrulanmış verilere dayan.
4. GİRİŞ VE SOHBET: Kullanıcının sorusuna (şanzıman, kronik arıza, bakım, şehir içi kullanım) doğrudan, samimi, otomotiv uzmanı gözüyle detaylı ve tatmin edici şekilde Türkçe yanıt ver.
5. CÜMLE TAMAMLAMA & NETLİK: Yanıtın her zaman noktalı ve tam bir cümleyle bitsin. Asla metnin sonunu yarıda kesme!`;
  }

  async generateListingAdvice(
    userMessage: string,
    contextJson: any,
  ): Promise<{ answer: string; mode: 'AI' | 'SAFE_FALLBACK'; providerName: string }> {
    const primaryProviderName = (process.env.LISTING_AI_PRIMARY_PROVIDER || 'gemini').toLowerCase();
    const systemPrompt = this.getSystemPrompt();

    const adaptersToTry: AiProviderAdapter[] = [];
    if (primaryProviderName === 'openai') {
      adaptersToTry.push(this.openAiAdapter, this.geminiAdapter);
    } else {
      adaptersToTry.push(this.geminiAdapter, this.openAiAdapter);
    }

    for (const adapter of adaptersToTry) {
      try {
        const response: AiProviderResponse = await adapter.generateAnswer(
          systemPrompt,
          userMessage,
          contextJson,
        );

        if (response && response.answer && response.answer.trim().length > 10) {
          let validation = this.semanticValidationService.validate(response.answer, contextJson);

          // Max 1 repair attempt if validation requested repair
          if (!validation.isValid && validation.needsRepair) {
            this.logger.warn(`Triggering 1 repair attempt for ${adapter.providerName}: ${validation.reason}`);
            const repairMessage = `${userMessage}\n\n[SİSTEM UYARISI: Önceki yanıtınız kuralları ihlal etti (${validation.reason}). Lütfen satıcı beyanlarını kesin gerçek olarak sunmadan ve dış araç adı eklemeden tekrar yanıtlayın.]`;
            const repairedResponse = await adapter.generateAnswer(systemPrompt, repairMessage, contextJson);
            validation = this.semanticValidationService.validate(repairedResponse.answer, contextJson);
            if (validation.isValid) {
              return {
                answer: repairedResponse.answer,
                mode: 'AI',
                providerName: `${adapter.providerName} (Repaired)`,
              };
            }
          } else {
            return {
              answer: response.answer,
              mode: 'AI',
              providerName: adapter.providerName,
            };
          }
        }
      } catch (e: any) {
        this.logger.error(`Adapter ${adapter.providerName} failed: ${e?.message}`);
      }
    }

    // ALL PRIMARY AI PROVIDERS FAILED (e.g. Rate limit 429 or quota depleted)
    this.logger.error(`All primary AI providers failed for query. Returning polite error message.`);
    return {
      answer: `⚠️ Yapay zeka servis sağlayıcısında geçici bir kısıtlama veya kota sınırı yaşanmaktadır. Yönetici ekibimize otomatik bildirim iletilmiş olup lütfen birkaç dakika sonra tekrar deneyiniz.`,
      mode: 'SAFE_FALLBACK',
      providerName: 'QuotaLimitErrorResponse',
    };
  }
}
