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
    return `Sen TorqueScout'un doğrulanmış veritabanı verileri ve üretilmiş araç raporuyla tam senkronize çalışan uzman otomotiv danışmanısın.
Kullanıcı şu anda seçili araç hakkında seninle sohbet ediyor: VEHICLE_OR_LISTING_CONTEXT.

TEMEL DAYANAKLARIN & KURALLARIN:
1. ÜRETİLMİŞ ARAÇ RAPORU KARTLARI (generatedVehicleReportCards): Bu araç için üretilmiş TorqueScout Araç Raporundaki 9 kilit kartı (Tercih Etmek İçin Güçlü Nedenler, Satın Almadan Önce Bilinecek Tavizler, Kimler İçin Mantıklı/Uygun Değil, Satın Alma/Vazgeçme Şartları, Ekspertiz Kontrol Listesi, Satıcıya Sorulacak Sorular, Donanım Paketi Karşılaştırması ve Teknik Özellikler) eksiksiz olarak bil ve kullanıcının sorularına raporda yazan bu kart verileriyle %100 UYUMLU, samimi ve teknik yanıt ver.
2. GERÇEK VERİTABANI VE TEKNİK VERİLER: Araç model yılı, kilometresi, şanzımanı (vites sayısı), HP, tork, yakıt türü ve kronik arıza kayıtlarını esas al.
3. KESİNLİKLE UYDURMA BİLGİ VERME: Var olmayan hayali veriler UYDURMA. Rapor kartlarında ve veritabanında doğrulanmış bilgilere dayan.
4. GİRİŞ VE SOHBET: Kullanıcının sorusuna (şanzıman, paket farkları, tavizler, ekspertiz kontrol noktaları, güçlü nedenler) doğrudan, samimi, otomotiv uzmanı gözüyle detaylı ve tatmin edici şekilde Türkçe yanıt ver.
5. CÜMLE TAMAMLAMA & NETLİK: Yanıtın her zaman noktalı ve tam bir cümleyle bitsin. Asla metnin sonunu yarıda kesme!`;
  }

  async generateListingAdvice(
    userMessage: string,
    contextJson: any,
  ): Promise<{ answer: string; mode: 'AI' | 'SAFE_FALLBACK'; providerName: string }> {
    const primaryProviderName = (process.env.LISTING_AI_PRIMARY_PROVIDER || 'gemini').toLowerCase();
    
    const isReportIntent = userMessage.includes('[INTENT: VEHICLE_FULL_REPORT]');
    const systemPrompt = isReportIntent 
      ? `Sen TorqueScout Yapay Zeka Danışmanısın (Vehicle Intelligence Research Engine). Görevin, sana iletilen 8 araç kimlik filtresini ve araştırmayı esas alarak, 10 temel araç raporu bölümünü ("Bu Araç Nasıl Bir Otomobil?", "Tercih Etmek İçin Güçlü Nedenler", "Satın Almadan Önce Bilinecek Tavizler", "Kimler İçin Mantıklı?", "Kimler İçin Uygun Olmayabilir?", "Hangi Şartlarda Değerlendirilebilir?", "Hangi Durumda Satın Almaktan Vazgeçilmeli?", "Satın Alma Öncesi Ekspertiz Kontrol Listesi", "Satıcıya Sorulacak Kritik Sorular", "Teknik Özellikler") yanıtlayan zengin, samimi ve teknik bir VehicleReportGeneratedContent JSON çıktısı üretmektir. YALNIZCA GEÇERLİ JSON ÜRET.`
      : this.getSystemPrompt();

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
