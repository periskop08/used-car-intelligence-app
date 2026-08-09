/**
 * vehicle-character-research.service.ts
 *
 * TorqueScout Vehicle Character Research Service
 *
 * Runs 5 targeted web searches (Q1–Q5) in parallel for the
 * "Bu Araç Nasıl Bir Otomobil?" section of the vehicle report.
 * Questions Q6 and Q7 are pure synthesis — no web search required.
 *
 * Search Providers (4-Step Cascade):
 * 1. Tavily Search (English query template)
 * 2. Tavily Search (Turkish query template)
 * 3. Gemini Search Grounding (Google Search via Gemini API)
 * 4. WebSearchProvider (Serper / AI Search Grounding)
 *
 * Enforces strict evidence-only rules at the code level:
 * - null returned for any question where evidence is insufficient.
 * - No numeric values fabricated when source data is absent.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TavilySearchProvider } from './providers/tavily-search.provider';
import { GeminiGroundingProvider } from './providers/gemini-grounding.provider';
import { WebSearchProvider } from './providers/web-search.provider';
import { FirecrawlExtractProvider } from './providers/firecrawl-extract.provider';
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

  constructor(
    private readonly tavilySearch: TavilySearchProvider,
    private readonly firecrawlSearch: FirecrawlExtractProvider,
    private readonly geminiGrounding: GeminiGroundingProvider,
    private readonly webSearch: WebSearchProvider,
  ) {}

  /**
   * Main entry point. Runs Q1–Q5 web searches in parallel with multi-provider fallbacks,
   * then synthesises Q6 and Q7.
   */
  async runCharacterResearch(
    input: VehicleCharacterResearchInput,
  ): Promise<VehicleCharacterResearchResult> {
    const variantTitle = this.buildVariantTitle(input);
    this.logger.log(`Starting character research for: ${variantTitle}`);

    const allDomains = [
      ...CHARACTER_RESEARCH_DOMAINS.tier1_aggregate,
      ...CHARACTER_RESEARCH_DOMAINS.tier2_community,
      ...CHARACTER_RESEARCH_DOMAINS.tier3_press,
    ];

    // Filter searchable questions (Q1–Q5)
    const searchableQuestions = CHARACTER_RESEARCH_QUESTIONS.filter(
      (q): q is typeof CHARACTER_RESEARCH_QUESTIONS[number] & { tavilyQueryTemplate: string } =>
        !(q as any).isSynthesisOnly,
    );

    // Process Q1–Q5 sequentially to minimize memory concurrency & prevent V8 heap spikes on 512MB RAM containers
    const answers: Record<string, CharacterQuestionAnswer | null> = {};

    for (const question of searchableQuestions) {
      const engQuery = this.buildQuery(
        (question as any).tavilyQueryTemplate || '',
        input,
      );
      const trQuery = this.buildQuery(
        (question as any).turkishQueryTemplate || '',
        input,
      );
      answers[question.questionId] = await this.fetchEvidenceForQuestion(
        question.questionId,
        engQuery,
        trQuery,
        allDomains,
        input,
      );
    }

    const characterAndSegment = answers['Q1_CHARACTER_AND_SEGMENT'] || null;
    const engineTransmissionFit = answers['Q2_ENGINE_TRANSMISSION_PERFORMANCE'] || null;
    const drivingDynamics = answers['Q3_DRIVING_DYNAMICS'] || null;
    const comfortAndIsolation = answers['Q4_COMFORT_ISOLATION'] || null;
    const interiorPracticality = answers['Q5_INTERIOR_PRACTICALITY'] || null;

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
      `Character research complete for ${variantTitle}. Total sources found across web: ${totalSourcesFound}`,
    );

    if (typeof global.gc === 'function') {
      global.gc();
    }

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
      .replace('{{brand}}', input.brand || '')
      .replace('{{model}}', input.model || '')
      .replace('{{trim}}', input.trimName || '')
      .replace('{{engine}}', input.engineCode || '')
      .replace('{{engineCode}}', input.engineCode || '')
      .replace('{{transmission}}', input.transmissionName || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async fetchEvidenceForQuestion(
    questionId: string,
    englishQuery: string,
    turkishQuery: string,
    domains: readonly string[],
    input: VehicleCharacterResearchInput,
  ): Promise<CharacterQuestionAnswer | null> {
    let sources: Array<{
      url: string;
      domain: string;
      title: string;
      relevantSnippet: string;
      reliabilityTier: 1 | 2 | 3;
    }> = [];
    let usedProvider = '';

    // Step 1: Tavily (English template query)
    try {
      if (englishQuery) {
        const resp = await this.tavilySearch.search(englishQuery, {
          searchDepth: 'advanced',
          maxResults: 5,
        });
        if (resp.results && resp.results.length > 0) {
          sources = this.mapSearchResults(resp.results);
          usedProvider = 'tavily_en';
        }
      }
    } catch (err: any) {
      this.logger.warn(`Tavily English search failed for ${questionId}: ${err.message}`);
    }

    // Step 2: Tavily (Turkish template query) if step 1 returned 0 results
    if (sources.length === 0 && turkishQuery) {
      try {
        const resp = await this.tavilySearch.search(turkishQuery, {
          searchDepth: 'advanced',
          maxResults: 5,
        });
        if (resp.results && resp.results.length > 0) {
          sources = this.mapSearchResults(resp.results);
          usedProvider = 'tavily_tr';
        }
      } catch (err: any) {
        this.logger.warn(`Tavily Turkish search failed for ${questionId}: ${err.message}`);
      }
    }

    // Step 3: Firecrawl Deep Search (renders JS & extracts markdown from forum threads & review sites)
    if (sources.length === 0 && turkishQuery) {
      try {
        this.logger.log(`Trying Firecrawl Deep Search for ${questionId} with query: "${turkishQuery}"`);
        const resp = await this.firecrawlSearch.search(turkishQuery, { maxResults: 5 });
        if (resp.results && resp.results.length > 0) {
          sources = this.mapSearchResults(resp.results);
          usedProvider = 'firecrawl';
        }
      } catch (err: any) {
        this.logger.warn(`Firecrawl search failed for ${questionId}: ${err.message}`);
      }
    }

    // Step 4: Fallback to Gemini Grounding (Google Search via Gemini API)
    if (sources.length === 0 && turkishQuery) {
      try {
        this.logger.log(`Falling back to Gemini Grounding for ${questionId} with query: "${turkishQuery}"`);
        const resp = await this.geminiGrounding.search(turkishQuery);
        if (resp.results && resp.results.length > 0) {
          sources = this.mapSearchResults(resp.results);
          usedProvider = 'gemini_grounding';
        }
      } catch (err: any) {
        this.logger.warn(`Gemini Grounding failed for ${questionId}: ${err.message}`);
      }
    }

    // Step 4: Fallback to WebSearchProvider (Serper / AI Search Grounding)
    if (sources.length === 0) {
      const fallbackQuery = `${input.year} ${input.brand} ${input.model} ${input.trimName || ''} inceleme sürüş testi`;
      try {
        this.logger.log(`Falling back to WebSearchProvider for ${questionId}...`);
        const results = await this.webSearch.search(fallbackQuery.trim(), 'tr', 'tr');
        if (results && results.length > 0) {
          sources = results.map((r) => ({
            url: r.url,
            domain: this.extractDomain(r.url),
            title: r.title,
            relevantSnippet: r.snippet,
            reliabilityTier: this.getReliabilityTier(r.url),
          }));
          usedProvider = 'web_search_provider';
        }
      } catch (err: any) {
        this.logger.warn(`WebSearchProvider fallback failed for ${questionId}: ${err.message}`);
      }
    }

    if (sources.length === 0) {
      this.logger.warn(`No search results found across all providers for ${questionId}`);
      return null;
    }

    this.logger.log(`[${questionId}] Retrieved ${sources.length} web sources via ${usedProvider}`);

    const evidenceLevel = this.calculateEvidenceLevel(sources, questionId);

    // Build raw evidence text for synthesis
    const evidenceText = sources
      .map((s, i) => `[Kaynak ${i + 1} — ${s.domain} (${s.title})]\n${s.relevantSnippet}`)
      .join('\n\n');

    // Synthesise via LLM (Gemini)
    const synthesisedAnswer = await this.synthesiseWithLLM(
      questionId,
      evidenceText,
      this.buildVariantTitle(input),
    );

    if (!synthesisedAnswer || synthesisedAnswer.includes('INSUFFICIENT_EVIDENCE')) {
      return null;
    }

    const caveats: string[] = [];
    if (sources.length === 1) {
      caveats.push('Bu bulgu tek bir web kaynağına dayanmaktadır; dikkatli değerlendiriniz.');
    }
    if (evidenceLevel === 'WEAK') {
      caveats.push('Bulunan kaynaklar topluluk / genel otomotiv haber sitelerinden gelmektedir.');
    }

    return {
      questionId: questionId as any,
      evidenceLevel,
      sourceCount: sources.length,
      sources,
      synthesisedAnswer,
      caveats,
    };
  }

  private mapSearchResults(results: any[]): Array<{
    url: string;
    domain: string;
    title: string;
    relevantSnippet: string;
    reliabilityTier: 1 | 2 | 3;
  }> {
    return results.map((r) => {
      const url = r.url || '';
      const domain = r.domain || this.extractDomain(url);
      const rawSnippet = r.snippet || r.contentMarkdown || '';
      return {
        url,
        domain,
        title: r.title || 'Automotive Source',
        relevantSnippet: rawSnippet.substring(0, 600),
        reliabilityTier: this.getReliabilityTier(domain || url),
      };
    });
  }

  private extractDomain(urlStr: string): string {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return urlStr;
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
    return 'WEAK';
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
      .filter(([, v]) => v && v.synthesisedAnswer)
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
      if (!synthesisedAnswer || synthesisedAnswer.includes('INSUFFICIENT_EVIDENCE')) {
        return null;
      }

      return {
        questionId: questionId as any,
        evidenceLevel: 'MODERATE',
        sourceCount: 0,
        sources: [],
        synthesisedAnswer,
        caveats: ['Bu değerlendirme Q1–Q5 araştırma bulgularından sentezlenmiştir.'],
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
    variantTitle: string,
  ): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY not set — returning snippet preview.');
      return evidenceText.substring(0, 800);
    }

    const questionDef = CHARACTER_RESEARCH_QUESTIONS.find((q) => q.questionId === questionId);

    const prompt = `${CHARACTER_RESEARCH_MASTER_RULES}

ARAŞTIRMA KURALLARI (KOD SEVİYESİNDE ZORUNLU):
${CHARACTER_EVIDENCE_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ARAŞTIRILAN ARAÇ: ${variantTitle}
ARAŞTIRILAN SORU: ${questionDef?.researchQuestion || questionId}

YASAK PATTERN'LAR:
${questionDef?.forbidden?.map((f) => `- ${f}`).join('\n') || ''}

BULUNAN WEB KANIT METİNLERİ:
${evidenceText}

Yukarıdaki web kanıt metinlerine dayanarak soruyu Türkçe olarak yanıtla.
- Soyut sıfat yasak; somut davranış/karşılaştırma zorunlu.
- Veri yoksa veya yetersizse "INSUFFICIENT_EVIDENCE" yaz.
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
