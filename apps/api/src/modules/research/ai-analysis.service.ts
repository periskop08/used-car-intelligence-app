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
    specs?: { engineCode?: string; transmissionName?: string; fuelType?: string; hasTurbo?: boolean },
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
- CRITICAL: You must strictly respect the vehicle's engine and fuel specifications. If the target vehicle's engine is naturally aspirated (Turbocharged: No), you MUST NOT extract or suggest any turbocharger-related problems, recalls, seller questions, or inspection checklist items (e.g., no "Turbo Kontrolü", "turbo sızıntısı", etc.).
- CRITICAL: Do NOT cross-contaminate or mix issues of different engine/fuel types (e.g., do not apply diesel engine i-DTEC issues to a petrol engine i-VTEC, and do not apply turbo problems to naturally aspirated engines).
- The chronic problem "title" MUST be highly specific and technically precise to the actual failed component or condition (e.g., "Triger Zinciri (Timing Chain) Gevşemesi" or "Yağ Soğutucusu Sızıntısı", NOT generic titles like "Motor Problemleri" or "Elektrik Sorunları").
- For issues originating from community forums or blogs, use non-definitive, cautious phrasing.
  - In Turkish: "bazı kullanıcılar ... bildirdi", "belirtildi", "görülebildiği ifade edildi" (never "kesindir" or "kronik hatadır" unless backed by official sources).
  - In English: "some users reported", "stated", "indicated" (never definitive).
- CRITICAL: Do NOT use definitive or alarmist words like "kronik", "kesin arızalı", "problemli", or "alınmaz" in the user-facing titles and descriptions. Instead, frame issues as "commonly reported conditions" or "inspection advice", using advisory phrasing such as "görülebilir", "dikkat edilmelidir", "kontrol edilmelidir", "bazı kullanıcı bildirimlerinde yer alır", "daha sık dile getirilebilir", "satın alma öncesi incelenmelidir".
- Do not include duplicate items.
- Categorize questions and checklist items correctly into their VehicleInfoCategory: ENGINE, TRANSMISSION, ELECTRONICS, SUSPENSION, BRAKE, BODY, PAINT, INTERIOR, TIRES, TEST_DRIVE, MAINTENANCE, DOCUMENTS, GENERAL.
- Ensure recall details are accurate, adding real official recalls for this variant if known to you.
- You must output strictly valid JSON conforming to the schema.`;

    const specsText = specs
      ? `\nEngine: ${specs.engineCode || 'N/A'} (${specs.fuelType || 'N/A'}, Turbocharged: ${specs.hasTurbo ? 'Yes' : 'No'})\nTransmission: ${specs.transmissionName || 'N/A'}`
      : '';

    const userPrompt = `Target vehicle: ${year} ${brandName} ${modelName}${specsText}
Language for outputs: ${languageCode === 'tr' ? 'Turkish' : 'English'}

Raw sources:
${sourcesText}

Generate a JSON object matching this exact schema:
{
  "problems": [
    {
      "title": "Problem Title",
      "description": "Problem Description",
      "affectedYears": "2015-2018",
      "affectedEngine": "1.6 TDI",
      "affectedTransmission": "DSG / DCT",
      "riskLevel": "HIGH" | "MEDIUM" | "LOW",
      "symptoms": "Symptoms description",
      "checkRecommendation": "What to inspect",
      "problemType": "COMMON_PROBLEM" | "RECALL" | "OTHER",
      "evidenceText": "Excerpt or proof",
      "confidenceContribution": 0.8
    }
  ],
  "recalls": [
    {
      "title": "Recall Title",
      "description": "Recall Description",
      "safetyRisk": "Safety Risk Description",
      "remedy": "Remedy Description",
      "manufacturerCampaignNumber": "Campaign Code",
      "nhtsaCampaignNumber": "NHTSA Code",
      "officialCheckUrl": "https://...",
      "affectedYears": "2015-2016",
      "affectedEngine": "1.6 TDI",
      "affectedTransmission": "DSG / DCT",
      "vinCheckRequired": true,
      "recallCode": "Recall Code",
      "officialSourceUrl": "https://..."
    }
  ],
  "sellerQuestions": [
    {
      "question": "Question text?",
      "reason": "Why ask this",
      "category": "ENGINE" | "TRANSMISSION" | "ELECTRONICS" | "SUSPENSION" | "BRAKE" | "BODY" | "PAINT" | "INTERIOR" | "TIRES" | "TEST_DRIVE" | "MAINTENANCE" | "DOCUMENTS" | "GENERAL",
      "riskLevel": "HIGH" | "MEDIUM" | "LOW",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "checklists": [
    {
      "title": "Checklist Item Title",
      "description": "Details of check",
      "category": "ENGINE" | "TRANSMISSION" | "ELECTRONICS" | "SUSPENSION" | "BRAKE" | "BODY" | "PAINT" | "INTERIOR" | "TIRES" | "TEST_DRIVE" | "MAINTENANCE" | "DOCUMENTS" | "GENERAL",
      "riskLevel": "HIGH" | "MEDIUM" | "LOW",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "sortOrder": 0
    }
  ]
}

Ensure it is strict JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw response.`;

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

      // Normalize to ensure all arrays exist and map alternative key names
      const problemsRaw = parsed.problems || parsed.CommonChronicProblems || [];
      const recallsRaw = parsed.recalls || parsed.ManufacturerOrSafetyRecalls || [];
      const sellerQuestionsRaw = parsed.sellerQuestions || parsed.CrucialQuestionsToAskSeller || [];

      // If checklists is an object (key-value categories), flatten it into an array of objects
      let checklistsRaw = parsed.checklists || parsed.SpecificChecklistItemsToInspect || [];
      if (checklistsRaw && !Array.isArray(checklistsRaw) && typeof checklistsRaw === 'object') {
        const flattened = [];
        for (const [category, items] of Object.entries(checklistsRaw)) {
          if (Array.isArray(items)) {
            items.forEach((item: any, idx: number) => {
              flattened.push({
                title: typeof item === 'string' ? item : (item.title || ''),
                description: typeof item === 'string' ? item : (item.description || ''),
                category: category.toUpperCase(),
                riskLevel: 'MEDIUM',
                priority: 'MEDIUM',
                sortOrder: idx,
              });
            });
          }
        }
        checklistsRaw = flattened;
      }

      // Map array items to ensure correct fields
      const problems = Array.isArray(problemsRaw)
        ? problemsRaw.map((p: any) => ({
            title: p.title || p.problem || '',
            description: p.description || p.problem || '',
            affectedYears: p.affectedYears || null,
            affectedEngine: p.affectedEngine || null,
            affectedTransmission: p.affectedTransmission || null,
            riskLevel: p.riskLevel || 'MEDIUM',
            symptoms: Array.isArray(p.symptoms) ? p.symptoms.join(', ') : (p.symptoms || null),
            checkRecommendation: Array.isArray(p.recommendations) ? p.recommendations.join(', ') : (p.checkRecommendation || null),
            problemType: p.problemType || 'COMMON_PROBLEM',
            evidenceText: p.evidenceText || '',
            confidenceContribution: p.confidenceContribution || 0.5,
          }))
        : [];

      const recalls = Array.isArray(recallsRaw)
        ? recallsRaw.map((r: any) => ({
            title: r.title || r.recall || '',
            description: r.description || r.recall || '',
            safetyRisk: r.safetyRisk || null,
            remedy: r.remedy || null,
            manufacturerCampaignNumber: r.manufacturerCampaignNumber || null,
            nhtsaCampaignNumber: r.nhtsaCampaignNumber || null,
            officialCheckUrl: r.officialCheckUrl || null,
            affectedYears: r.affectedYears || null,
            affectedEngine: r.affectedEngine || null,
            affectedTransmission: r.affectedTransmission || null,
            vinCheckRequired: typeof r.vinCheckRequired === 'boolean' ? r.vinCheckRequired : true,
            recallCode: r.recallCode || null,
            officialSourceUrl: r.officialSourceUrl || null,
          }))
        : [];

      const sellerQuestions = Array.isArray(sellerQuestionsRaw)
        ? sellerQuestionsRaw.map((q: any) => ({
            question: q.question || '',
            reason: q.reason || '',
            category: q.category || 'GENERAL',
            riskLevel: q.riskLevel || 'MEDIUM',
            priority: q.priority || 'MEDIUM',
          }))
        : [];

      const checklists = Array.isArray(checklistsRaw)
        ? checklistsRaw.map((c: any) => ({
            title: c.title || '',
            description: c.description || '',
            category: c.category || 'GENERAL',
            riskLevel: c.riskLevel || 'MEDIUM',
            priority: c.priority || 'MEDIUM',
            sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
          }))
        : [];

      const normalized = {
        problems,
        recalls,
        sellerQuestions,
        checklists,
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
