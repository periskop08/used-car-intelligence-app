import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { GenerateReportDto, AskChatDto } from './report.dto';
import { FeatureKey, ApprovalStatus, PriorityLevel, ResearchScope } from '@prisma/client';
import { AiReportGeneratorService } from '../research/ai-report-generator.service';
import { CoverageService } from '../research/coverage.service';
import { ResearchService } from '../research/research.service';
import OpenAI from 'openai';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
    private reportGenerator: AiReportGeneratorService,
    private coverageService: CoverageService,
    private researchService: ResearchService,
  ) {}

  async generateReport(userId: string, dto: GenerateReportDto & { force?: boolean }) {
    const lang = dto.languageCode || 'tr';
    if (lang !== 'tr' && lang !== 'en') {
      throw new BadRequestException('Desteklenen diller yalnızca "tr" ve "en" dilleridir.');
    }

    // 1. Transaction-safe limit check & usage increment
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_REPORT);

    // 2. Fetch variant with relations
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variantId },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
      },
    });
    if (!variant || variant.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
    }

    // Verify all critical fields are populated
    if (
      !variant.brand?.name ||
      !variant.model?.name ||
      !variant.year ||
      !variant.bodyType ||
      !variant.engine?.code ||
      !variant.fuelType ||
      !variant.transmission?.name ||
      !variant.trim?.name
    ) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
    }

    // 3. Check for existing APPROVED AiVehicleReport cache
    const existingReport = await this.prisma.aiVehicleReport.findUnique({
      where: {
        variantId_languageCode: {
          variantId: dto.variantId,
          languageCode: lang,
        },
      },
    });

    const hasFullSummary = existingReport && existingReport.summary && typeof existingReport.summary === 'object' && (existingReport.summary as any).summary;
    if (existingReport && existingReport.status === ApprovalStatus.APPROVED && !dto.force && hasFullSummary) {
      return existingReport;
    }

    if (dto.force) {
      if (existingReport && (existingReport.summary as any)?.trimWarning) {
        throw new BadRequestException('Böyle bir araç kombinasyonu gerçekte üretilmediği için yeniden araştırma yapılamaz.');
      }
      try {
        await this.researchService.requestResearch(
          dto.variantId,
          userId,
          lang,
          'TR',
          ResearchScope.FULL_REPORT,
          PriorityLevel.HIGH,
        );
        await this.researchService.processNextJob();
      } catch (err: any) {
        console.error('Failed to trigger or process research job in generateReport:', err.message);
      }
    }

    // 4. Generate and cache report
    const report = await this.reportGenerator.generateReportCache(dto.variantId, lang);
    return report;
  }

  async askChatQuestion(userId: string, dto: AskChatDto) {
    // 1. Transaction-safe limit check
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    // 2. Fetch approved variant along with its approved problems and recalls
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variantId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        problems: {
          where: { status: ApprovalStatus.APPROVED },
        },
        recalls: {
          where: { status: ApprovalStatus.APPROVED },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Araç varyantı bulunamadı veya onaylanmış durumda değil.');
    }

    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const problemsText = variant.problems
      .map((p: any) => `- ${p.title}: ${p.description} (Risk: ${p.riskLevel})`)
      .join('\n');
    const recallsText = variant.recalls
      .map((r: any) => `- ${r.title}: ${r.description}`)
      .join('\n');

    const systemPrompt = `You are an expert car buying assistant and AI vehicle advisor for TorqueScout.
The user is asking a question about a specific vehicle: ${variant.year} ${variant.brand.name} ${variant.model.name} (${variant.engine?.code || ''}, ${variant.transmission?.name || ''}).

Approved chronic problems for this vehicle:
${problemsText || 'No major chronic problems recorded in verified database.'}

Approved recalls for this vehicle:
${recallsText || 'No official recalls recorded in verified database.'}

Answer the user's question accurately based on automotive facts and this data. Always answer in Turkish, and keep your tone helpful, informative, and objective.`;

    let response = '';

    // 1. TRY GEMINI MULTI-MODEL FALLBACK FIRST
    if (geminiApiKey) {
      const geminiModels = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
      const fullPrompt = `${systemPrompt}\n\nKullanıcı Sorusu: ${dto.question}`;

      for (const model of geminiModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 2500 },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 10) {
              response = text.trim();
              break;
            }
          }
        } catch (e: any) {
          console.warn(`Gemini model ${model} failed in ReportService: ${e?.message}`);
        }
      }
    }

    // 2. TRY OPENAI IF GEMINI DID NOT RETURN A RESPONSE
    if (!response && openaiApiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiApiKey });
        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.question },
          ],
          temperature: 0.7,
        });

        if (aiResponse.choices[0]?.message?.content) {
          response = aiResponse.choices[0].message.content.trim();
        }
      } catch (err: any) {
        console.warn(`OpenAI failed in ReportService: ${err?.message}`);
      }
    }

    // 3. SMART AUTOMOTIVE FALLBACK (If AI APIs are rate limited or unavailable)
    if (!response) {
      const qLower = dto.question.toLowerCase();
      const carTitle = `${variant.year} ${variant.brand.name} ${variant.model.name}`;
      const transName = variant.transmission?.name || 'Şanzıman';

      if (qLower.includes('şanzıman') || qLower.includes('vites') || qLower.includes('baskı balata') || qLower.includes('şanzımanı')) {
        response = `### ⚙️ ${carTitle} Şanzıman ve Aktarma Değerlendirmesi\n\n` +
          `**${transName}** yapısına sahip bu araç için veritabanımızdaki veriler ve mekanik standartlar:\n\n` +
          `• **Şanzıman Karakteri:** ${transName} günlük ve şehir içi kullanımlarda performans beklentilerini karşılar.\n` +
          `• **Bakım Hassasiyeti:** Periyodik şanzıman yağı değişimleri ve baskı balata / kavramanın zamanında kontrol edilmesi uzun vadede şanzıman sağlığını korur.\n` +
          `• **Kronik Sorun Kayıtları:** Veritabanımızda bu model için onaylanmış ${variant.problems.length} adet kronik kayıt yer almaktadır.\n\n` +
          `*Alım öncesi ekspertizde vitesteki geçiş pürüzsüzlüğü ve kavramanın kavrama noktası mutlaka kontrol ettirilmelidir.*`;
      } else if (qLower.includes('kronik') || qLower.includes('problem') || qLower.includes('arıza') || qLower.includes('sorun')) {
        const problemList = variant.problems.map((p) => `• **${p.title}** (${p.riskLevel} Risk): ${p.description}`).join('\n');
        response = `### 🔍 ${carTitle} Kronik Sorun & Arıza Analizi\n\n` +
          (problemList
            ? `TorqueScout doğrulanmış veritabanında bu araç için kaydedilmiş kronik sorunlar:\n\n${problemList}\n\n`
            : `✓ Bu araç kombinasyonu için veritabanımızda henüz yüksek riskli kritik bir kronik arıza kaydı bildirilmemiştir.\n\n`) +
          `*Araştırmalarımız düzenli olarak güncellenmekte olup alım öncesi bağımsız mekanik ekspertizi yaptırmanız tavsiye edilir.*`;
      } else {
        response = `### 🤖 ${carTitle} AI Danışman Değerlendirmesi\n\n` +
          `**${carTitle}** aracı için sorunuz incelenmiştir:\n\n` +
          `• **Araç Bilgisi:** ${variant.year} Model ${variant.brand.name} ${variant.model.name} (${variant.engine?.code || ''}, ${transName})\n` +
          `• **Doğrulanmış Kayıtlar:** Veritabanımızda bu araca ait ${variant.problems.length} adet kronik sorun ve ${variant.recalls.length} adet resmi geri çağırma kaydı bulunmaktadır.\n\n` +
          `Detaylı kronik arıza, bakım maliyetleri ve satın alınabilirlik skorunu görmek için aracın **Teknik Rapor** sekmesini inceleyebilirsiniz.`;
      }
    }

    // 4. Log the chat question
    await this.prisma.aiChatLog.create({
      data: {
        userId,
        variantId: variant.id,
        prompt: dto.question,
        response,
      },
    });

    return { response };
  }
}
