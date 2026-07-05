import { Injectable, Logger } from '@nestjs/common';
import { RiskLevel, PriorityLevel, ProblemType, VehicleInfoCategory } from '@used-car-intelligence/shared';
import OpenAI from 'openai';
import { z } from 'zod';

// Define Zod validation schemas
export const AIChronicProblemSchema = z.object({
  title: z.string(),
  description: z.string(),
  affectedYears: z.string().nullable().optional(),
  affectedEngine: z.string().nullable().optional(),
  affectedTransmission: z.string().nullable().optional(),
  riskLevel: z.nativeEnum(RiskLevel).default(RiskLevel.MEDIUM),
  symptoms: z.string().nullable().optional(),
  checkRecommendation: z.string().nullable().optional(),
  problemType: z.nativeEnum(ProblemType).default(ProblemType.COMMON_PROBLEM),
  evidenceText: z.string().optional(),
  confidenceContribution: z.number().optional().default(0.5),
});

export const AIRecallSchema = z.object({
  title: z.string(),
  description: z.string(),
  safetyRisk: z.string().nullable().optional(),
  remedy: z.string().nullable().optional(),
  manufacturerCampaignNumber: z.string().nullable().optional(),
  nhtsaCampaignNumber: z.string().nullable().optional(),
  officialCheckUrl: z.string().nullable().optional(),
  affectedYears: z.string().nullable().optional(),
  affectedEngine: z.string().nullable().optional(),
  affectedTransmission: z.string().nullable().optional(),
  vinCheckRequired: z.boolean().default(true),
  recallCode: z.string().nullable().optional(),
  officialSourceUrl: z.string().nullable().optional(),
});

export const AISellerQuestionSchema = z.object({
  question: z.string(),
  reason: z.string().nullable().optional(),
  category: z.nativeEnum(VehicleInfoCategory).default(VehicleInfoCategory.GENERAL),
  riskLevel: z.nativeEnum(RiskLevel).default(RiskLevel.MEDIUM),
  priority: z.nativeEnum(PriorityLevel).default(PriorityLevel.MEDIUM),
});

export const AIInspectionChecklistSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  category: z.nativeEnum(VehicleInfoCategory).default(VehicleInfoCategory.GENERAL),
  riskLevel: z.nativeEnum(RiskLevel).default(RiskLevel.MEDIUM),
  priority: z.nativeEnum(PriorityLevel).default(PriorityLevel.MEDIUM),
  sortOrder: z.number().default(0),
});

export const AIAnalysisOutputSchema = z.object({
  problems: z.array(AIChronicProblemSchema),
  recalls: z.array(AIRecallSchema),
  sellerQuestions: z.array(AISellerQuestionSchema),
  checklists: z.array(AIInspectionChecklistSchema),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisOutputSchema>;

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  async analyzeSources(
    brandName: string,
    modelName: string,
    year: number,
    sources: Array<{ url: string; title: string; snippet: string }>,
    languageCode: string = 'tr',
  ): Promise<AIAnalysisOutput> {
    const isProduction = process.env.NODE_ENV === 'production';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!isProduction && !apiKey) {
      this.logger.log('Mocking AI analysis results in development/test environment (no OPENAI_API_KEY).');
      return this.generateMockAnalysis();
    }

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is missing in production.');
      throw new Error('AI analysis service is not configured in production.');
    }

    const openai = new OpenAI({ apiKey });

    const sourcesText = sources
      .map((s, index) => `[Source ${index + 1}]\nURL: ${s.url}\nTitle: ${s.title}\nExcerpt: ${s.snippet}\n`)
      .join('\n');

    const systemPrompt = `You are a professional automotive risk analyst AI. Your task is to analyze raw search result snippets and extract:
1. Common chronic problems (problems, symptoms, recommendations).
2. Manufacturer or safety recalls.
3. Crucial questions to ask the seller before purchase.
4. Specific checklist items to inspect.

CRITICAL RULES FOR EXTRACTION:
- Synthesize the information from the sources with your own extensive internal automotive knowledge about this specific vehicle variant. Supplement any missing recalls, checklists, or questions from your own knowledge base to provide a comprehensive, detailed report, while keeping the caution phrasing for community forum sources.
- For issues originating from community forums or blogs, use non-definitive, cautious phrasing.
  - In Turkish: "bazı kullanıcılar ... bildirdi", "belirtildi", "görülebildiği ifade edildi" (never "kesindir" or "kronik hatadır" unless backed by official sources).
  - In English: "some users reported", "stated", "indicated" (never definitive).
- Do not include duplicate items.
- Categorize questions and checklist items correctly into their VehicleInfoCategory: ENGINE, TRANSMISSION, ELECTRONICS, SUSPENSION, BRAKE, BODY, PAINT, INTERIOR, TIRES, TEST_DRIVE, MAINTENANCE, DOCUMENTS, GENERAL.
- Ensure recall details are accurate, adding real official recalls for this variant if known to you.
- You must output strictly valid JSON conforming to the schema.`;

    const userPrompt = `Target vehicle: ${year} ${brandName} ${modelName}
Language for outputs: ${languageCode === 'tr' ? 'Turkish' : 'English'}

Raw sources:
${sourcesText}

Generate the JSON matching the required schema. Ensure it is strict JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw response.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0].message.content || '{}';
      this.logger.log(`OpenAI Raw Response: ${text}`);
      const parsed = JSON.parse(text);

      // Normalize to ensure all arrays exist even if OpenAI returned an empty object or omitted keys
      const normalized = {
        problems: Array.isArray(parsed.problems) ? parsed.problems : [],
        recalls: Array.isArray(parsed.recalls) ? parsed.recalls : [],
        sellerQuestions: Array.isArray(parsed.sellerQuestions) ? parsed.sellerQuestions : [],
        checklists: Array.isArray(parsed.checklists) ? parsed.checklists : [],
      };

      // Validate JSON structure using Zod
      const validated = AIAnalysisOutputSchema.parse(normalized);
      return validated;
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  private generateMockAnalysis(): AIAnalysisOutput {
    return {
      problems: [
        {
          title: 'Motor Silindir Kapağı Yağ Sızıntısı',
          description: 'Motor silindir kapağı contasından hafif yağ sızıntısı olduğu belirtilmiştir. Bu durum yağ eksiltmesine yol açabilir.',
          affectedYears: '2015-2018',
          affectedEngine: '1.6 TDI',
          affectedTransmission: 'Tümü',
          riskLevel: RiskLevel.MEDIUM,
          symptoms: 'Motor bloğunda yağ terlemesi, hafif yanık yağ kokusu.',
          checkRecommendation: 'Ekspertiz sırasında motor üst bloğu ve conta çevresi detaylıca incelenmelidir.',
          problemType: ProblemType.COMMON_PROBLEM,
          evidenceText: 'Yağ kaçağı şikayetleri forumlarda sıkça geçmektedir.',
          confidenceContribution: 0.7,
        },
        {
          title: 'Şanzıman Mechatronic Ünitesi Arızası',
          description: 'Çift kavramalı şanzımanlarda mekatronik ünitesinde basınç kaybı ve arıza riski rapor edilmiştir.',
          affectedYears: '2015-2017',
          affectedEngine: 'Tümü',
          affectedTransmission: 'DSG / DCT',
          riskLevel: RiskLevel.HIGH,
          symptoms: 'Vites geçişlerinde vuruntu, şanzıman arıza lambası yanması, vitese geçmeme.',
          checkRecommendation: 'Yol testinde vites geçiş hızı ve vuruntu kontrolü yapılmalı, bilgisayarlı arıza teşhisi alınmalıdır.',
          problemType: ProblemType.COMMON_PROBLEM,
          evidenceText: 'Kullanıcıların mekatronik değişimi yaptırdığı şikayet sitelerinde yer almaktadır.',
          confidenceContribution: 0.8,
        }
      ],
      recalls: [
        {
          title: 'Hava Yastığı Şişirici Geri Çağırması',
          description: 'Nemli ortamlarda hava yastığı şişiricisinin aşırı basınçla açılma ve metal parçacıklar fırlatma riski bulunmaktadır.',
          safetyRisk: 'Kaza anında sürücü veya yolcularda yaralanma riski.',
          remedy: 'Yetkili servis tarafından hava yastığı modülünün ücretsiz değiştirilmesi.',
          manufacturerCampaignNumber: 'R/2021/045',
          nhtsaCampaignNumber: '21V-098',
          officialCheckUrl: 'https://official-recalls.gov/check-vin',
          affectedYears: '2015-2016',
          affectedEngine: 'Tümü',
          affectedTransmission: 'Tümü',
          vinCheckRequired: true,
          recallCode: 'TAKATA-2021',
          officialSourceUrl: 'https://official-recalls.gov/campaign/123',
        }
      ],
      sellerQuestions: [
        {
          question: 'Şanzıman mekatronik ünitesi daha önce değişti mi veya revizyon gördü mü?',
          reason: 'DSG/DCT şanzımanlarda mekatronik arızası masraflı bir kronik sorundur.',
          category: VehicleInfoCategory.TRANSMISSION,
          riskLevel: RiskLevel.HIGH,
          priority: PriorityLevel.HIGH,
        },
        {
          question: 'Motor yağı eksiltme durumu nedir, ne sıklıkla yağ ilave ediyorsunuz?',
          reason: '1.6 TDI motorlarda üst kapak contası sızıntısı yağ eksiltmeye yol açabilir.',
          category: VehicleInfoCategory.ENGINE,
          riskLevel: RiskLevel.MEDIUM,
          priority: PriorityLevel.MEDIUM,
        }
      ],
      checklists: [
        {
          title: 'Şanzıman Vites Geçiş Testi',
          description: 'Aracı test sürüşüne çıkararak vites geçişlerinde vuruntu, kaçırma veya gecikme olup olmadığını dinleyin.',
          category: VehicleInfoCategory.TRANSMISSION,
          riskLevel: RiskLevel.HIGH,
          priority: PriorityLevel.HIGH,
          sortOrder: 1,
        },
        {
          title: 'Motor Bloğu Alt/Üst Sızıntı Kontrolü',
          description: 'Motor kapağını sökerek enjektör dipleri ve silindir kapağı contası çevresinde yağ sızıntısı arayın.',
          category: VehicleInfoCategory.ENGINE,
          riskLevel: RiskLevel.MEDIUM,
          priority: PriorityLevel.MEDIUM,
          sortOrder: 2,
        }
      ],
    };
  }
}
