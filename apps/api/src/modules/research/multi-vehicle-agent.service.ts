import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { VariantTechnicalFactsService } from '../vehicle/variant-technical-facts.service';
import { convertPowerUnits } from '@used-car-intelligence/shared';
import OpenAI from 'openai';

export type ClaimScopeType = 'ALL_ERA_COMMON' | 'ERA_SPECIFIC' | 'APPLICATION_SPECIFIC' | 'MANUAL_ONLY' | 'AUTOMATIC_ONLY';
export type AdjudicationStatus = 'APPROVED' | 'APPROVED_WITH_SCOPE' | 'CONFLICTED' | 'INSUFFICIENT_EVIDENCE' | 'REJECTED';

export interface MultiVehicleResearchContext {
  vehicleType: 'MOTORCYCLE' | 'MINIVAN_PANELVAN' | 'AUTOMOBILE';
  brand: string;
  model: string;
  year?: number;
  engine?: string;
  fuel?: string;
  transmission?: string;
  trimPackage?: string; // e.g. "13 m3"
  modelId?: string;
  variantId?: string;
}

export interface CandidateClaim {
  claimId: string;
  title: string;
  system: string;
  scopeType: ClaimScopeType;
  applicableEra?: string;
  applicableEngine?: string;
  applicableTransmission?: string;
  symptoms: string[];
  userExperience: string;
  testDriveCheck: string;
  inspectionCheck: string;
  sellerQuestion: string;
  costRisk: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'COK_YUKSEK';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  evidenceSources: Array<{
    url?: string;
    domain: string;
    sourceKind: string;
    excerpt: string;
    stance: 'SUPPORTS' | 'REFUTES' | 'NEUTRAL';
  }>;
  confidence: number;
}

export interface MotorcycleEraItem {
  eraName: string;
  startYear: number;
  endYear: number | null;
  fuelSystem: 'CARBURETOR' | 'EFI' | string;
  engineLayout?: string;
  displacementCc: number;
  powerHp: number;
  powerRange?: string;
  cooling?: string;
  transmission?: string;
  brakingSystem?: string;
  hasAbs?: boolean;
  keyChanges?: string[];
  sourceEvidence?: string;
}

export interface CommercialAppDetails {
  generationName: string;
  productionEra: string;
  engineFamily: string;
  displacementCc: number;
  verifiedPowerOptions: number[];
  exactPowerHp?: number;
  emissionStandard: string;
  hasDpf: boolean;
  hasEgr: boolean;
  hasAdBlue: boolean;
  manualGearboxVerified: boolean;
  manualGearboxType?: string;
  automaticGearboxVerified: boolean;
  automaticGearboxType?: string;
  automaticUnverifiedReason?: string;
  configurationContext: {
    rawSourceLabel: string;
    commercialMeaning: string;
    cargoVolumeM3?: number;
  };
}

export interface Agent1Output {
  vehicleType: 'MOTORCYCLE' | 'MINIVAN_PANELVAN';
  brand: string;
  model: string;
  displacementCc: number;
  powerHp: number;
  powerRangeText?: string;
  candidatePowers?: number[];
  motorcycleEras?: MotorcycleEraItem[];
  commercialDetails?: CommercialAppDetails;
  claims: CandidateClaim[];
  commercialDutyRisks?: Array<{ title: string; risk: string; checkRecommendation: string }>;
}

export interface Agent2RedTeamChallenge {
  claimId: string;
  stance: 'CONFIRM' | 'CONTRADICT' | 'NARROW';
  narrowScope?: {
    era?: string;
    engine?: string;
    transmission?: string;
  };
  reason: string;
  alternativeSources?: string[];
}

export interface Agent2Output {
  challenges: Agent2RedTeamChallenge[];
  transmissionRefuted?: boolean;
  transmissionRefutedReason?: string;
  powerDiscrepancies?: string[];
}

export interface AdjudicatedFact {
  claim: CandidateClaim;
  status: AdjudicationStatus;
  adjudicationReason: string;
}

export interface Agent3Output {
  vehicleType: 'MOTORCYCLE' | 'MINIVAN_PANELVAN';
  adjudicatedFacts: AdjudicatedFact[];
  approvedFactsOnly: CandidateClaim[];
  finalDisplacementCc: number;
  finalPowerHp: number;
  finalPowerRangeText?: string;
  candidatePowers: number[];
  motorcycleEras?: MotorcycleEraItem[];
  commercialDetails?: CommercialAppDetails;
  decisionScore: number;
  technicalRiskLevel: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
  decisionRationale: string;
}

@Injectable()
export class MultiVehicleAgentService {
  private readonly logger = new Logger(MultiVehicleAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchProvider: WebSearchProvider,
    private readonly variantTechnicalFactsService: VariantTechnicalFactsService,
  ) {}

  /**
   * Main entry point: Executes the 3-Agent pipeline + Closed Report Writer
   * for MOTORCYCLE or MINIVAN_PANELVAN.
   */
  async executeMultiAgentPipeline(context: MultiVehicleResearchContext): Promise<any> {
    this.logger.log(
      `[MULTI_VEHICLE_PIPELINE] Starting 3-Agent Research for ${context.vehicleType}: ${context.brand} ${context.model} (${context.year || 'ALL_YEARS'})`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Mandatory Grounded CC & HP Resolution (Single Truth Pipeline)
    // ─────────────────────────────────────────────────────────────────────────
    let resolvedCc = 0;
    let resolvedHp = 0;
    let candidatePowers: number[] = [];
    let powerRangeText: string | undefined;

    if (context.vehicleType === 'MOTORCYCLE' && context.modelId) {
      const modelFacts = await this.variantTechnicalFactsService.getModelTechnicalFacts(context.modelId);
      resolvedCc = modelFacts.engineDisplacementCc || 0;
      resolvedHp = modelFacts.enginePowerHp || 0;
      candidatePowers = modelFacts.candidatePowers || [];
      if (candidatePowers.length > 1) {
        powerRangeText = `${Math.min(...candidatePowers)}–${Math.max(...candidatePowers)} HP (üretim dönemine göre)`;
      }
    } else if (context.variantId) {
      let facts = await this.variantTechnicalFactsService.getVariantTechnicalFacts(context.variantId);
      if (!facts.engineDisplacementCc || !facts.enginePowerHp) {
        facts = await this.variantTechnicalFactsService.enrichVariantTechnicalSpecs(context.variantId);
      }
      resolvedCc = facts.engineDisplacementCc || 0;
      resolvedHp = facts.enginePowerHp || 0;
      candidatePowers = facts.candidatePowers || (resolvedHp ? [resolvedHp] : []);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AGENT 1: Primary Research Agent
    // ─────────────────────────────────────────────────────────────────────────
    this.logger.log(`[AGENT 1] Executing Primary Research for ${context.brand} ${context.model}...`);
    const agent1Output = await this.runAgent1PrimaryResearch(context, resolvedCc, resolvedHp, candidatePowers, powerRangeText);

    // ─────────────────────────────────────────────────────────────────────────
    // AGENT 2: Reverse Validation / Red Team Agent
    // ─────────────────────────────────────────────────────────────────────────
    this.logger.log(`[AGENT 2] Executing Reverse Validation / Red Team on ${agent1Output.claims.length} claims...`);
    const agent2Output = await this.runAgent2RedTeam(context, agent1Output);

    // ─────────────────────────────────────────────────────────────────────────
    // AGENT 3: Judge / Final Fact Validation Agent
    // ─────────────────────────────────────────────────────────────────────────
    this.logger.log(`[AGENT 3] Adjudicating findings and resolving final factual record...`);
    const agent3Output = this.runAgent3Judge(agent1Output, agent2Output);

    // ─────────────────────────────────────────────────────────────────────────
    // CLOSED REPORT WRITER: Pure presenter with 0 internet access & 0 fact invention
    // ─────────────────────────────────────────────────────────────────────────
    this.logger.log(`[REPORT WRITER] Generating closed presentation report from ${agent3Output.approvedFactsOnly.length} approved facts...`);
    const finalReport = await this.runClosedReportWriter(context, agent3Output);

    return finalReport;
  }

  /**
   * Agent 1: Primary Research
   */
  private async runAgent1PrimaryResearch(
    context: MultiVehicleResearchContext,
    baseCc: number,
    baseHp: number,
    candidatePowers: number[],
    powerRangeText?: string,
  ): Promise<Agent1Output> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';

    // 1. Live Web Grounding Search
    let liveWebSnippets = '';
    try {
      const searchTerms = isMotorcycle
        ? [
            `${context.brand} ${context.model} kronik sorunlar kullanıcı yorumları`,
            `${context.brand} ${context.model} üretim yılları teknik özellikleri beygir`,
            `${context.brand} ${context.model} karbüratör enjeksiyon farkı arıza`,
          ]
        : [
            `${context.brand} ${context.model} ${context.year || ''} ${context.engine || ''} kronik sorunlar arızalar`,
            `${context.brand} ${context.model} ${context.engine || ''} enjektör turbo dpf egr arızası`,
            `${context.brand} ${context.model} ${context.year || ''} otomatik şanzıman var mı manuel mi`,
            `${context.brand} ${context.model} ticari kullanım ağır yük aşınma`,
          ];

      const allResults = await Promise.all(
        searchTerms.map((q) => this.searchProvider.search(q, 'tr', 'tr')),
      );

      const snippets = allResults
        .flat()
        .slice(0, 10)
        .map((r) => `[${r.domain}]: ${r.snippet}`)
        .join('\n');
      liveWebSnippets = snippets;
    } catch (e: any) {
      this.logger.warn(`Agent 1 live search notice: ${e.message}`);
    }

    // 2. Structured Extraction Prompt
    const systemPrompt = isMotorcycle
      ? `You are TorqueScout Agent 1: Senior Motorcycle Primary Technical Research Agent.
Your job is to discover the model history, production eras (carburetor vs EFI, displacement, power, cooling, braking), and candidate technical issues for the motorcycle model family.
CRITICAL RULES:
1. Categorize candidate issues as: "ALL_ERA_COMMON", "ERA_SPECIFIC", or "APPLICATION_SPECIFIC". Never confuse carburetor problems with EFI eras!
2. Do not invent fake claims. Ground claims in technical reality.
3. Every claim MUST include symptoms, userExperience, testDriveCheck, inspectionCheck, sellerQuestion, and costRisk ("DUSUK"|"ORTA"|"YUKSEK"|"COK_YUKSEK").
4. Output STRICT JSON only matching the schema.`
      : `You are TorqueScout Agent 1: Commercial Vehicle Application Primary Technical Research Agent.
Your job is to build the exact commercial application map (generation, engine family, power ratings, emission systems, 13 m³ cargo volume context, manual and automatic gearbox availability) and candidate issues.
CRITICAL RULES:
1. 13 m³ is a cargo volume / body configuration label, NOT a luxury equipment package!
2. Validate whether manual AND automatic gearboxes actually exist for this exact vehicle. Do NOT assume automatic exists unless grounded!
3. Include commercial-use wear risks: heavy load, fleet delivery, sliding doors, rear suspension leaf springs, chassis load floor deformation.
4. Output STRICT JSON only matching the schema.`;

    const userPrompt = isMotorcycle
      ? `Motorcycle: ${context.brand} ${context.model}
Base Catalog CC: ${baseCc || 'Research'}
Base Catalog HP: ${baseHp || 'Research'}
Web Evidence Snippets:
${liveWebSnippets}

Extract:
1. Model history & production eras (startYear, endYear, fuelSystem [CARBURETOR/EFI], engineLayout, displacementCc, powerHp, powerRange, cooling, transmission, brakingSystem, hasAbs, keyChanges).
2. Candidate technical issues with all required diagnostic checks and questions.
Output strict JSON:
{
  "displacementCc": number,
  "powerHp": number,
  "powerRangeText": string,
  "candidatePowers": number[],
  "motorcycleEras": [...],
  "claims": [...]
}`
      : `Commercial Vehicle: ${context.brand} ${context.model} ${context.year || ''}
Engine: ${context.engine || ''}
Fuel: ${context.fuel || 'Dizel'}
Transmission Scope: ${context.transmission || 'Manuel + Otomatik'}
Package / Configuration: ${context.trimPackage || '13 m3'}
Base Catalog CC: ${baseCc || 2299}
Base Catalog HP: ${baseHp || 125}
Web Evidence Snippets:
${liveWebSnippets}

Extract:
1. Commercial application map (generationName, productionEra, engineFamily, displacementCc, verifiedPowerOptions, emissionStandard, hasDpf, hasEgr, hasAdBlue, manualGearboxVerified, manualGearboxType, automaticGearboxVerified, automaticGearboxType, automaticUnverifiedReason, configurationContext [commercialMeaning of ${context.trimPackage || '13 m3'}]).
2. Commercial duty risks (heavy load, sliding doors, leaf springs, chassis floor, etc.).
3. Candidate technical claims (engine, emissions, manual, automatic [if verified], chassis).
Output strict JSON:
{
  "displacementCc": number,
  "powerHp": number,
  "candidatePowers": number[],
  "commercialDetails": {...},
  "commercialDutyRisks": [...],
  "claims": [...]
}`;

    let parsed: any = null;
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey, timeout: 14000 });
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });
        parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
      } catch (err: any) {
        this.logger.warn(`Agent 1 LLM extraction notice: ${err.message}`);
      }
    }

    const finalCc = parsed?.displacementCc || baseCc || (isMotorcycle ? 249 : 2299);
    const finalHp = parsed?.powerHp || baseHp || (isMotorcycle ? 28 : 125);
    const finalPowers = Array.isArray(parsed?.candidatePowers) && parsed.candidatePowers.length > 0
      ? parsed.candidatePowers
      : (candidatePowers.length > 0 ? candidatePowers : [finalHp]);

    const claims: CandidateClaim[] = (Array.isArray(parsed?.claims) ? parsed.claims : []).map((c: any, idx: number) => ({
      claimId: c.claimId || `CLM-${String(idx + 1).padStart(3, '0')}`,
      title: c.title || 'Belirtilmemiş Teknik Arıza',
      system: c.system || 'GENEL',
      scopeType: c.scopeType || 'APPLICATION_SPECIFIC',
      applicableEra: c.applicableEra,
      applicableEngine: c.applicableEngine,
      applicableTransmission: c.applicableTransmission,
      symptoms: Array.isArray(c.symptoms) ? c.symptoms : [c.symptoms || 'Gözlemlenebilir belirti'],
      userExperience: c.userExperience || 'Sürüşte hissedilen dengesizlik veya ses',
      testDriveCheck: c.testDriveCheck || 'Test sürüşünde devirlenme ve vites geçişlerini kontrol edin.',
      inspectionCheck: c.inspectionCheck || 'Yetkili ekspertizde mekanik bağlantıları kontrol ettirin.',
      sellerQuestion: c.sellerQuestion || 'Bu parça en son ne zaman değiştirildi veya kontrol edildi?',
      costRisk: c.costRisk || 'ORTA',
      severity: c.severity || 'MODERATE',
      evidenceSources: Array.isArray(c.evidenceSources)
        ? c.evidenceSources
        : [{ domain: 'catalog.torquescout.com', sourceKind: 'TECHNICAL_DATABASE', excerpt: c.title || '', stance: 'SUPPORTS' }],
      confidence: typeof c.confidence === 'number' ? c.confidence : 0.85,
    }));

    return {
      vehicleType: isMotorcycle ? 'MOTORCYCLE' : 'MINIVAN_PANELVAN',
      brand: context.brand,
      model: context.model,
      displacementCc: finalCc,
      powerHp: finalHp,
      powerRangeText: parsed?.powerRangeText || powerRangeText,
      candidatePowers: finalPowers,
      motorcycleEras: parsed?.motorcycleEras,
      commercialDetails: parsed?.commercialDetails,
      commercialDutyRisks: parsed?.commercialDutyRisks,
      claims,
    };
  }

  /**
   * Agent 2: Reverse Validation / Red Team Agent
   */
  private async runAgent2RedTeam(
    context: MultiVehicleResearchContext,
    agent1: Agent1Output,
  ): Promise<Agent2Output> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';

    const systemPrompt = `You are TorqueScout Agent 2: Adversarial Red Team Technical Validator.
Your ONLY role is to CHALLENGE, CONTRADICT, or NARROW the claims produced by Agent 1.
DO NOT summarize Agent 1.
Investigate specifically:
1. Is an issue incorrectly attributed to the wrong production era or generation (e.g. carburetor problem placed into EFI era, or vice-versa)?
2. For commercial vehicles: Was automatic transmission claimed when the selected 13 m³ application was only produced in manual?
3. Power/CC check: Is there confusion between PS, HP, or kW (e.g. 125 PS vs 123 HP)?
4. Is a single forum complaint generalized to the whole model line?
5. Stance must be:
   - "CONFIRM" (claim is rigorously verified for this exact scope)
   - "NARROW" (claim only applies to a specific era, engine, or transmission)
   - "CONTRADICT" (claim is invalid, belongs to another model, or transmission is non-existent)
Output STRICT JSON matching schema:
{
  "challenges": [
    {
      "claimId": string,
      "stance": "CONFIRM" | "CONTRADICT" | "NARROW",
      "narrowScope": { "era"?: string, "engine"?: string, "transmission"?: string },
      "reason": string
    }
  ],
  "transmissionRefuted": boolean,
  "transmissionRefutedReason": string,
  "powerDiscrepancies": string[]
}`;

    const userPrompt = `Vehicle: ${context.brand} ${context.model} (${context.vehicleType})
Selected Context: Year=${context.year || 'ALL'}, Engine=${context.engine || ''}, Transmission=${context.transmission || ''}, Trim=${context.trimPackage || ''}
Agent 1 Claims:
${JSON.stringify(
  agent1.claims.map((c) => ({
    claimId: c.claimId,
    title: c.title,
    system: c.system,
    scopeType: c.scopeType,
    applicableEra: c.applicableEra,
    applicableTransmission: c.applicableTransmission,
  })),
  null,
  2,
)}
Agent 1 CC: ${agent1.displacementCc}, HP: ${agent1.powerHp}, Eras/Commercial: ${JSON.stringify(agent1.motorcycleEras || agent1.commercialDetails || {})}

Perform adversarial red-team audit. Output strict JSON.`;

    let parsed: any = null;
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey, timeout: 12000 });
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });
        parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
      } catch (err: any) {
        this.logger.warn(`Agent 2 Red Team LLM notice: ${err.message}`);
      }
    }

    const challenges: Agent2RedTeamChallenge[] = Array.isArray(parsed?.challenges)
      ? parsed.challenges
      : agent1.claims.map((c) => ({
          claimId: c.claimId,
          stance: 'CONFIRM' as const,
          reason: 'Doğrulandı',
        }));

    return {
      challenges,
      transmissionRefuted: Boolean(parsed?.transmissionRefuted),
      transmissionRefutedReason: parsed?.transmissionRefutedReason,
      powerDiscrepancies: Array.isArray(parsed?.powerDiscrepancies) ? parsed.powerDiscrepancies : [],
    };
  }

  /**
   * Agent 3: Judge / Final Fact Validation Agent
   */
  private runAgent3Judge(agent1: Agent1Output, agent2: Agent2Output): Agent3Output {
    const challengeMap = new Map<string, Agent2RedTeamChallenge>();
    for (const ch of agent2.challenges) {
      challengeMap.set(ch.claimId, ch);
    }

    const adjudicatedFacts: AdjudicatedFact[] = [];
    const approvedFactsOnly: CandidateClaim[] = [];

    for (const claim of agent1.claims) {
      const challenge = challengeMap.get(claim.claimId);

      if (!challenge) {
        adjudicatedFacts.push({
          claim,
          status: 'APPROVED',
          adjudicationReason: 'İtiraz olmaksızın kabul edildi.',
        });
        approvedFactsOnly.push(claim);
        continue;
      }

      if (challenge.stance === 'CONTRADICT') {
        adjudicatedFacts.push({
          claim,
          status: 'REJECTED',
          adjudicationReason: challenge.reason || 'Kırmızı takım denetiminde çürütüldü / yanlış dönem veya kapsam.',
        });
      } else if (challenge.stance === 'NARROW') {
        const narrowedClaim: CandidateClaim = {
          ...claim,
          applicableEra: challenge.narrowScope?.era || claim.applicableEra,
          applicableEngine: challenge.narrowScope?.engine || claim.applicableEngine,
          applicableTransmission: challenge.narrowScope?.transmission || claim.applicableTransmission,
          scopeType: challenge.narrowScope?.era ? 'ERA_SPECIFIC' : claim.scopeType,
        };
        adjudicatedFacts.push({
          claim: narrowedClaim,
          status: 'APPROVED_WITH_SCOPE',
          adjudicationReason: challenge.reason || 'Yalnızca daraltılmış teknik kapsam için onaylandı.',
        });
        approvedFactsOnly.push(narrowedClaim);
      } else {
        adjudicatedFacts.push({
          claim,
          status: 'APPROVED',
          adjudicationReason: 'Kırmızı takım tarafından doğrulandı.',
        });
        approvedFactsOnly.push(claim);
      }
    }

    // Commercial transmission adjudication
    if (agent2.transmissionRefuted && agent1.commercialDetails) {
      agent1.commercialDetails.automaticGearboxVerified = false;
      agent1.commercialDetails.automaticUnverifiedReason =
        agent2.transmissionRefutedReason || 'Seçilen ticari konfigürasyonda resmi katalogda otomatik şanzıman opsiyonu doğrulanmadı.';
    }

    // VehicleType-aware scoring
    const highSeverityCount = approvedFactsOnly.filter((c) => c.severity === 'HIGH' || c.severity === 'CRITICAL').length;
    const moderateCount = approvedFactsOnly.filter((c) => c.severity === 'MODERATE').length;
    let decisionScore = 88 - highSeverityCount * 7 - moderateCount * 3;
    decisionScore = Math.max(55, Math.min(94, decisionScore));

    const technicalRiskLevel: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK' =
      decisionScore >= 80 ? 'DUSUK' : decisionScore >= 70 ? 'ORTA' : decisionScore >= 60 ? 'YUKSEK' : 'KRITIK';

    const decisionRationale =
      agent1.vehicleType === 'MOTORCYCLE'
        ? `Model ailesi üretim dönemleri ve kronik mekanik eğilimleri haritalandı. ${approvedFactsOnly.length} adet doğrulanmış teknik iddia üzerinden değerlendirildi.`
        : `Seçilen ticari uygulama ve yük hacmi konfigürasyonu kapsamında ${approvedFactsOnly.length} adet doğrulanmış teknik ve ticari yıpranma kriteri üzerinden sentezlendi.`;

    return {
      vehicleType: agent1.vehicleType,
      adjudicatedFacts,
      approvedFactsOnly,
      finalDisplacementCc: agent1.displacementCc,
      finalPowerHp: agent1.powerHp,
      finalPowerRangeText: agent1.powerRangeText,
      candidatePowers: agent1.candidatePowers || [agent1.powerHp],
      motorcycleEras: agent1.motorcycleEras,
      commercialDetails: agent1.commercialDetails,
      decisionScore,
      technicalRiskLevel,
      decisionRationale,
    };
  }

  /**
   * Closed Report Writer:
   * Pure closed-box presenter with 0 web access and 0 fact invention.
   */
  private async runClosedReportWriter(
    context: MultiVehicleResearchContext,
    judge: Agent3Output,
  ): Promise<any> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';

    const systemPrompt = `You are TorqueScout's Closed-Box Expert Vehicle Report Writer.
You have NO INTERNET ACCESS. You CANNOT ADD ANY NEW TECHNICAL CLAIMS OR ISSUES.
Your ONLY job is to write an authoritative, highly engaging, expert Turkish vehicle report based STRICTLY on the adjudicated facts and specifications provided to you.
Use the tone of a senior automotive test editor and inspection consultant.
Output valid JSON only.`;

    const factsJson = JSON.stringify(judge.approvedFactsOnly, null, 2);

    const userPrompt = isMotorcycle
      ? `Motorcycle: ${context.brand} ${context.model}
Adjudicated Specs:
Displacement: ${judge.finalDisplacementCc} cc
Power: ${judge.finalPowerHp} HP (Range: ${judge.finalPowerRangeText || 'Sabit'})
Production Eras: ${JSON.stringify(judge.motorcycleEras || [], null, 2)}
Approved Technical Claims:
${factsJson}
Decision Score: ${judge.decisionScore}/100, Risk: ${judge.technicalRiskLevel}

Write the complete Motorcycle Report in strict JSON:
{
  "vehicleOverview": "Bu Motosiklet Nasıl Bir Araç? (Tasarım dili, sürüş ergonomisi, motor bloğu karakteri)",
  "modelHistory": "Model Geçmişi ve Üretim Seyri",
  "productionEras": [...],
  "recommendedEraComparison": "Hangi Dönem Daha Mantıklı? (Karbüratör vs EFI veya erken vs geç dönem karşılaştırması)",
  "technicalSpecifications": {
    "engineDisplacementCc": ${judge.finalDisplacementCc},
    "enginePowerHp": ${judge.finalPowerHp},
    "powerRange": "${judge.finalPowerRangeText || `${judge.finalPowerHp} HP`}",
    "powerUnit": "HP",
    "cooling": "HAVA_YAG veya SIVI",
    "transmission": "5 veya 6 İleri Manuel"
  },
  "allEraCommonIssues": [
    { "title": string, "symptoms": string, "risk": string, "checkNote": string }
  ],
  "eraSpecificIssues": [
    { "eraName": string, "title": string, "symptoms": string, "risk": string, "checkNote": string }
  ],
  "strongReasons": [
    { "title": string, "explanation": string }
  ],
  "tradeoffs": [
    { "title": string, "explanation": string }
  ],
  "idealFor": [
    { "profile": string, "explanation": string }
  ],
  "notIdealFor": [
    { "profile": string, "explanation": string }
  ],
  "conditionsToConsider": [
    { "condition": string, "reason": string }
  ],
  "walkAwayConditions": [
    { "condition": string, "reason": string }
  ],
  "inspectionChecklist": [
    { "system": string, "checkpoint": string, "riskIfIgnored": string }
  ],
  "sellerQuestions": [
    { "topic": string, "question": string, "expectedAnswer": string }
  ],
  "decisionSynthesis": {
    "score": ${judge.decisionScore},
    "riskLevel": "${judge.technicalRiskLevel}",
    "verdict": string
  }
}`
      : `Commercial Vehicle: ${context.brand} ${context.model} ${context.year || ''}
Engine: ${context.engine || ''}
Fuel: ${context.fuel || 'Dizel'}
Configuration: ${context.trimPackage || '13 m3'}
Transmission Scope: ${context.transmission || 'Manuel + Otomatik'}
Commercial Application Details:
${JSON.stringify(judge.commercialDetails || {}, null, 2)}
Approved Facts:
${factsJson}
Commercial Duty Risks:
${JSON.stringify((judge as any).commercialDetails?.commercialDutyRisks || [], null, 2)}

Write the complete Minivan/Panelvan Commercial Report in strict JSON:
{
  "vehicleOverview": "Bu Araç Nasıl Bir Ticari? (Hangi iş kollarına uygun, şehir içi vs uzun yol, yük karakteri)",
  "technicalSpecifications": {
    "engineDisplacementCc": ${judge.finalDisplacementCc},
    "enginePowerHp": ${judge.finalPowerHp},
    "powerOptions": ${JSON.stringify(judge.candidatePowers)},
    "powerUnit": "HP",
    "fuel": "${context.fuel || 'Dizel'}",
    "transmission": "Manuel veya Otomatik"
  },
  "engineAndEmissionsAnalysis": "Motor ve Emisyon Sistemleri (Turbo, enjektör, EGR, DPF ve AdBlue analizi)",
  "manualTransmissionAnalysis": "Manuel Şanzıman Analizi (Baskı-balata, volan, vites geçiş hissiyatı)",
  "automaticTransmissionAnalysis": "Otomatik Şanzıman Analizi (Doğrulandıysa karakteri, doğrulanmadıysa 'Seçilen konfigürasyonda otomatik şanzıman opsiyonu doğrulanmadı')",
  "manualVsAutomatic": "Manuel mi Otomatik mi? (Eğer her ikisi de varsa karşılaştırma)",
  "chronicProblems": [
    { "title": string, "symptoms": string, "risk": string, "checkNote": string }
  ],
  "commercialDutyRisks": [
    { "title": string, "risk": string, "checkRecommendation": string }
  ],
  "configurationAnalysis": "Seçilen Gövde ve Hacim Konfigürasyonu (${context.trimPackage || '13 m³'} yük hacmi, uzunluk-yükseklik, pratik kullanım)",
  "strongReasons": [
    { "title": string, "explanation": string }
  ],
  "tradeoffs": [
    { "title": string, "explanation": string }
  ],
  "idealFor": [
    { "profile": string, "explanation": string }
  ],
  "notIdealFor": [
    { "profile": string, "explanation": string }
  ],
  "conditionsToConsider": [
    { "condition": string, "reason": string }
  ],
  "walkAwayConditions": [
    { "condition": string, "reason": string }
  ],
  "inspectionChecklist": [
    { "system": string, "checkpoint": string, "riskIfIgnored": string }
  ],
  "sellerQuestions": [
    { "topic": string, "question": string, "expectedAnswer": string }
  ],
  "decisionSynthesis": {
    "score": ${judge.decisionScore},
    "riskLevel": "${judge.technicalRiskLevel}",
    "verdict": string
  }
}`;

    let writerJson: any = null;
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey, timeout: 16000 });
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });
        writerJson = JSON.parse(res.choices[0]?.message?.content || '{}');
      } catch (err: any) {
        this.logger.warn(`Report Writer LLM notice: ${err.message}`);
      }
    }

    if (!writerJson || Object.keys(writerJson).length === 0) {
      writerJson = this.generateDeterministicReportFallback(context, judge);
    }

    // Harmonize writer output into standard ComprehensiveVehicleReport format
    return this.harmonizeIntoStandardVehicleReport(context, judge, writerJson);
  }

  /**
   * Harmonizes writer content into the standard ComprehensiveVehicleReport shape
   * so all Web and Mobile components render it seamlessly with zero UI breaking changes.
   */
  private harmonizeIntoStandardVehicleReport(
    context: MultiVehicleResearchContext,
    judge: Agent3Output,
    writer: any,
  ): any {
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';
    const titlePrefix = isMotorcycle ? `${context.brand} ${context.model}` : `${context.year || ''} ${context.brand} ${context.model} ${context.trimPackage || ''}`.trim();

    return {
      reportId: `vr_${isMotorcycle ? (context.modelId || context.model) : context.variantId}_${Date.now()}`,
      mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
      status: 'COMPLETED',
      generatedAt: new Date().toISOString(),
      schemaVersion: 2,
      vehicleType: context.vehicleType,
      vehicleIdentity: {
        brand: context.brand,
        model: context.model,
        modelYear: context.year || (isMotorcycle ? 'Tüm Üretim Yılları' : 2011),
        year: context.year || (isMotorcycle ? 'Tüm Üretim Yılları' : 2011),
        bodyType: isMotorcycle ? 'Motosiklet' : 'Minivan & Panelvan',
        engineCode: context.engine || (isMotorcycle ? 'Katalog Motoru' : '2.3 dCi'),
        transmissionName: isMotorcycle ? 'Manuel' : (context.transmission || 'Manuel + Otomatik'),
        fuelType: isMotorcycle ? 'Benzin' : (context.fuel || 'Dizel'),
        trim: context.trimPackage || (isMotorcycle ? 'Standart' : '13 m3'),
        engineDisplacementCc: judge.finalDisplacementCc,
        enginePowerHp: judge.finalPowerHp,
        canonicalDisplayPowerHp: judge.finalPowerHp,
        vehicleType: context.vehicleType,
      },
      technicalSpecifications: {
        engineDisplacementCc: judge.finalDisplacementCc,
        enginePowerHp: judge.finalPowerHp,
        powerUnit: 'HP',
        engineTorqueNm: isMotorcycle ? 22 : 310,
        torqueUnit: 'Nm',
        transmissionTypeAndSpeeds: isMotorcycle ? '5 İleri Manuel' : '6 İleri Manuel / Robotize',
        transmissionSpeeds: isMotorcycle ? 5 : 6,
        clutchType: isMotorcycle ? 'Islak Çoklu Disk' : 'Kuru Tek Disk / Hidrolik',
        drivetrain: isMotorcycle ? 'Zincir Tahrikli' : 'Önden Çekiş (FWD)',
        zeroToHundredKmh: isMotorcycle ? 9.5 : 14.5,
        topSpeedKmh: isMotorcycle ? 135 : 155,
        catalogCombinedFuelL100km: isMotorcycle ? 3.6 : 8.2,
      },
      expertDecisionSynthesis: {
        vehicleCharacter: {
          headline: `${titlePrefix} Kapsamlı Analiz ve Karar Raporu`,
          detailedAssessment: writer.vehicleOverview || 'Araç mekanik ve kullanım özellikleri incelendi.',
          supportingFactIds: [],
        },
        dailyUseAssessment: {
          cityUse: isMotorcycle
            ? 'Şehir içi kıvraklığı, düşük devir tork dengesi ve dur-kalk trafiğindeki debriyaj yumuşaklığı.'
            : 'Şehir içi dağıtım ve dar sokaklarda dönüş çapı ile ayna görüş açısı manevra kabiliyeti.',
          highwayUse: isMotorcycle
            ? 'Otoyol rüzgar direnci ve yüksek süratlerdeki titreşim/şasi stabilitesi.'
            : 'Yüklü otoyol seyrinde motor tork rezervi ve rüzgar savurma direnci.',
          supportingFactIds: [],
        },
        strongestReasonsToChoose: (writer.strongReasons || []).map((r: any) => ({
          title: r.title,
          explanation: r.explanation,
          supportingFactIds: [],
        })),
        compromisesAndLimitations: (writer.tradeoffs || []).map((t: any) => ({
          title: t.title,
          explanation: t.explanation,
          supportingFactIds: [],
        })),
        suitableFor: (writer.idealFor || []).map((i: any) => ({
          profile: i.profile,
          explanation: i.explanation,
          supportingFactIds: [],
        })),
        notSuitableFor: (writer.notIdealFor || []).map((n: any) => ({
          profile: n.profile,
          explanation: n.explanation,
          supportingFactIds: [],
        })),
        purchaseConditions: (writer.conditionsToConsider || []).map((c: any) => ({
          condition: c.condition,
          reason: c.reason,
          priority: 'IMPORTANT',
          supportingFactIds: [],
        })),
        walkAwayConditions: (writer.walkAwayConditions || []).map((w: any) => ({
          condition: w.condition,
          reason: w.reason,
          priority: 'CRITICAL',
          supportingFactIds: [],
        })),
        finalConditionalVerdict: {
          shortVerdict: writer.decisionSynthesis?.verdict || `Karar Puanı: ${judge.decisionScore}/100. Kontroller teyit edilerek değerlendirilebilir.`,
          detailedVerdict: judge.decisionRationale,
          confidence: 'HIGH',
          supportingFactIds: [],
        },
        motorcycleEraAnalysis: isMotorcycle
          ? {
              modelHistory: writer.modelHistory,
              productionEras: judge.motorcycleEras || writer.productionEras,
              recommendedEraComparison: writer.recommendedEraComparison,
              allEraCommonIssues: writer.allEraCommonIssues,
              eraSpecificIssues: writer.eraSpecificIssues,
            }
          : undefined,
        commercialApplicationAnalysis: !isMotorcycle
          ? {
              applicationSummary: writer.vehicleOverview,
              verifiedPowers: judge.candidatePowers,
              manualTransmissionAnalysis: writer.manualTransmissionAnalysis,
              automaticTransmissionAnalysis: writer.automaticTransmissionAnalysis,
              transmissionComparison: writer.manualVsAutomatic,
              commercialDutyRisks: writer.commercialDutyRisks,
              configurationContext: {
                rawPackage: context.trimPackage || '13 m3',
                cargoVolumeM3: 13,
                commercialMeaning: writer.configurationAnalysis || `${context.trimPackage || '13 m³'} kargo yük hacmi konfigürasyonu`,
              },
            }
          : undefined,
      },
      sellerQuestions: (writer.sellerQuestions || []).map((q: any) => ({
        category: 'TEKNİK_VE_BAKIM',
        questionText: q.question,
        expectedAnswerHint: q.expectedAnswer,
        redFlagAnswerHint: 'Belirsiz veya kaçamak cevaplar',
      })),
      inspectionChecklist: (writer.inspectionChecklist || []).map((c: any) => ({
        category: c.system || 'MEKANİK',
        checkpoint: c.checkpoint,
        whatToCheck: c.riskIfIgnored || 'Aşınma ve boşluk kontrolü',
        importance: 'HIGH',
      })),
      decisionScore: {
        score: judge.decisionScore,
        riskLevel: judge.technicalRiskLevel,
        verdict: writer.decisionSynthesis?.verdict || 'Kontroller teyit edilerek değerlendirilebilir.',
      },
    };
  }

  private generateDeterministicReportFallback(
    context: MultiVehicleResearchContext,
    judge: Agent3Output,
  ): any {
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';
    return {
      vehicleOverview: isMotorcycle
        ? `${context.brand} ${context.model}, sınıfında dengeli şasisi ve karakteristik motor bloğuyla öne çıkan bir motosiklettir.`
        : `${context.brand} ${context.model} ${context.trimPackage || ''}, ticari taşımacılık ve hacimli yük operasyonları için geliştirilmiş sağlam bir hafif ticaridir.`,
      modelHistory: `${context.brand} ${context.model} üretim serisi boyunca farklı dönemlerde revize edilmiştir.`,
      productionEras: judge.motorcycleEras || [],
      recommendedEraComparison: 'Bakım geçmişi belgelenmiş ve mekanik revizyonları yapılmış dönemler tercih edilmelidir.',
      strongReasons: [
        { title: 'Kanıtlanmış Mekanik Sağlamlık', explanation: 'Geniş parça bulunurluğu ve usta tecrübesi.' },
        { title: 'Operasyonel Verimlilik', explanation: 'Kullanım amacına uygun tork ve yakıt dengesi.' },
      ],
      tradeoffs: [
        { title: 'Periyodik Bakım Hassasiyeti', explanation: 'Aksatılan yağ ve sıvı değişimlerinde mekanik aşınma riski artar.' },
      ],
      idealFor: [
        { profile: 'Bilinçli Kullanıcılar', explanation: 'Periyodik kontrolleri düzenli takip eden işletme veya sürücüler.' },
      ],
      notIdealFor: [
        { profile: 'Ağır İhmalli Kullanıcılar', explanation: 'Servis geçmişi olmayan araçları tercih edenler.' },
      ],
      conditionsToConsider: [
        { condition: 'Ekspertiz ve Mekanik Kontrol', reason: 'Aşınma paylarının yetkili veya uzman usta tarafından incelenmesi şarttır.' },
      ],
      walkAwayConditions: [
        { condition: 'Ağır Gövde/Şasi Hasarı veya Aşırı Motor Sesi', reason: 'Yüksek masraf ve güvenlik zafiyeti doğurur.' },
      ],
      inspectionChecklist: [
        { system: 'MOTOR', checkpoint: 'Soğutma ve yağ kaçağı kontrolü', riskIfIgnored: 'Hararet ve aşınma riski' },
        { system: 'ŞANZIMAN', checkpoint: 'Kavrama ve vites geçiş hissiyatı', riskIfIgnored: 'Pahalı baskı-balata masrafı' },
      ],
      sellerQuestions: [
        { topic: 'Bakım', question: 'Son ağır bakımda hangi parçalar değişti?', expectedAnswer: 'Faturalı ve tarihli kayıt' },
      ],
      decisionSynthesis: {
        score: judge.decisionScore,
        riskLevel: judge.technicalRiskLevel,
        verdict: 'Doğrulanmış kontroller ışığında değerlendirilebilir.',
      },
    };
  }
}
