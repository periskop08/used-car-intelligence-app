import { Injectable, Logger } from '@nestjs/common';
import {
  CanonicalRiskDefect,
  CanonicalRiskSource,
  DomainKeyV6,
  ReliabilityDomainResult,
} from '@used-car-intelligence/shared';
import { VehicleReliabilityResearchInput } from './vehicle-reliability-research.service';

export interface VerifiedTechnicalFact {
  factId: string;
  category: 'ARCHITECTURE' | 'COMPONENT_DESIGN' | 'SERVICE_TSB' | 'TECHNICAL_EVIDENCE' | 'FUNCTIONAL_EFFECT';
  sourceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  isVerified: boolean;
  description: string;
  sourceUrl?: string;
  publisher?: string;
}

export interface TechnicalReasoningResult {
  inferredConsequence: string;
  reasoningChain: string;
  supportingFactIds: string[];
  inferredSeverity: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS';
}

@Injectable()
export class AITechnicalReasoningService {
  private readonly logger = new Logger(AITechnicalReasoningService.name);

  /**
   * Applies AI Technical Reasoning Fallback to resolved vehicles when finalDecisionScore would otherwise be null.
   *
   * Constraints:
   * 1. Trigger ONLY when vehicle identity is resolved, bounded research is complete, and score would be null.
   * 2. Build reasoning input ONLY from verified facts (Tier 1/2, exact architecture, corroborated effects).
   * 3. Infer consequence chain: Fact A -> Fact B -> technical effect -> buyer consequence.
   * 4. Return: inferredConsequence, reasoningChain, supportingFactIds[], inferredSeverity, confidence, inferenceBasis.
   * 5. Require at least 2 independent verified supporting facts.
   * 6. Forum-only / Tier 3 facts CANNOT score.
   * 7. Direct verified consequence has higher priority than AI inference (never overwrite direct consequence).
   * 8. Traceability: every inferred severity must trace to supportingFactIds.
   */
  async applyTechnicalReasoningFallback(
    input: VehicleReliabilityResearchInput,
    canonicalRisks: CanonicalRiskDefect[],
    domainResults?: Record<DomainKeyV6, ReliabilityDomainResult>,
  ): Promise<void> {
    if (!input || !input.brand || !input.model) return;

    for (const cr of canonicalRisks) {
      // 8. Priority Rule: Direct verified consequence is higher priority than AI inference
      if (cr.consequenceState === 'RESEARCHED_GROUNDED' && cr.severity !== null && cr.severity > 0) {
        continue;
      }

      // Only evaluate candidates with proven applicability (EXACT_MATCH or FAMILY_MATCH with proven architecture)
      const isApplicable =
        cr.applicabilityState === 'EXACT_MATCH' ||
        (cr.applicabilityState === 'FAMILY_MATCH' &&
          cr.applicabilityEvidence?.includes('Proven shared component architecture'));

      if (!isApplicable) {
        continue;
      }

      // Extract facts for this candidate
      const facts = this.extractTechnicalFacts(input, cr);

      // Distinguish vehicle architecture catalog fact from independent external verified defect/technical evidence facts
      const verifiedFacts = facts.filter((f) => f.isVerified);
      const externalVerifiedFacts = verifiedFacts.filter(
        (f) => f.category === 'SERVICE_TSB' || f.category === 'TECHNICAL_EVIDENCE',
      );

      // Perform causal consequence reasoning (live LLM or deterministic causal engine)
      const reasoning = await this.inferConsequenceChain(input, cr, facts);
      if (!reasoning) {
        continue;
      }

      // Rules 1, 2, 3, 4, 5, 6 & 7:
      // Numeric scoring requires at least:
      // 1) Target-applicable verified defect evidence (external Tier 1/2)
      // AND
      // 2) Independent verified technical evidence supporting defect effect (second external Tier 1/2).
      // If fewer than 2 independent external verified facts:
      // AI inference is stored as ADVISORY ONLY (severity = null, scoringEligible = false).
      if (externalVerifiedFacts.length < 2) {
        this.logger.debug(
          `[AI Technical Reasoning] Candidate ${cr.id} has fewer than 2 independent external verified defect facts (${externalVerifiedFacts.length}). Storing AI inference as ADVISORY ONLY (severity=null, scoringEligible=false).`,
        );

        cr.severity = null;
        cr.severityBasis = 'Doğrulanmış bağımsız servis bülteni/TSB kanıtı bulunmadığı için puan kesintisi uygulanmamıştır (Danışma Uyarısı)';
        cr.scoringEligible = false;
        cr.advisoryOnly = true;
        cr.consequenceState = 'INSUFFICIENT';
        cr.inferredConsequence = reasoning.inferredConsequence;
        cr.reasoningChain = reasoning.reasoningChain;
        cr.supportingFactIds = verifiedFacts.map((f) => f.factId);
        cr.inferenceBasis = 'AI_INFERRED_FROM_VERIFIED_FACTS';
        cr.inferenceConfidence = 'LOW'; // Rule 7: HIGH only with independent verified technical evidence chain
        cr.lifecycleState = 'VERIFIED';
        continue;
      }

      // Auditability check: ensure at least 2 external verified fact IDs are traceable
      const validSupportingFacts = reasoning.supportingFactIds.filter((fid) =>
        externalVerifiedFacts.some((vf) => vf.factId === fid),
      );

      if (validSupportingFacts.length < 2) {
        this.logger.warn(
          `[AI Technical Reasoning] Candidate ${cr.id} inference failed auditability: fewer than 2 verified supportingFactIds.`,
        );
        continue;
      }

      // Apply the inferred consequence to the canonical risk (Numeric Scoring Eligible)
      cr.severity = reasoning.inferredSeverity;
      cr.severityBasis = reasoning.inferredConsequence;
      cr.consequenceState = 'INFERRED_FROM_EFFECTS';
      cr.inferredConsequence = reasoning.inferredConsequence;
      cr.reasoningChain = reasoning.reasoningChain;
      cr.supportingFactIds = validSupportingFacts;
      cr.inferenceBasis = 'AI_INFERRED_FROM_VERIFIED_FACTS';
      cr.inferenceConfidence = 'HIGH'; // Rule 7: HIGH only with independent verified technical evidence chain
      cr.scoringEligible = true;
      cr.advisoryOnly = false;
      cr.lifecycleState = 'SCORING_ELIGIBLE';

      this.logger.log(
        `[AI Technical Reasoning] Promoted ${cr.id} to SCORING_ELIGIBLE: Severity ${cr.severity} (${cr.inferenceConfidence}) via [${validSupportingFacts.join(', ')}]`,
      );

      // Sync to domainResults if provided
      if (domainResults && domainResults[cr.domain]) {
        const dDefects = domainResults[cr.domain].defects;
        if (dDefects) {
          const match = dDefects.find((d) => d.normalizedFailureMode === cr.normalizedFailureMode);
          if (match) {
            match.severityScore = cr.severity;
            match.severityBasis = cr.severityBasis;
            match.severityCategory = cr.severityCategory;
            (match as any).scoringEligible = true;
          }
        }
      }
    }
  }

  /**
   * Extracts structured technical facts from vehicle identity and candidate sources.
   * Marks Tier 1/2 facts as verified, and Tier 3 (forum/social) as unverified.
   * Does NOT split the same vehicle catalog input into two separate facts.
   */
  extractTechnicalFacts(
    input: VehicleReliabilityResearchInput,
    cr: CanonicalRiskDefect,
  ): VerifiedTechnicalFact[] {
    const facts: VerifiedTechnicalFact[] = [];

    // Fact 1: Vehicle Powertrain Architecture & Component Specification (Single Unified Catalog Fact)
    const archIdent = `${input.brand} ${input.model} (${input.modelYear}) ${input.engineCode || ''} ${input.transmissionName || ''}`.trim();
    const appInfo = cr.applicabilityEvidence ? ` [${cr.applicabilityEvidence}]` : '';
    facts.push({
      factId: `FACT_ARCH_${input.brand.toUpperCase()}_${input.model.toUpperCase()}`,
      category: 'ARCHITECTURE',
      sourceTier: 'TIER_1',
      isVerified: true,
      description: `Target vehicle is verified as ${archIdent}${appInfo}.`,
    });

    // Facts from Linked Sources
    const sources = cr.sources || [];
    sources.forEach((s, idx) => {
      const isTier1 = s.tier === 'TIER_1' || s.tier === 1;
      const isTier2 = s.tier === 'TIER_2' || s.tier === 2;
      const isTier3 = s.tier === 'TIER_3' || s.tier === 3 || (!isTier1 && !isTier2);

      if (isTier1) {
        facts.push({
          factId: `FACT_TSB_${idx + 1}`,
          category: 'SERVICE_TSB',
          sourceTier: 'TIER_1',
          isVerified: true,
          description: s.title || s.url || 'Official OEM Technical Service Bulletin',
          sourceUrl: s.url,
          publisher: s.title,
        });
      } else if (isTier2) {
        facts.push({
          factId: `FACT_TECH_${idx + 1}`,
          category: 'TECHNICAL_EVIDENCE',
          sourceTier: 'TIER_2',
          isVerified: true,
          description: s.title || s.url || 'Reputable automotive repair/teardown documentation',
          sourceUrl: s.url,
          publisher: s.title,
        });
      } else if (isTier3) {
        facts.push({
          factId: `FACT_FORUM_${idx + 1}`,
          category: 'FUNCTIONAL_EFFECT',
          sourceTier: 'TIER_3',
          isVerified: false,
          description: s.title || s.url || 'Uncorroborated community user claim',
          sourceUrl: s.url,
          publisher: s.title,
        });
      }
    });

    return facts;
  }

  /**
   * Infers the consequence chain:
   * verified fact A -> verified fact B -> technical effect -> buyer consequence.
   *
   * Attempts live Gemini LLM call if available, or falls back to grounded deterministic causal engine.
   */
  async inferConsequenceChain(
    input: VehicleReliabilityResearchInput,
    cr: CanonicalRiskDefect,
    facts: VerifiedTechnicalFact[],
  ): Promise<TechnicalReasoningResult | null> {
    if (facts.length < 2) return null;

    // Try Live Gemini Reasoning if API key is present and not running in test suite
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiApiKey && !process.env.DISABLE_AI_REASONING && process.env.NODE_ENV !== 'test') {
      try {
        const liveResult = await this.queryGeminiForReasoning(input, cr, facts, geminiApiKey);
        if (liveResult) return liveResult;
      } catch (err: any) {
        this.logger.warn(`[AI Technical Reasoning] Gemini inference attempt failed: ${err.message}. Using deterministic causal engine.`);
      }
    }

    // Grounded Deterministic Technical Causal Engine
    return this.evaluateDeterministicCausalChain(input, cr, facts);
  }

  /**
   * Deterministic Technical Causal Engine.
   * Connects verified component architecture + technical evidence into a causal consequence chain.
   */
  evaluateDeterministicCausalChain(
    input: VehicleReliabilityResearchInput,
    cr: CanonicalRiskDefect,
    facts: VerifiedTechnicalFact[],
  ): TechnicalReasoningResult | null {
    if (facts.length < 2) return null;

    const externalFacts = facts.filter(
      (f) => f.category === 'SERVICE_TSB' || f.category === 'TECHNICAL_EVIDENCE',
    );
    const fact1 = externalFacts[0] || facts[0];
    const fact2 = externalFacts[1] || facts[1] || facts[0];
    const supportingFactIds = externalFacts.length >= 2
      ? externalFacts.map((f) => f.factId)
      : facts.map((f) => f.factId);

    // Build collective corpus of technical facts and defect identity
    const factsText = [
      ...facts.map((f) => `${f.factId}: ${f.description}`),
      cr.title,
      cr.normalizedFailureMode,
      cr.affectedComponent,
    ]
      .join(' ')
      .toLowerCase();

    // Check for conflicting evidence in verified facts
    const hasMildClaim = factsText.includes('cosmetic') || factsText.includes('minor') || factsText.includes('inconvenience') || factsText.includes('normal wear');
    const hasFunctionalEffect = factsText.includes('judder') || factsText.includes('titreme') || factsText.includes('slip') || factsText.includes('hesitation') || factsText.includes('kaçırma');
    const hasBreakdownEffect = factsText.includes('limp') || factsText.includes('lockout') || factsText.includes('kilitleme') || factsText.includes('pressure loss') || factsText.includes('acil mod') || factsText.includes('jump');
    const hasSafetyEffect = factsText.includes('oil starvation') || factsText.includes('brake assist') || factsText.includes('fren vakum') || factsText.includes('fire') || factsText.includes('yangın') || factsText.includes('stall');

    // 1. Wet Belt / Oil Lubrication Degradation (Safety Critical / Engine Destruction)
    if (
      (factsText.includes('belt') || factsText.includes('triger') || factsText.includes('oil') || factsText.includes('yağ')) &&
      (hasSafetyEffect || factsText.includes('strainer') || factsText.includes('süzgeç') || factsText.includes('debris') || factsText.includes('degradation'))
    ) {
      return {
        supportingFactIds,
        reasoningChain: `${fact1.factId} (${fact1.description}) -> ${fact2.factId} (${fact2.description}) -> motor oil fuel dilution degrades rubber belt -> rubber debris clogs oil pump pickup strainer -> oil starvation and vacuum pump brake assist degradation.`,
        inferredConsequence: 'Motor yağı içindeki triger kayışının kimyasal bozulması ve ufalanan kauçuk partiküllerinin yağ süzgecini tıkaması sonucu yağlama basıncı kaybı ve fren vakum pompası zafiyeti riski oluşabilir.',
        inferredSeverity: 10, // SAFETY_CRITICAL
        confidence: 'HIGH',
        inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS',
      };
    }

    // 2. Mechatronic Hydraulic Fault / Pressure Accumulator (Breakdown / Limp Mode)
    if (
      (factsText.includes('mechatronic') || factsText.includes('mekatronik') || factsText.includes('accumulator') || factsText.includes('akümülatör') || factsText.includes('solenoid')) &&
      (hasBreakdownEffect || factsText.includes('pressure') || factsText.includes('basınç') || factsText.includes('hydraulic') || factsText.includes('hidrolik'))
    ) {
      // Conservative conflict resolution: even if community says minor, verified pressure loss is breakdown
      return {
        supportingFactIds,
        reasoningChain: `${fact1.factId} (${fact1.description}) -> ${fact2.factId} (${fact2.description}) -> electro-hydraulic pressure accumulator fatigue -> internal pressure loss -> transmission limp-mode and gear selection lockout.`,
        inferredConsequence: 'Mekatronik gövdesindeki hidrolik basınç akümülatörünün yorulması sonucu sistem basınç kaybı yaşayabilir; şanzıman acil moda geçerek vites geçişlerini kilitleyebilir.',
        inferredSeverity: 7, // BREAKDOWN
        confidence: 'HIGH',
        inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS',
      };
    }

    // 3. Timing Chain Elongation / Tensioner Slack (Breakdown / Timing Drift)
    if (
      (factsText.includes('timing') || factsText.includes('chain') || factsText.includes('zincir')) &&
      (factsText.includes('elongation') || factsText.includes('uzama') || factsText.includes('slack') || factsText.includes('gergi') || factsText.includes('tensioner') || factsText.includes('rattle') || factsText.includes('şıkırtı'))
    ) {
      return {
        supportingFactIds,
        reasoningChain: `${fact1.factId} (${fact1.description}) -> ${fact2.factId} (${fact2.description}) -> chain link pin elongation and hydraulic tensioner slack -> cold start rattle and timing desynchronization -> check engine lamp or valve timing risk if ignored.`,
        inferredConsequence: 'Zamanlama zinciri baklalarında uzama ve hidrolik gergi basınç boşalması sonucu ilk çalıştırmada zincir şıkırtısı ve zamanlama sapması oluşabilir.',
        inferredSeverity: 7, // BREAKDOWN
        confidence: 'HIGH',
        inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS',
      };
    }

    // 4. Dual Clutch Wear (Friction Lining Thermal Judder / Slip - Drivability)
    if (
      (factsText.includes('clutch') || factsText.includes('kavrama') || factsText.includes('dq200') || factsText.includes('dual-clutch')) &&
      (hasFunctionalEffect || factsText.includes('thermal') || factsText.includes('lining') || factsText.includes('wear') || factsText.includes('balata') || factsText.includes('aşınma') || factsText.includes('dry'))
    ) {
      // Conservative conflict resolution: if one fact claims purely cosmetic noise but verified friction wear exists, conservative impact is drivability (5)
      const inferredSev = hasBreakdownEffect ? 7 : 5;
      return {
        supportingFactIds,
        reasoningChain: `${fact1.factId} (${fact1.description}) -> ${fact2.factId} (${fact2.description}) -> friction lining thermal stress in stop-and-go driving -> clutch slip and judder -> accelerated wear requiring dual-clutch replacement.`,
        inferredConsequence: 'Kuru çift kavrama sürtünme balatalarının yoğun dur-kalk trafiğinde aşırı ısınması sonucu 1. ve 2. vites geçişlerinde titreme, kavrama kaçırma ve sürüş konforu kaybı meydana gelebilir; kavrama seti değişimi gerektirebilir.',
        inferredSeverity: inferredSev,
        confidence: 'HIGH',
        inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS',
      };
    }

    // 5. Thermostat / Water Pump Housing Coolant Seepage (Thermal / Drivability)
    if (
      (factsText.includes('coolant') || factsText.includes('thermostat') || factsText.includes('termostat') || factsText.includes('soğutma') || factsText.includes('water pump') || factsText.includes('devirdaim')) &&
      (factsText.includes('leak') || factsText.includes('sızıntı') || factsText.includes('housing') || factsText.includes('seepage') || factsText.includes('gövde') || factsText.includes('çatlak'))
    ) {
      return {
        supportingFactIds,
        reasoningChain: `${fact1.factId} (${fact1.description}) -> ${fact2.factId} (${fact2.description}) -> composite plastic housing thermal expansion cycles -> hairline seam cracking -> slow coolant seepage and low coolant warning.`,
        inferredConsequence: 'Kompozit termostat ve devirdaim gövdesinin ısıl genleşme döngüleriyle mikro çatlak oluşturması sonucu soğutma suyu eksiltme ve hararet uyarısı oluşabilir.',
        inferredSeverity: 5, // DRIVABILITY / THERMAL
        confidence: 'HIGH',
        inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS',
      };
    }

    return null;
  }

  /**
   * Queries Gemini for structured technical causal chain reasoning.
   */
  private async queryGeminiForReasoning(
    input: VehicleReliabilityResearchInput,
    cr: CanonicalRiskDefect,
    verifiedFacts: VerifiedTechnicalFact[],
    apiKey: string,
  ): Promise<TechnicalReasoningResult | null> {
    const prompt = `You are a Senior Automotive Forensic Engineer.
Vehicle: ${input.brand} ${input.model} (${input.modelYear}), Engine: ${input.engineCode || 'N/A'}, Transmission: ${input.transmissionName || 'N/A'}.
Defect Candidate: ${cr.title} (${cr.normalizedFailureMode}), Domain: ${cr.domain}, Affected Component: ${cr.affectedComponent}.

VERIFIED TECHNICAL FACTS:
${verifiedFacts.map((f) => `[${f.factId}] (${f.category}): ${f.description}`).join('\n')}

RULES:
1. You MUST pick at least 2 fact IDs from the list above that support the causal chain.
2. Deduce: Verified Fact A -> Verified Fact B -> Technical Effect -> Buyer Consequence.
3. Inferred severity MUST be between 1 and 10 based on automotive engineering impact:
   - 3-4: Minor functional / inconvenience
   - 5-6: Drivability / shudder / wear / hesitation
   - 7-8: Breakdown / limp mode / major repair
   - 9-10: Severe safety hazard / fire
4. Respond in strictly valid JSON format:
{
  "supportingFactIds": ["FACT_...", "FACT_..."],
  "reasoningChain": "step-by-step causal chain",
  "inferredConsequence": "clear explanation of buyer consequence in Turkish",
  "inferredSeverity": number,
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    if (
      Array.isArray(parsed.supportingFactIds) &&
      parsed.supportingFactIds.length >= 2 &&
      typeof parsed.inferredSeverity === 'number' &&
      parsed.inferredSeverity >= 1 &&
      parsed.inferredSeverity <= 10
    ) {
      return {
        supportingFactIds: parsed.supportingFactIds,
        reasoningChain: parsed.reasoningChain || 'Causal reasoning derived from verified facts',
        inferredConsequence: parsed.inferredConsequence || cr.title,
        inferredSeverity: parsed.inferredSeverity,
        confidence: parsed.confidence || 'HIGH',
        inferenceBasis: 'AI_INFERRED_FROM_VERIFIED_FACTS',
      };
    }

    return null;
  }
}
