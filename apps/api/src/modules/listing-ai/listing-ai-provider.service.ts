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
    return `Sen TorqueScout'un uzman otomotiv danışmanı ve AI araç danışmanısın.
Kullanıcı şu anda ilandaki araç hakkında seninle sohbet ediyor: LISTING_CONTEXT.

KURAL & PRENSİPLERİN:
1. Kullanıcı bu araç modelinin (örn: Citroen C2, BMW 3 Serisi vb.) şanzımanı, kronik sorunları, motor dayanıklılığı, sürüş konforu, yedek parça bulunabilirliği veya bakım hassasiyetleri hakkında ne sorarsa sorsun; KAPSAMLI, OTOMOTİV UZMANI GÖZÜYLE, BİLGİLİ VE YARDIMSEVER BİR TÜRKÇE CEVAP VER.
2. Asla "İlanda bu bilgi yok", "TorqueScout olarak genel arıza verisi veremiyoruz" veya "Genel bilgi verilemez" gibi robotik, kaçamak veya geçiştiren basmakalıp cevaplar VERME!
3. LISTING_CONTEXT içinde bilinen kronik sorunlar (knownDatabaseProblems) varsa mutlaka bunlardan bahset. Eğer veritabanında henüz sorun kayıtlı değilse bile kendi otomotiv uzmanlık bilgini kullanarak o model/yıl/şanzıman tipinin bilinen hassasiyetlerini (örn: manuel baskı-balata yıpranması, yağ eksiltme, soğutma hortumları, elektrik soketleri) ilandaki kilometre ve yaş ile harmanlayarak anlat.
4. Satıcı beyanlarını "Satıcının ifadesine göre..." şeklinde sun.
5. Kullanıcının sorusuna doğrudan, samimi, detaylı ve tatmin edici şekilde yanıt ver.`;
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
