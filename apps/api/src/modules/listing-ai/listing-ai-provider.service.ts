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
Kullanıcı şu anda ilandaki araç hakkında seninle sohbet ediyor: LISTING_CONTEXT.

TEMEL DAYANAKLARIN & KURALLARIN:
1. GERÇEK VERİTABANI RAPORU (verifiedDatabaseVehicleReport): LISTING_CONTEXT içindeki verifiedDatabaseVehicleReport nesnesi ve knownDatabaseProblems dizisi TorqueScout'un veritabanında kayıtlı DOĞRULANMIŞ araç raporudur. Araç hakkındaki kronik arıza, risk puanı, satın alınabilirlik skoru ve kontrol önerilerini bu veritabanı kaydından al ve yanıtlarında referans göster.
2. İLAN PARAMETRELERİ (listing & vehicle & condition): Araç model yılı, kilometresi, şanzımanı, yakıt türü, ağır hasar beyanı ve kaporta durumunu veritabanı raporu ile eksiksiz harmanla.
3. KESİNLİKLE UYDURMA / YANILTICI BİLGİ VERME: Fiktif parça adı, var olmayan fiyat tahminleri veya doğrulanmamış uydurma rakamlar UYDURMA. Bir bilgi veritabanında veya ilanda yoksa, "TorqueScout veritabanı kayıtlarına ve ilandaki teknik parametrelere göre..." ifadesini kullan.
4. GİRİŞ VE SOHBET: Kullanıcının sorusuna (şanzıman, kronik arıza, bakım, şehir içi kullanım) doğrudan, samimi, otomotiv uzmanı gözüyle detaylı ve tatmin edici şekilde Türkçe yanıt ver. Asla "İlanda bu bilgi yazmıyor" diyerek kestirip atma! İlandaki teknik detayları ve veritabanı raporunu kullanarak açıkla.
5. CÜMLE TAMAMLAMA & NETLİK: Yanıtın her zaman noktalı ve tam bir cümleyle bitsin. Asla metnin sonunu yarıda kesme! Gereksiz laf kalabalığı yapmadan doğrudan soruyu yanıtla.`;
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
              providerName: adapter.providerName,
            };
          }
        } else if (validation.isValid) {
          return {
            answer: response.answer,
            mode: 'AI',
            providerName: adapter.providerName,
          };
        }
      } catch (err: any) {
        this.logger.warn(`AI Provider ${adapter.providerName} failed: ${err?.message || err}`);
      }
    }

    // Safe Fallback if all providers failed
    this.logger.warn('All primary/secondary AI providers failed or were unconfigured. Using SafeFallbackAdapter.');
    const fallbackResponse = await this.safeFallbackAdapter.generateAnswer(systemPrompt, userMessage, contextJson);

    return {
      answer: fallbackResponse.answer,
      mode: 'SAFE_FALLBACK',
      providerName: this.safeFallbackAdapter.providerName,
    };
  }
}
