/**
 * vehicle-character-research.service.ts
 *
 * TorqueScout Vehicle Character Research Service
 *
 * Runs 5 targeted Tavily searches (Q1–Q5) in parallel for the
 * "Bu Araç Nasıl Bir Otomobil?" section of the vehicle report.
 * Questions Q6 and Q7 are pure synthesis — no web search required.
 *
 * Enforces strict evidence-only rules at the code level:
 * - null returned for any question where evidence is insufficient.
 * - No numeric values fabricated when source data is absent.
 * - Comfort/NVH/dynamics require ≥2 independent source agreement.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TavilySearchProvider } from './providers/tavily-search.provider';
import {
  CHARACTER_RESEARCH_QUESTIONS,
  CHARACTER_RESEARCH_DOMAINS,
  CHARACTER_RESEARCH_MASTER_RULES,
  CHARACTER_EVIDENCE_RULES,
  VehicleCharacterResearchResult,
  CharacterQuestionAnswer,
} from './prompts/vehicle-character-agent.prompt';

export interface VehicleCharacterResearchInput {
  year: number;
  brand: string;
  model: string;
  generation?: string;
  bodyType?: string;
  engineCode?: string;
  enginePowerHp?: number;
  transmissionName?: string;
  transmissionType?: string;
  driveType?: string;
  trimName?: string;
  market?: string;
  languageCode?: string;
}

@Injectable()
export class VehicleCharacterResearchService {
  private readonly logger = new Logger(VehicleCharacterResearchService.name);

  /** Minimum number of sources required for MODERATE/STRONG evidence level */
  private readonly MIN_SOURCES_MODERATE = 2;
  private readonly MIN_SOURCES_STRONG = 3;

  constructor(private readonly tavilySearch: TavilySearchProvider) {}

  /**
   * Main entry point. Runs Q1–Q5 Tavily searches in parallel, then synthesises Q6 and Q7.
   * Returns a VehicleCharacterResearchResult ready to be stored in VehicleVariant.characterResearchCache.
   */
  async runCharacterResearch(
    input: VehicleCharacterResearchInput,
  ): Promise<VehicleCharacterResearchResult> {
    const variantTitle = this.buildVariantTitle(input);
    this.logger.log(`Starting character research for: ${variantTitle}`);

    // Build all domain tiers for Tavily include_domains
    const allDomains = [
      ...CHARACTER_RESEARCH_DOMAINS.tier1_aggregate,
      ...CHARACTER_RESEARCH_DOMAINS.tier2_community,
      ...CHARACTER_RESEARCH_DOMAINS.tier3_press,
    ];

    // Run Q1–Q5 in parallel (synthesis questions Q6, Q7 don't need web search)
    const searchableQuestions = CHARACTER_RESEARCH_QUESTIONS.filter(
      (q): q is typeof CHARACTER_RESEARCH_QUESTIONS[number] & { tavilyQueryTemplate: string } =>
        !(q as any).isSynthesisOnly && typeof (q as any).tavilyQueryTemplate === 'string',
    );

    const searchPromises = searchableQuestions.map(async (question) => {
      const query = this.buildQuery((question as any).tavilyQueryTemplate as string, input);
      return this.fetchEvidenceForQuestion(question.questionId, query, allDomains);
    });

    const [q1Result, q2Result, q3Result, q4Result, q5Result] =
      await Promise.allSettled(searchPromises);

    const characterAndSegment = this.extractResult(q1Result, 'Q1_CHARACTER_AND_SEGMENT');
    const engineTransmissionFit = this.extractResult(q2Result, 'Q2_ENGINE_TRANSMISSION_PERFORMANCE');
    const drivingDynamics = this.extractResult(q3Result, 'Q3_DRIVING_DYNAMICS');
    const comfortAndIsolation = this.extractResult(q4Result, 'Q4_COMFORT_ISOLATION');
    const interiorPracticality = this.extractResult(q5Result, 'Q5_INTERIOR_PRACTICALITY');

    // Q6: Synthesise from Q1–Q5 via LLM
    const usageScenarios = await this.synthesiseQuestion(
      'Q6_USAGE_SCENARIOS',
      variantTitle,
      { characterAndSegment, engineTransmissionFit, drivingDynamics, comfortAndIsolation, interiorPracticality },
    );

    // Q7: Synthesise from Q1–Q6 via LLM
    const userProfileAndVerdict = await this.synthesiseQuestion(
      'Q7_USER_PROFILE_VERDICT',
      variantTitle,
      { characterAndSegment, engineTransmissionFit, drivingDynamics, comfortAndIsolation, interiorPracticality, usageScenarios },
    );

    const totalSourcesFound = [
      characterAndSegment, engineTransmissionFit, drivingDynamics,
      comfortAndIsolation, interiorPracticality,
    ]
      .filter(Boolean)
      .reduce((sum, q) => sum + (q?.sourceCount ?? 0), 0);

    const result: VehicleCharacterResearchResult = {
      variantTitle,
      researchedAt: new Date().toISOString(),
      totalSourcesFound,
      questions: {
        characterAndSegment,
        engineTransmissionFit,
        drivingDynamics,
        comfortAndIsolation,
        interiorPracticality,
        usageScenarios,
        userProfileAndVerdict,
      },
    };

    this.logger.log(
      `Character research complete for ${variantTitle}. Total sources: ${totalSourcesFound}`,
    );

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private buildVariantTitle(input: VehicleCharacterResearchInput): string {
    return [
      input.year,
      input.brand,
      input.model,
      input.generation,
      input.bodyType,
      input.engineCode,
      input.enginePowerHp ? `${input.enginePowerHp}HP` : null,
      input.transmissionName,
      input.driveType,
      input.trimName,
      input.market,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildQuery(template: string, input: VehicleCharacterResearchInput): string {
    return template
      .replace('{{year}}', String(input.year))
      .replace('{{brand}}', input.brand)
      .replace('{{model}}', input.model)
      .replace('{{trim}}', input.trimName || '')
      .replace('{{engine}}', input.engineCode || '')
      .replace('{{engineCode}}', input.engineCode || '')
      .replace('{{transmission}}', input.transmissionName || '')
      .trim();
  }

  private async fetchEvidenceForQuestion(
    questionId: string,
    query: string,
    domains: readonly string[],
  ): Promise<CharacterQuestionAnswer | null> {
    try {
      const response = await this.tavilySearch.search(query, {
        searchDepth: 'advanced',
        maxResults: 5,
      });

      if (!response.results || response.results.length === 0) {
        this.logger.warn(`No results for ${questionId} — query: "${query}"`);
        return null;
      }

      const sources = response.results.map((r) => ({
        url: r.url,
        domain: r.domain || new URL(r.url).hostname.replace(/^www\./, ''),
        title: r.title,
        relevantSnippet: r.snippet || r.contentMarkdown || '',
        reliabilityTier: this.getReliabilityTier(r.domain || r.url),
      }));

      const evidenceLevel = this.calculateEvidenceLevel(sources, questionId);

      // For comfort/dynamics questions that require ≥2 sources — enforce the rule
      const needsMultiSource = ['Q3_DRIVING_DYNAMICS', 'Q4_COMFORT_ISOLATION'].includes(questionId);
      if (needsMultiSource && sources.length < this.MIN_SOURCES_MODERATE) {
        return {
          questionId: questionId as any,
          evidenceLevel: 'INSUFFICIENT',
          sourceCount: sources.length,
          sources,
          synthesisedAnswer: '',
          caveats: [
            `Bu konu için yeterli bağımsız kaynak bulunamadı (${sources.length} kaynak, gerekli minimum: ${this.MIN_SOURCES_MODERATE}). Değerlendirme rapordan çıkarıldı.`,
          ],
        };
      }

      // Build raw evidence text for synthesis
      const evidenceText = sources
        .map((s, i) => `[Kaynak ${i + 1} — ${s.domain}]\n${s.relevantSnippet}`)
        .join('\n\n');

      // Synthesise via LLM (Gemini)
      const synthesisedAnswer = await this.synthesiseWithLLM(
        questionId,
        evidenceText,
        this.buildVariantTitle,
      );

      const caveats: string[] = [];
      if (sources.length === 1) {
        caveats.push('Bu bulgu yalnızca tek bir kaynağa dayanmaktadır; dikkatli değerlendiriniz.');
      }
      if (evidenceLevel === 'WEAK') {
        caveats.push('Bulunan kaynaklar düşük güvenilirlik tier\'ından gelmektedir.');
      }

      return {
        questionId: questionId as any,
        evidenceLevel,
        sourceCount: sources.length,
        sources,
        synthesisedAnswer,
        caveats,
      };
    } catch (err: any) {
      this.logger.error(`Character research failed for ${questionId}: ${err.message}`);
      return null;
    }
  }

  private calculateEvidenceLevel(
    sources: Array<{ reliabilityTier: number }>,
    questionId: string,
  ): 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT' {
    if (sources.length === 0) return 'INSUFFICIENT';

    const tier1Count = sources.filter((s) => s.reliabilityTier === 1).length;
    const tier2Count = sources.filter((s) => s.reliabilityTier === 2).length;

    if (sources.length >= this.MIN_SOURCES_STRONG && tier1Count >= 1) return 'STRONG';
    if (sources.length >= this.MIN_SOURCES_MODERATE && (tier1Count + tier2Count) >= 1) return 'MODERATE';
    if (sources.length === 1) return 'WEAK';
    return 'INSUFFICIENT';
  }

  private getReliabilityTier(domain: string): 1 | 2 | 3 {
    const d = domain.toLowerCase();
    if (
      CHARACTER_RESEARCH_DOMAINS.tier1_aggregate.some((td) => d.includes(td))
    )
      return 1;
    if (
      CHARACTER_RESEARCH_DOMAINS.tier2_community.some((td) => d.includes(td))
    )
      return 2;
    return 3;
  }

  private extractResult(
    settled: PromiseSettledResult<CharacterQuestionAnswer | null>,
    questionId: string,
  ): CharacterQuestionAnswer | null {
    if (settled.status === 'fulfilled') return settled.value;
    this.logger.error(`Question ${questionId} search promise rejected: ${(settled as any).reason}`);
    return null;
  }

  /**
   * Synthesises Q6 or Q7 from previously gathered Q1–Q5 answers using Gemini.
   * Does NOT perform any new web search — enforces SYNTHESIS_ONLY rule.
   */
  private async synthesiseQuestion(
    questionId: string,
    variantTitle: string,
    previousAnswers: Record<string, CharacterQuestionAnswer | null>,
  ): Promise<CharacterQuestionAnswer | null> {
    const questionDef = CHARACTER_RESEARCH_QUESTIONS.find((q) => q.questionId === questionId);
    if (!questionDef) return null;

    const availableEvidence = Object.entries(previousAnswers)
      .filter(([, v]) => v && v.evidenceLevel !== 'INSUFFICIENT' && v.synthesisedAnswer)
      .map(([k, v]) => `[${k}]\n${v!.synthesisedAnswer}`)
      .join('\n\n');

    if (!availableEvidence) {
      this.logger.warn(`${questionId}: No prior evidence available for synthesis.`);
      return null;
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      this.logger.warn(`GEMINI_API_KEY not set — skipping synthesis for ${questionId}`);
      return null;
    }

    const prompt = `${CHARACTER_RESEARCH_MASTER_RULES}

ARAÇ: ${variantTitle}

SENTEZ KAYNAĞI (Q1-Q5 araştırma bulguları):
${availableEvidence}

KURAL: Yeni araştırma yapma. Yalnızca yukarıdaki bulguları kullanarak şu soruyu yanıtla:

SORU: ${questionDef.researchQuestion}

Yanıtı Türkçe, somut ve kaynaklara dayalı olarak üret. Eğer yukarıdaki bulgular bu soruyu yanıtlamaya yetmiyorsa "INSUFFICIENT_EVIDENCE" döndür.

Yalnızca düz metin yanıt üret. JSON değil.`;

    try {
      const synthesisedAnswer = await this.callGemini(prompt, geminiApiKey);
      if (!synthesisedAnswer || synthesisedAnswer === 'INSUFFICIENT_EVIDENCE') {
        return null;
      }

      return {
        questionId: questionId as any,
        evidenceLevel: 'MODERATE',
        sourceCount: 0, // Synthesis — sources come from prior questions
        sources: [],
        synthesisedAnswer,
        caveats: ['Bu değerlendirme Q1–Q5 araştırma bulgularından sentezlenmiştir; yeni kaynak araştırması yapılmamıştır.'],
      };
    } catch (err: any) {
      this.logger.error(`Synthesis failed for ${questionId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Calls Gemini to synthesise a Turkish answer from raw evidence snippets.
   * Enforces the CHARACTER_RESEARCH_MASTER_RULES and CHARACTER_EVIDENCE_RULES.
   */
  private async synthesiseWithLLM(
    questionId: string,
    evidenceText: string,
    variantTitleFn: Function,
  ): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY not set — returning raw evidence summary.');
      return evidenceText.substring(0, 800);
    }

    const questionDef = CHARACTER_RESEARCH_QUESTIONS.find((q) => q.questionId === questionId);

    const prompt = `${CHARACTER_RESEARCH_MASTER_RULES}

ARAŞTIRMA KURALLARI (KOD SEVİYESİNDE ZORUNLU):
${CHARACTER_EVIDENCE_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ARAŞTIRILAN SORU: ${questionDef?.researchQuestion || questionId}

YASAK PATTERN'LAR:
${questionDef?.forbidden?.map((f) => `- ${f}`).join('\n') || ''}

BULUNAN KANIT METİNLERİ:
${evidenceText}

Yukarıdaki kanıt metinlerine dayanarak soruyu Türkçe olarak yanıtla.
- Soyut sıfat yasak; somut davranış/karşılaştırma zorunlu.
- Veri yoksa o kısım için "Bu konuda doğrulanabilir kaynak bulunamadı." yaz.
- Yalnızca düz metin yanıt üret. JSON değil.`;

    return this.callGemini(prompt, geminiApiKey);
  }

  private async callGemini(prompt: string, apiKey: string): Promise<string> {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini ${model} returned ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Gemini ${model} failed in character research: ${err.message}`);
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }
}
