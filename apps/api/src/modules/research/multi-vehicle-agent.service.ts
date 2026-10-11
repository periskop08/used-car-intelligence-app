import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { VariantTechnicalFactsService } from '../vehicle/variant-technical-facts.service';
import { VerifiedSpecLibraryService } from '../vehicle/verified-spec-library.service';
import OpenAI from 'openai';

export type SupportedMultiVehicleType = 'MOTORCYCLE' | 'MINIVAN_PANELVAN' | 'SUV_PICKUP' | 'AUTOMOBILE';
export type ClaimScopeType = 'ALL_ERA_COMMON' | 'ERA_SPECIFIC' | 'APPLICATION_SPECIFIC' | 'MANUAL_ONLY' | 'AUTOMATIC_ONLY';
export type AdjudicationStatus = 'APPROVED' | 'APPROVED_WITH_SCOPE' | 'CONFLICTED' | 'INSUFFICIENT_EVIDENCE' | 'REJECTED';

export interface MultiVehicleResearchContext {
  vehicleType: SupportedMultiVehicleType;
  brand: string;
  model: string;
  year?: number;
  engine?: string;
  fuel?: string;
  transmission?: string;
  trimPackage?: string; // e.g. "13 m3"
  bodyType?: string; // e.g. "Scooter / Maxi Scooter"
  modelId?: string;
  variantId?: string;
  searchScope?: any;
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
  manualGearboxSpeeds?: number;
  automaticGearboxVerified: boolean;
  automaticGearboxType?: string;
  automaticUnverifiedReason?: string;
  bodyStyleClassification?: 'COMBI_PASSENGER' | 'CARGO_PANELVAN';
  seatingCapacity?: number;
  trunkCapacityLiters?: number;
  curbWeightKg?: number;
  configurationContext: {
    rawSourceLabel: string;
    commercialMeaning: string;
    cargoVolumeM3?: number;
  };
}

export interface Agent1Output {
  vehicleType: SupportedMultiVehicleType;
  brand: string;
  model: string;
  displacementCc: number;
  powerHp: number;
  powerRangeText?: string;
  candidatePowers?: number[];
  transmissionType?: string;
  coolingType?: string;
  trunkCapacityLiters?: number;
  curbWeightKg?: number;
  topSpeedKmh?: number;
  zeroToHundredKmh?: number;
  catalogCombinedFuelL100km?: number;
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
  correctedTransmissionType?: string;
  coolingRefuted?: boolean;
  coolingRefutedReason?: string;
  correctedCoolingType?: string;
  gearboxSpeedRefuted?: boolean;
  gearboxSpeedRefutedReason?: string;
  powerRefuted?: boolean;
  powerRefutedReason?: string;
  correctedPowerHp?: number;
  correctedAutomaticGearboxType?: string;
  powerDiscrepancies?: string[];
  trunkCapacityRefuted?: boolean;
  trunkCapacityRefutedReason?: string;
  correctedTrunkCapacityLiters?: number;
  cargoVolumeRefuted?: boolean;
  cargoVolumeRefutedReason?: string;
  correctedCargoVolumeM3?: number;
  dpfRefuted?: boolean;
  dpfRefutedReason?: string;
}

export interface AdjudicatedFact {
  claim: CandidateClaim;
  status: AdjudicationStatus;
  adjudicationReason: string;
}

export interface Agent3Output {
  vehicleType: SupportedMultiVehicleType;
  adjudicatedFacts: AdjudicatedFact[];
  approvedFactsOnly: CandidateClaim[];
  finalDisplacementCc: number;
  finalPowerHp: number;
  finalPowerRangeText?: string;
  candidatePowers: number[];
  finalTransmissionType: string;
  finalCoolingType: string;
  finalTrunkCapacityLiters?: number;
  finalCurbWeightKg?: number;
  finalCargoVolumeM3?: number;
  finalTopSpeedKmh?: number;
  finalZeroToHundredKmh?: number;
  finalCombinedFuelL100km?: number;
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
    private readonly verifiedSpecLibraryService: VerifiedSpecLibraryService,
  ) {}

  /**
   * Universal AI Caller with OpenAI (gpt-4o) and Gemini Fallback
   */
  private async callAiJson(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 6144,
    timeoutMs = 45000,
  ): Promise<any> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey, timeout: timeoutMs });
        const res = await openai.chat.completions.create({
          model: process.env.MULTI_VEHICLE_AI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        });
        const content = res.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        if (parsed && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (err: any) {
        this.logger.warn(`[AI CALL] OpenAI call failed: ${err.message}. Trying Gemini fallback...`);
      }
    }

    // Gemini Fallback
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const models = ['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
      for (const mName of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiKey}`;
          const response = await (global as any).fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: maxTokens,
                temperature: 0.1,
              },
            }),
          });
          if (!response.ok) continue;
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanText);
          if (parsed && Object.keys(parsed).length > 0) {
            this.logger.log(`[AI CALL] Successfully executed via Gemini model (${mName})`);
            return parsed;
          }
        } catch (gemErr: any) {
          this.logger.warn(`[AI CALL] Gemini ${mName} attempt failed: ${gemErr.message}`);
        }
      }
    }

    return null;
  }



  /**
   * Main entry point: Executes the 3-Agent pipeline + Closed Report Writer
   * for MOTORCYCLE, MINIVAN_PANELVAN, or SUV_PICKUP.
   */
  async executeMultiAgentPipeline(context: MultiVehicleResearchContext): Promise<any> {
    this.logger.log(
      `[MULTI_VEHICLE_PIPELINE] Starting 3-Agent Research for ${context.vehicleType}: ${context.brand} ${context.model} (${context.year || 'ALL_YEARS'})`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Mandatory Grounded CC & HP Resolution (On-The-Fly Real-Time Research)
    // ─────────────────────────────────────────────────────────────────────────
    let resolvedCc = 0;
    let resolvedHp = 0;
    let candidatePowers: number[] = [];
    let powerRangeText: string | undefined;

    // Pure Dynamic Live Research:
    // 1. Checks VerifiedSpecLibrary first (if previously investigated/verified).
    // 2. If missing, conducts ON-THE-FLY LIVE AI CATALOG RESEARCH for the exact brand, model, year, and engine.
    // 3. Persists to VerifiedSpecLibrary so future queries share the verified record.
    try {
      const liveSpec = await this.verifiedSpecLibraryService.verifyAndGetSpecs({
        vehicleType:
          context.vehicleType === 'MINIVAN_PANELVAN'
            ? 'COMMERCIAL'
            : context.vehicleType === 'SUV_PICKUP'
            ? 'SUV'
            : context.vehicleType === 'MOTORCYCLE'
            ? 'MOTORCYCLE'
            : 'AUTOMOBILE',
        brand: context.brand,
        model: context.model,
        year: context.year,
        engine: context.engine,
        fuelType: context.fuel,
        transmission: context.transmission,
        trim: context.trimPackage,
        bodyType: context.bodyType,
        variantId: context.variantId,
        modelId: context.modelId,
      });

      if (liveSpec && liveSpec.displacementCc > 0 && liveSpec.powerHp > 0) {
        resolvedCc = liveSpec.displacementCc;
        resolvedHp = liveSpec.powerHp;
        candidatePowers = Array.isArray(liveSpec.candidatePowers) && liveSpec.candidatePowers.length > 0
          ? liveSpec.candidatePowers
          : [liveSpec.powerHp];
        powerRangeText = liveSpec.powerRange;
        this.logger.log(
          `[MULTI_VEHICLE_PIPELINE] Spec dynamically resolved via ${liveSpec.source}: ${context.brand} ${context.model} (${resolvedCc} cc / ${resolvedHp} HP)`,
        );
      }
    } catch (specErr: any) {
      this.logger.warn(`[MULTI_VEHICLE_PIPELINE] Live spec dynamic research error: ${specErr.message}`);
    }

    if (!resolvedCc && context.variantId) {
      const facts = await this.variantTechnicalFactsService.getVariantTechnicalFacts(context.variantId);
      resolvedCc = facts.engineDisplacementCc || 0;
      resolvedHp = facts.enginePowerHp || 0;
      candidatePowers = facts.candidatePowers || (resolvedHp ? [resolvedHp] : []);
    }

    // Fallbacks if resolution didn't yield values
    if (!resolvedCc) {
      resolvedCc =
        context.vehicleType === 'MOTORCYCLE'
          ? 249
          : context.vehicleType === 'SUV_PICKUP'
          ? 1995
          : 1598;
    }
    if (!resolvedHp) {
      resolvedHp =
        context.vehicleType === 'MOTORCYCLE'
          ? 24
          : context.vehicleType === 'SUV_PICKUP'
          ? 150
          : 105;
    }
    if (candidatePowers.length === 0) {
      candidatePowers = [resolvedHp];
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
    const agent3Output = this.runAgent3Judge(context, agent1Output, agent2Output);

    // ─────────────────────────────────────────────────────────────────────────
    // CLOSED REPORT WRITER: Pure presenter with 0 internet access & 0 fact invention
    // ─────────────────────────────────────────────────────────────────────────
    this.logger.log(`[REPORT WRITER] Generating closed presentation report from ${agent3Output.approvedFactsOnly.length} approved facts...`);
    const finalReport = await this.runClosedReportWriter(context, agent3Output);

    return finalReport;
  }

  /**
   * Helper to format the authoritative 8 user filters
   */
  private format8FilterBlock(context: MultiVehicleResearchContext): string {
    return [
      "=== KULLANICININ SEÇTİĞİ KESİN 8'Lİ FİLTRE (TEK BAĞLAYICI REFERANS) ===",
      `1. Vasıta Türü: ${context.vehicleType}`,
      `2. Marka: ${context.brand}`,
      `3. Model Ailesi: ${context.model}`,
      `4. Yıl: ${context.year || 'Belirtilmemiş'}`,
      `5. Kasa Tipi: ${context.bodyType || 'Belirtilmemiş'}`,
      `6. Motor / Versiyon: ${context.engine || 'Belirtilmemiş'}`,
      `7. Yakıt Türü: ${context.fuel || 'Belirtilmemiş'}`,
      `8. Şanzıman Tipi: ${context.transmission || 'Belirtilmemiş'}`,
      `9. Donanım Paketi: ${context.trimPackage || 'Standart'}`,
      "=====================================================================",
      "DİKKAT - SIFIR ÇAPRAZ MODEL / SIFIR KARDEŞ PLATFORM KARIŞIKLIĞI KURALI:",
      "Aynı motor bloğunu paylaşan başka kardeş modellerin (Peugeot 508, DS7 Crossback, DS4, Citroen C5 Aircross vb.)",
      "teknik verileri, beygir güçleri veya kronik arızaları ASLA bu araca taşınamaz.",
      "Araştırma ve değerlendirme yalnızca ve yalnızca kullanıcının yukarıda seçtiği 8 filtredeki spesifik araç için yapılmalıdır!",
      "=====================================================================",
    ].join('\n');
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
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';
    const isSuvPickup = context.vehicleType === 'SUV_PICKUP';
    const isAutomobile = context.vehicleType === 'AUTOMOBILE';
    const isCommercial = context.vehicleType === 'MINIVAN_PANELVAN';

    // 1. Live Web Grounding Search
    let liveWebSnippets = '';
    try {
      const cleanTrim = context.trimPackage && !/^(standart|standart donanım|standart kasa)$/i.test(context.trimPackage) ? context.trimPackage : '';
      const exactSignature = [
        context.year,
        context.brand,
        context.model,
        cleanTrim,
        context.engine,
        context.fuel,
        context.transmission,
        context.bodyType,
      ].filter(Boolean).join(' ');

      let searchTerms: string[];
      if (isMotorcycle) {
        searchTerms = [
          `${context.brand} ${context.model} üretim yılları kasaları dönemleri karbüratör enjeksiyon teknik özellikleri`,
          `${context.brand} ${context.model} hava soğutma sıvı soğutma şanzıman otomatik cvt manuel`,
          `${context.brand} ${context.model} kronik sorunlar arızalar kullanıcı şikayetleri`,
          `${context.brand} ${context.model} motor mekanik eksantrik zincir debriyaj şanzıman arızaları`,
        ];
      } else if (isSuvPickup) {
        searchTerms = [
          `${exactSignature} teknik özellikleri motor gücü hp beygir tork katalog`,
          `${context.brand} ${context.model} ${context.year || ''} 4x4 arazi şanzımanı diferansiyel kilidi aktarma sorunları`,
          `${context.brand} ${context.model} ${context.year || ''} şasi korozyon alt takım makas salıncak kronik sorunlar`,
          `${context.brand} ${context.model} ${context.year || ''} enjektör turbo dpf kullanıcı yorumları`,
        ];
      } else if (isAutomobile) {
        if (context.brand.toLowerCase() === 'subaru') {
          searchTerms = [
            `${exactSignature} boksör boxer motor silindir kapak contası yağ eksiltme kronik sorunlar`,
            `${exactSignature} symmetrical awd 4 çeker diferansiyel şaft askı bilyası arızaları`,
            `${exactSignature} teknik özellikleri motor gücü hp beygir tork katalog`,
            `${context.brand} ${context.model} ${context.year || ''} otomatik şanzıman tork konvertör buji bakımı ekspertiz`,
          ];
        } else {
          searchTerms = [
            `${exactSignature} teknik özellikleri motor gücü beygir hp tork şanzıman katalog`,
            `${context.brand} ${context.model} ${context.year || ''} ${context.engine || ''} ${cleanTrim} kronik sorunlar kullanıcı şikayetleri`,
            `${context.brand} ${context.model} ${context.year || ''} ${context.transmission || ''} şanzıman kavrama arızaları`,
            `${context.brand} ${context.model} ${context.year || ''} süspansiyon yol tutuş donanım ekspertiz kontrolleri`,
          ];
        }
      } else {
        const normEng = (context.engine || '').toLowerCase();
        const isWetTimingBelt = normEng.includes('ecoblue') || (context.brand.toLowerCase() === 'ford' && context.engine?.includes('2.0'));
        const commModelSearch = isWetTimingBelt
          ? `${context.brand} ${context.model} 2.0 ecoblue yağ içinde çalışan triger kayışı yağ süzgeci tıkanması arızası`
          : `${context.brand} ${context.model} ${context.year || ''} kronik sorunlar kullanıcı şikayetleri`;
        searchTerms = [
          `${exactSignature} bagaj hacmi kargo alanı koltuk sayısı teknik özellikleri katalog`,
          `${exactSignature} motor gücü beygir hp şanzıman tork katalog`,
          `${context.brand} ${context.model} ${context.year || ''} ${cleanTrim} ticari kullanım ağır yük aşınma`,
          commModelSearch,
          `${context.brand} ${context.model} ${context.year || ''} sürgülü kapı kilit mekanizması süspansiyon burç arızaları`,
        ];
      }

      const allResults = await Promise.all(
        searchTerms.map((q) => this.searchProvider.search(q, 'tr', 'tr')),
      );

      const snippets = allResults
        .flat()
        .slice(0, 12)
        .map((r) => `[${r.domain}]: ${r.snippet}`)
        .join('\n');
      liveWebSnippets = snippets;
    } catch (e: any) {
      this.logger.warn(`Agent 1 live search notice: ${e.message}`);
    }

    // 2. Structured Extraction Prompt
    let systemPrompt: string;
    let userPrompt: string;

    if (isMotorcycle) {
      systemPrompt = `You are TorqueScout Agent 1: Senior Motorcycle Technical Research Specialist.
Extract deep mechanical knowledge for this entire motorcycle model family across all its production eras.
MANDATORY RULES:
1. STRICT TURKISH LANGUAGE MANDATE (SIFIR İNGİLİZCE KURALI):
   ALL text, titles, era names, key revisions, symptoms, and inspection instructions MUST BE 100% IN TURKISH.
2. ABSOLUTE CATALOG ACCURACY ON FUEL INDUCTION, COOLING & TRANSMISSION:
   - You MUST determine the genuine mechanical architecture dynamically:
     a) BORN-EFI & MODERN POST-2015 MODELS: If introduced in recent years or born with electronic fuel injection, IT NEVER HAD A CARBURETOR! Strictly forbid fabricating synthetic pre-2018 or 2010 carburetor eras. Claims, symptoms, and inspectionCheck MUST NEVER mention carburetor ("karbüratör / karburatör") on EFI models; fuel failure modes must be electronic injector clogging, fuel pump pressure, or throttle body.
     b) CLASSIC / PRE-2008 MODELS: Classic cruisers and older series were carburetor-fed from the factory. Never label pre-2008 classic carburetor models as EFI or Euro 3!
     c) SCOOTER & TRANSMISSION: If the vehicle is a scooter, moped, or urban step-through commuter, transmission is "Otomatik (CVT)". If it is a geared motorcycle, specify the authentic manual speeds (5 İleri Manuel / 6 İleri Manuel) or DCT.
     d) COOLING FIDELITY (HAVA VS SIVI SOĞUTMA): Small displacement urban commuters/scooters and classic air-cooled cruisers are "HAVA" (Hava Soğutmalı). NEVER claim radiator, coolant hoses, thermostat or antifreeze leaks on an air-cooled engine!
     e) BRAKING ACCURACY: If brakingSystem is "Ön Disk Arka Kampana" or has no ABS, hasAbs MUST be false!
3. SIFIR RAKİP KIYASLAMASI (ZERO COMPETITOR / RIVAL COMPARISON):
   - KESİNLİKLE başka marka veya rakip model ismi yazma.
   - Sadece incelenen modelin kendi teknik kabiliyetine, mekaniğine ve sürüş karakterine odaklan.
4. "keyChanges" MUST CONTAIN AT LEAST 2 AUTHENTIC TURKISH REVISIONS PER ERA.
5. Extract REAL, specific chronic mechanical and electrical failure modes for this exact model.
6. Output strict JSON only.`;

      userPrompt = `Motorcycle Model Family: ${context.brand} ${context.model}
Scope: TÜM MODEL AİLESİ (Üretim başlangıcından günümüze tüm jenerasyon ve dönemler)
Base Catalog CC: ${baseCc}
Base Catalog HP: ${baseHp}
Live Web Evidence:
${liveWebSnippets}

Extract strict JSON:
{
  "displacementCc": ${baseCc},
  "powerHp": ${baseHp},
  "powerRangeText": "${powerRangeText || `${baseHp} HP`}",
  "candidatePowers": ${JSON.stringify(candidatePowers)},
  "transmissionType": "string (örn: Otomatik (CVT) veya 5 İleri Manuel veya 6 İleri Manuel)",
  "coolingType": "HAVA veya SIVI veya HAVA_YAG",
  "motorcycleEras": [
    {
      "eraName": "string (Doğru dönem adı)",
      "startYear": number,
      "endYear": number | null,
      "fuelSystem": "CARBURETOR" | "EFI",
      "engineLayout": "Tek Silindir | V-Twin | Sıralı İki | Sıralı Dört",
      "displacementCc": ${baseCc},
      "powerHp": ${baseHp},
      "powerRange": "string",
      "cooling": "HAVA" | "SIVI" | "HAVA_YAG",
      "transmission": "Otomatik (CVT)" | "5 İleri Manuel" | "6 İleri Manuel",
      "brakingSystem": "Ön Disk Arka Kampana | Çift Disk | ABS",
      "hasAbs": boolean,
      "keyChanges": ["En az 2 somut Türkçe teknik revizyon maddesi"]
    }
  ],
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Gerçek Türkçe arıza adı)",
      "system": "ELEKTRİK_ŞARJ | YAKIT_BESLEME | ŞANZIMAN | YÜRÜYEN_AKSAM | MOTOR | GÖVDE_TRİM",
      "scopeType": "ALL_ERA_COMMON | ERA_SPECIFIC",
      "applicableEra": "string",
      "symptoms": ["string"],
      "userExperience": "string",
      "testDriveCheck": "string",
      "inspectionCheck": "string",
      "sellerQuestion": "string",
      "costRisk": "DUSUK | ORTA | YUKSEK | COK_YUKSEK",
      "severity": "LOW | MODERATE | HIGH | CRITICAL",
      "confidence": 0.90
    }
  ]
}`;
    } else if (isSuvPickup) {
      systemPrompt = `You are TorqueScout Agent 1: Senior 4x4, SUV & Pickup Technical Research Specialist.
Extract off-road, towing, chassis, drivetrain, and powertrain failure modes.
CRITICAL RULES:
1. Validate 4WD/AWD systems: transfer case 2H/4H/4L electronic actuator, differential locks, propeller shaft universal joint & center support bearing.
2. Investigate underbody corrosion, ladder frame / unibody fatigue, leaf spring sag, and suspension arm bushing wear.
3. KULLANICI KAYNAKLI BAKIM İHMALİ KRONİK KUSUR SAYILAMAZ: Yağ değişimini geciktirme, hor kullanma, debriyaj yakma, kalitesiz antifriz/yakıt gibi her araçta çıkabilecek kullanıcı ihmalleri ASLA bu aracın kronik fabrikasyon kusuru sayılamaz ve puan kırılamaz. Yalnızca bu modele özgü doğrulanmış fabrikasyon zaafiyetleri listelenmelidir.
4. Output strict JSON only.`;

      userPrompt = `Vehicle: ${context.brand} ${context.model} ${context.year || ''}
Engine: ${context.engine || ''}
Base Catalog CC: ${baseCc}
Base Catalog HP: ${baseHp}
Live Web Evidence:
${liveWebSnippets}

Extract strict JSON:
{
  "displacementCc": ${baseCc},
  "powerHp": ${baseHp},
  "powerRangeText": "${powerRangeText || `${baseHp} HP`}",
  "candidatePowers": ${JSON.stringify(candidatePowers)},
  "transmissionType": "string (örn: 6 İleri Manuel veya 8 İleri Otomatik veya 9 İleri Otomatik)",
  "coolingType": "SIVI",
  "trunkCapacityLiters": number,
  "curbWeightKg": number,
  "topSpeedKmh": number,
  "zeroToHundredKmh": number,
  "catalogCombinedFuelL100km": number,
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Modelin gerçek Türkçe arıza adı)",
      "system": "YÜRÜYEN_AKSAM | MOTOR | ŞANZIMAN | DİFERANSİYEL | GÖVDE_ŞASİ",
      "scopeType": "ALL_ERA_COMMON",
      "symptoms": ["string"],
      "userExperience": "string",
      "testDriveCheck": "string",
      "inspectionCheck": "string",
      "sellerQuestion": "string",
      "costRisk": "ORTA | YUKSEK | COK_YUKSEK",
      "severity": "MODERATE | HIGH | CRITICAL",
      "confidence": 0.90
    }
  ]
}`;
    } else if (isAutomobile) {
      const isGasoline = (context.fuel || '').toLowerCase().includes('benzin');
      const autoSellerQuestionExample = isGasoline
        ? 'Soğuk ilk marşta motor rölantisinde dalgalanma veya tekleme oluyor mu, bujiler ve ateşleme bobinleri ne zaman yenilendi?'
        : 'Soğuk ilk marşta enjektör diplerinde mazot terlemesi var mı, enjektör pulları ve rekorları daha önce elden geçti mi?';
      const filterBlock = this.format8FilterBlock(context);
      systemPrompt = `You are TorqueScout Agent 1: Senior Passenger Automobile Technical Research Specialist.
Investigate the exact passenger car platform based STRICTLY on the user filters:
${filterBlock}

CRITICAL DIRECTIVES:
1. STRICT TURKISH LANGUAGE MANDATE (SIFIR İNGİLİZCE): All titles, symptoms, inspections must be 100% in authentic Turkish automotive engineering terminology.
2. PASSENGER CAR ARCHITECTURE (SIFIR TİCARİ TERİM): This is a PASSENGER AUTOMOBILE (Sedan, Hatchback, Station Wagon, Coupe, Cabriolet). KESİNLİKLE "sürgülü kapı", "kargo yükleme eşiği", "palet", "esnaf/filo" gibi hafif ticari terimler KULLANILAMAZ!
3. AUTHENTIC GEARBOX & POWERTRAIN RESEARCH: Investigate exact factory transmission options (Manuel, Tork Konvertörlü Otomatik, Çift Kavrama DSG/EDC/Powershift, CVT) and engine failure modes.
4. FUEL & ASPIRATION SPECIFICITY:
   - If Gasoline: focus on ignition coils, spark plugs, head gaskets, thermostat housing, PCV valve, fuel pump. NEVER claim diesel injector leak-off pipe (enjektör geri dönüş hattı), DPF soot clogging, or AdBlue on gasoline!
   - If Naturally Aspirated (Atmosferik): KESİNLİKLE "turboşarj arızası", "turbo besleme hatları", "intercooler" gibi parçalar YAZILAMAZ!
   - If Diesel: focus on injectors, DPF soot clogging, EGR valve, turbo boost leaks.
5. SUBARU BOXER & SYMMETRICAL AWD ARCHITECTURE MANDATE:
   - If the brand is Subaru (Impreza, Legacy, Outback, Forester vb.):
     * The engine is strictly BOXER (Yatay Karşıt / Boksör Motor - EJ serisi) and the drivetrain is SYMMETRICAL AWD.
     * Document authentic Boxer failure modes: Silindir kapak contası (head gasket) dışa yağ/antifriz terlemesi, buji değişim işçilik zorluğu, Boxer motor yağ tüketim takibi, AWD şaft askı bilyası ve arka diferansiyel yağı hassasiyeti.
     * NEVER treat a Subaru as an ordinary inline-4 front-wheel-drive vehicle!
     * NEVER mention diesel components (enjektör geri dönüş hattı, mazot kaçağı, DPF) on petrol Subarus, and NEVER mention turbo on naturally aspirated (160 HP 2.0R/Active) Subarus!
6. ENGINE POWER ACCURACY & ZERO CROSS-MODEL CONFUSION:
   - KESİNLİKLE kardeş modellerden teknik veri veya beygir gücü TAŞINAMAZ.
   - For Subaru Impreza 2005-2007 (Hawkeye) 2.0 naturally aspirated petrol, power is strictly 160 HP (DOHC EJ204). NEVER output 140 HP!
   - For DS Automobiles DS9 1.6 PureTech petrol, power is strictly 225 HP (PureTech 225 with EAT8).
7. DYNAMIC SPEC EXTRACTION:
   - Extract authentic official catalog trunk capacity (Liters), curb weight (kg), top speed (km/h), 0-100 (sec), and combined fuel consumption (L/100km) for this exact model, year, body type, and engine.
8. KULLANICI KAYNAKLI BAKIM İHMALİ KRONİK KUSUR SAYILAMAZ:
   - Yağ değişimini geciktirme, hor kullanma, debriyaj yakma, kalitesiz antifriz gibi her arabada çıkabilecek kullanıcı ihmalleri ASLA bu arabanın kronik arızası sayılamaz. Yalnızca bu motora/şanzımana özgü fabrikasyon tasarım/mühendislik kusurları listelenmelidir.
9. Output strict JSON only.`;

      userPrompt = `Target Passenger Automobile Specification:
${filterBlock}
Base Catalog CC: ${baseCc}
Base Catalog HP: ${baseHp}
Live Web Evidence:
${liveWebSnippets}

Extract strict JSON:
{
  "displacementCc": ${baseCc},
  "powerHp": ${baseHp},
  "powerRangeText": "${powerRangeText || `${baseHp} HP`}",
  "candidatePowers": ${JSON.stringify(candidatePowers)},
  "transmissionType": "string (örn: 6 İleri Manuel veya 7 İleri Otomatik DSG veya 8 İleri Tam Otomatik)",
  "coolingType": "SIVI",
  "trunkCapacityLiters": number,
  "curbWeightKg": number,
  "topSpeedKmh": number,
  "zeroToHundredKmh": number,
  "catalogCombinedFuelL100km": number,
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Modelin gerçek Türkçe arıza adı)",
      "system": "MOTOR | ŞANZIMAN | YÜRÜYEN_AKSAM | ELEKTRONİK_GÖVDE | YAKIT_BESLEME",
      "scopeType": "ALL_ERA_COMMON",
      "symptoms": ["string (Türkçe somut belirti)"],
      "userExperience": "string (Türkçe kullanıcı deneyimi)",
      "testDriveCheck": "string (Türkçe test sürüşü kontrolü)",
      "inspectionCheck": "string (Ekspertiz ve usta seviyesinde somut diagnostik kontrol; örn: OBD canlı veri loglama, manifold/turbo basınç testi, kaçak testi veya mekanik boşluk ölçümü. KESİNLİKLE sadece 'gözle muayene edin' yazma!)",
      "sellerQuestion": "string (Alıcının araç başında veya telefonda satıcıya doğrudan yönelteceği doğal, usta/piyasa diliyle teknik soru; örn: '${autoSellerQuestionExample}')",
      "costRisk": "DUSUK | ORTA | YUKSEK | COK_YUKSEK",
      "severity": "LOW | MODERATE | HIGH | CRITICAL",
      "confidence": 0.90
    }
  ]
}`;
    } else {
      // MINIVAN_PANELVAN (Commercial Vehicle)
      const normEngine = (context.engine || '').toLowerCase();
      const isGasoline = (context.fuel || '').toLowerCase().includes('benzin') || normEngine.includes('ecoboost') || normEngine.includes('puretech') || normEngine.includes('tsi');
      const isWetBelt = normEngine.includes('ecoblue') || (context.brand.toLowerCase() === 'ford' && context.engine?.includes('2.0'));
      const wetBeltRule = isWetBelt
        ? 'DİKKAT: Ford 2.0 EcoBlue motorda yağ içinde çalışan ıslak triger kayışının (Belt-in-Oil / BIO) lif ayrışmasıyla karter yağ süzgecini tıkaması ve motor sarması en kritik arıza modudur.'
        : '';

      const vehicleYear = typeof context.year === 'number' ? context.year : parseInt(String(context.year || '2015'), 10);
      const isPreEuro5 = vehicleYear > 0 && vehicleYear < 2011;
      const hasDpf = !isGasoline && !isPreEuro5;

      const engineArchitectureRule = isGasoline
        ? 'Araç BENZİNLİ motordur: Termostat gövdesi, soğutma sıvısı sızıntıları, ateşleme bobinleri/bujiler, turbo wastegate aktüatör boşluğu incelenmelidir. DPF (dizel partikül filtresi) veya dizel EGR soğutucu kurum tıkanması KESİNLİKLE İDDİA EDİLEMEZ!'
        : isPreEuro5
        ? `Araç ${vehicleYear} model EURO 4 dizel motordur: Bu araçta FABRİKASYON DPF (Dizel Partikül Filtresi) KESİNLİKLE BULUNMAZ! DPF arızası, DPF rejenerasyonu veya DPF kurum doluluğu KESİNLİKLE İDDİA EDİLEMEZ (puan kırılamaz). İnceleme; enjektör geri dönüş hattı sızıntısı, turbo intercooler besleme hortumu yırtılması, EGR valfi mekanik kurum tıkanması, alt kaset triger/zincir aşınması ve çift kütleli volan üzerine odaklanmalıdır.`
        : (wetBeltRule || 'Euro 5/6 Dizel motor: Enjektör geri dönüş hattı sızıntısı, turbo intercooler besleme hortumu yırtılması, DPF kurum doluluğu, EGR valfi ve soğutucu petek tıkanması.');

      const filterBlock = this.format8FilterBlock(context);

      systemPrompt = `You are TorqueScout Agent 1: Commercial Vehicle Application Technical Research Specialist.
Investigate the exact vehicle platform based STRICTLY on the provided user filters:
${filterBlock}

CRITICAL RULES:
1. STRICT TURKISH LANGUAGE MANDATE (SIFIR İNGİLİZCE KURALI):
   ALL text, claim titles, symptoms, user experiences, test drive checks, inspection checks, and seller questions MUST BE 100% IN TURKISH automotive terminology. Zero English allowed!
2. AUTHENTIC GEARBOX DISCOVERY:
   - Investigate if this exact vehicle year, engine, and trim configuration actually offered an automatic transmission option from the factory.
3. DYNAMIC BODY STYLE, SEATING & LUGGAGE/CARGO RESEARCH:
   - Authentically research the exact vehicle body configuration based STRICTLY on the user's selected 8 filters:
     * Kasa Tipi: '${context.bodyType || 'Belirtilmemiş'}'
     * Model Ailesi: '${context.model}'
     * Donanım Paketi: '${context.trimPackage || 'Belirtilmemiş'}'
   - Classify into:
     * "COMBI_PASSENGER" if it is a 5-seater passenger combi/camlı van (e.g. Tourneo, Combi, Multispace, Tepee, Rifter, Caddy Life, Kangoo Multix). In this case:
       - seatingCapacity: 5
       - trunkCapacityLiters: Authentic catalog rear trunk volume behind 2nd row seats in Liters (~500-750 Litre). KESİNLİKLE 3000+ litre sac panelvan kargo hacmi yazılmayacaktır!
       - cargoVolumeM3: Authentic volume behind seats (~0.6-0.8 m³).
     * "CARGO_PANELVAN" if it is a 2-seater closed industrial cargo van (e.g. Transit Connect Van, Fiorino Kargo). In this case:
       - seatingCapacity: 2
       - trunkCapacityLiters: 0
       - cargoVolumeM3: Genuine rear cargo box volume (~2.8 - 3.8 m³).
   - curbWeightKg: Authentic catalog curb weight (kg).
4. EMISSIONS & DPF FIDELITY:
   - Research whether this exact model year (${vehicleYear}) and engine came with a factory DPF (Dizel Partikül Filtresi).
   - In Turkish/European market, Euro 4 commercial diesels (pre-2011, e.g. 2008 Ford 1.8 TDCi Lynx) DO NOT HAVE FACTORY DPF! (hasDpf: false). Euro 5/6 commercial diesels (2011+) have DPF (hasDpf: true). Gasoline engines NEVER have DPF (hasDpf: false).
   - DO NOT claim DPF soot clogging or DPF warning lights on vehicles without factory DPF!
5. SUSPENSION ARCHITECTURE:
   - Authentically research whether this model uses independent/helezon springs or parabolic leaf springs (makas). Do not invent leaf springs for vehicles with coil springs (e.g. Doblo Bi-Link, Transporter, Vito).
6. ENGINE & MECHANICAL ARCHITECTURE:
   ${engineArchitectureRule}
7. KULLANICI KAYNAKLI BAKIM İHMALİ KRONİK KUSUR SAYILAMAZ:
   - Yağ değişimini geciktirme, hor kullanma, debriyaj yakma, kalitesiz yakıt alma gibi her ikinci el ticari araçta olabilecek kullanıcı ihmalleri ASLA bu aracın kronik fabrikasyon kusuru sayılamaz ve puan kırılamaz. Yalnızca bu model ve motor ailesine özgü doğrulanmış fabrikasyon mühendislik zaafiyetleri (kaset triger zinciri, intercooler hortumu yırtılması, enjektör geri dönüş hattı vb.) listelenmelidir.
8. Output strict JSON only.`;

      userPrompt = `Commercial Vehicle Specification:
${filterBlock}
Base Catalog CC: ${baseCc}
Base Catalog HP: ${baseHp}
Live Web Evidence:
${liveWebSnippets}

Extract strict JSON (SIFIR İNGİLİZCE - TÜM METİNLER %100 TÜRKÇE OLMALIDIR):
{
  "displacementCc": ${baseCc},
  "powerHp": number,
  "powerRangeText": "${powerRangeText || `${baseHp} HP`}",
  "candidatePowers": ${JSON.stringify(candidatePowers)},
  "transmissionType": "string (örn: 5 İleri Manuel veya 6 İleri Manuel veya 8 İleri Otomatik EAT8)",
  "coolingType": "SIVI",
  "trunkCapacityLiters": number,
  "curbWeightKg": number,
  "topSpeedKmh": number,
  "zeroToHundredKmh": number,
  "catalogCombinedFuelL100km": number,
  "commercialDetails": {
    "generationName": "string (resmi kasa/jenerasyon adı)",
    "productionEra": "string",
    "engineFamily": "string (resmi motor ailesi/kodu)",
    "displacementCc": ${baseCc},
    "verifiedPowerOptions": ${JSON.stringify(candidatePowers)},
    "exactPowerHp": number,
    "emissionStandard": "string (katalog Euro normu: Euro 4 veya Euro 5 veya Euro 6)",
    "hasDpf": boolean,
    "hasEgr": boolean,
    "hasAdBlue": boolean,
    "manualGearboxVerified": boolean,
    "manualGearboxType": "string",
    "manualGearboxSpeeds": 5,
    "automaticGearboxVerified": false,
    "automaticGearboxType": "string",
    "automaticUnverifiedReason": "string",
    "bodyStyleClassification": "COMBI_PASSENGER | CARGO_PANELVAN",
    "seatingCapacity": number,
    "trunkCapacityLiters": number,
    "curbWeightKg": number,
    "configurationContext": {
      "rawSourceLabel": "${context.trimPackage || 'Standart'}",
      "commercialMeaning": "string",
      "cargoVolumeM3": number
    }
  },
  "commercialDutyRisks": [
    {
      "title": "string (Ağır ticari kullanım aşınma başlığı - Türkçe)",
      "risk": "string (Mekanizma ve maliyet - Türkçe)",
      "checkRecommendation": "string (Ekspertiz kontrol adımı - Türkçe)"
    }
  ],
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Modelin gerçek Türkçe arıza adı)",
      "system": "YÜRÜYEN_AKSAM | MOTOR | ŞANZIMAN | YAKIT_BESLEME | GÖVDE_TRİM",
      "scopeType": "ALL_ERA_COMMON",
      "symptoms": ["string (Türkçe somut belirti)"],
      "userExperience": "string (Türkçe kullanıcı deneyimi)",
      "testDriveCheck": "string (Türkçe test sürüşü kontrolü)",
      "inspectionCheck": "string (Ekspertiz ve usta seviyesinde somut diagnostik kontrol; örn: OBD canlı veri loglama, kaçak/basınç testi veya tolerans ölçümü. KESİNLİKLE sadece 'gözle muayene edin' yazma!)",
      "sellerQuestion": "string (Alıcının araç başında veya telefonda satıcıya doğrudan yönelteceği doğal, usta/piyasa diliyle teknik soru)",
      "costRisk": "ORTA | YUKSEK | COK_YUKSEK",
      "severity": "MODERATE | HIGH | CRITICAL",
      "confidence": 0.90
    }
  ]
};`;
    }

    const parsed = await this.callAiJson(systemPrompt, userPrompt, 4096, 25000);

    const finalCc = parsed?.displacementCc || baseCc;
    const finalHp = parsed?.powerHp || baseHp;
    const finalPowers = Array.isArray(parsed?.candidatePowers) && parsed.candidatePowers.length > 0
      ? parsed.candidatePowers
      : candidatePowers;

    let claims: CandidateClaim[] = (Array.isArray(parsed?.claims) ? parsed.claims : []).map((c: any, idx: number) => ({
      claimId: c.claimId || `CLM-${String(idx + 1).padStart(3, '0')}`,
      title: c.title || 'Teknik Kusur Analizi',
      system: c.system || 'GENEL',
      scopeType: c.scopeType || 'ALL_ERA_COMMON',
      applicableEra: c.applicableEra,
      applicableEngine: c.applicableEngine,
      applicableTransmission: c.applicableTransmission,
      symptoms: Array.isArray(c.symptoms) ? c.symptoms : [c.symptoms || 'Gözlemlenebilir teknik belirti'],
      userExperience: c.userExperience || 'Sürüşte hissedilen mekanik dengesizlik veya ses',
      testDriveCheck: c.testDriveCheck || 'Test sürüşünde sistem tepkisini ve sesleri inceleyin.',
      inspectionCheck: c.inspectionCheck || 'Yetkili ekspertiz veya uzman serviste mekanik kontrol yaptırın.',
      sellerQuestion: c.sellerQuestion || 'Bu parça en son ne zaman kontrol edildi veya değiştirildi?',
      costRisk: c.costRisk || 'ORTA',
      severity: c.severity || 'MODERATE',
      evidenceSources: Array.isArray(c.evidenceSources)
        ? c.evidenceSources
        : [{ domain: 'catalog.torquescout.com', sourceKind: 'TECHNICAL_DATABASE', excerpt: c.title || '', stance: 'SUPPORTS' }],
      confidence: typeof c.confidence === 'number' ? c.confidence : 0.88,
    }));

    // Domain FMEA Safety Baseline: Inject authentic automotive failure modes if LLM extraction returned fewer than 3 claims
    // Domain FMEA Safety: If fewer than 3 claims extracted from snippets, execute targeted master technician recovery for this exact model
    if (claims.length < 3) {
      if (isMotorcycle) {
        this.logger.log(`[AGENT 1 RECOVERY] Extracting model-specific chronic failure modes for ${context.brand} ${context.model}...`);
        const recoverySystemPrompt = `You are a Master Motorcycle Diagnostic Engineer.
Extract exactly 3 to 4 documented, genuine chronic failure modes specifically for "${context.brand} ${context.model}".
CRITICAL DIRECTIVES:
1. Ground your analysis in the ACTUAL engineering of this specific motorcycle (clutch design, cooling system, frame/mounting, electrical architecture, fuel system, final drive).
   - E.g. for Harley-Davidson Sportster: clutch spring plate (grenade plate) failure, rocker box gasket oil leaks, severe V-Twin vibration causing mount/bracket fatigue, belt drive inspection.
   - E.g. for Hyosung GV 250: oil cooler crimped hose leaks, starter clutch slipping, carburetor diaphragm tearing/synchronization, stator connector melting.
   - E.g. for Honda Shadow: shaft drive gear backlash, stator/regulator plug, carburetor intake boot cracks.
   - E.g. for Yamaha MT-07 / CP2: cam chain tensioner click, hard 1-2 shift dog engagement, rear shock rebound damping.
   - E.g. for BMW R/GS: final drive shaft play, ESA suspension seal leaks, handlebar switchgear failure.
2. DO NOT use a generic copy-paste template! Every motorcycle model MUST have its own unique, realistic mechanical failure modes.
3. Output strict JSON only matching CandidateClaim schema with claimId, title, system, symptoms, userExperience, testDriveCheck, inspectionCheck, sellerQuestion, costRisk, severity.`;

        const recoveryUserPrompt = `Motorcycle: ${context.brand} ${context.model}
Base CC: ${baseCc}, Base HP: ${baseHp}
Extract 3-4 genuine, authentic chronic failure modes for this exact model in strict JSON:
{
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Modelin gerçek Türkçe arıza adı)",
      "system": "ELEKTRİK_ŞARJ | YAKIT_BESLEME | ŞANZIMAN | YÜRÜYEN_AKSAM | MOTOR | GÖVDE_TRİM",
      "scopeType": "ALL_ERA_COMMON | ERA_SPECIFIC",
      "symptoms": ["string"],
      "userExperience": "string",
      "testDriveCheck": "string",
      "inspectionCheck": "string",
      "sellerQuestion": "string",
      "costRisk": "DUSUK | ORTA | YUKSEK | COK_YUKSEK",
      "severity": "LOW | MODERATE | HIGH | CRITICAL",
      "confidence": 0.92
    }
  ]
}`;

        try {
          const recovered = await this.callAiJson(recoverySystemPrompt, recoveryUserPrompt, 2048, 20000);
          if (Array.isArray(recovered?.claims) && recovered.claims.length >= 3) {
            claims = recovered.claims.map((c: any, idx: number) => ({
              claimId: c.claimId || `CLM-${String(idx + 1).padStart(3, '0')}`,
              title: this.sanitizeTurkishAutomotiveText(c.title || 'Mekanik Aşınma Analizi'),
              system: c.system || 'MOTOR',
              scopeType: c.scopeType || 'ALL_ERA_COMMON',
              applicableEra: c.applicableEra,
              symptoms: Array.isArray(c.symptoms) ? c.symptoms.map((s: string) => this.sanitizeTurkishAutomotiveText(s)) : [this.sanitizeTurkishAutomotiveText(c.symptoms || '')],
              userExperience: this.sanitizeTurkishAutomotiveText(c.userExperience || ''),
              testDriveCheck: this.sanitizeTurkishAutomotiveText(c.testDriveCheck || ''),
              inspectionCheck: this.sanitizeTurkishAutomotiveText(c.inspectionCheck || ''),
              sellerQuestion: this.sanitizeTurkishAutomotiveText(c.sellerQuestion || ''),
              costRisk: c.costRisk || 'ORTA',
              severity: c.severity || 'HIGH',
              evidenceSources: [{ domain: 'catalog.torquescout.com', sourceKind: 'TECHNICAL_DATABASE' as const, excerpt: c.title || '', stance: 'SUPPORTS' as const }],
              confidence: typeof c.confidence === 'number' ? c.confidence : 0.92,
            }));
          }
        } catch (recErr: any) {
          this.logger.warn(`Recovery notice: ${recErr.message}`);
        }
      } else if (isSuvPickup) {
        const focusAreas =
          'transfer case actuator, differential locks, propeller shaft universal joint / center bearing, air suspension or heavy duty off-road dampers, cooling system under towing load, turbo/DPF';

        this.logger.log(`[AGENT 1 RECOVERY] Extracting model-specific chronic failure modes for ${context.brand} ${context.model} (${context.vehicleType})...`);
        const recoverySystemPrompt = `You are a Master 4x4, SUV and Off-Road Diagnostic Specialist.
Extract exactly 3 to 4 documented, genuine chronic failure modes specifically for "${context.year || ''} ${context.brand} ${context.model}".
CRITICAL DIRECTIVES:
1. Ground your analysis in the ACTUAL mechanical engineering of this specific model (powertrain: ${context.engine || ''}, transmission: ${context.transmission || ''}, focus areas: ${focusAreas}).
2. DO NOT use generic copy-paste text! Every model MUST have authentic, realistic mechanical failure modes corresponding to its exact platform.
3. Output strict JSON only matching CandidateClaim schema with claimId, title, system, symptoms, userExperience, testDriveCheck, inspectionCheck, sellerQuestion, costRisk, severity.`;

        const recoveryUserPrompt = `Vehicle: ${context.year || ''} ${context.brand} ${context.model}
Type: ${context.vehicleType}
Engine: ${context.engine || ''}
Transmission: ${context.transmission || ''}
Extract 3-4 genuine, authentic chronic failure modes for this exact model in strict JSON:
{
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Modelin gerçek Türkçe arıza adı)",
      "system": "string",
      "scopeType": "ALL_ERA_COMMON | APPLICATION_SPECIFIC",
      "symptoms": ["string"],
      "userExperience": "string",
      "testDriveCheck": "string",
      "inspectionCheck": "string",
      "sellerQuestion": "string",
      "costRisk": "DUSUK | ORTA | YUKSEK | COK_YUKSEK",
      "severity": "LOW | MODERATE | HIGH | CRITICAL",
      "confidence": 0.92
    }
  ]
}`;

        try {
          const recovered = await this.callAiJson(recoverySystemPrompt, recoveryUserPrompt, 2048, 20000);
          if (Array.isArray(recovered?.claims) && recovered.claims.length >= 3) {
            claims = recovered.claims.map((c: any, idx: number) => ({
              claimId: c.claimId || `CLM-${String(idx + 1).padStart(3, '0')}`,
              title: this.sanitizeTurkishAutomotiveText(c.title || 'Mekanik Aşınma Analizi'),
              system: c.system || 'MEKANİK',
              scopeType: c.scopeType || 'ALL_ERA_COMMON',
              applicableEra: c.applicableEra,
              symptoms: Array.isArray(c.symptoms) ? c.symptoms.map((s: string) => this.sanitizeTurkishAutomotiveText(s)) : [this.sanitizeTurkishAutomotiveText(c.symptoms || '')],
              userExperience: this.sanitizeTurkishAutomotiveText(c.userExperience || ''),
              testDriveCheck: this.sanitizeTurkishAutomotiveText(c.testDriveCheck || ''),
              inspectionCheck: this.sanitizeTurkishAutomotiveText(c.inspectionCheck || ''),
              sellerQuestion: this.sanitizeTurkishAutomotiveText(c.sellerQuestion || ''),
              costRisk: c.costRisk || 'ORTA',
              severity: c.severity || 'HIGH',
              evidenceSources: [{ domain: 'catalog.torquescout.com', sourceKind: 'TECHNICAL_DATABASE' as const, excerpt: c.title || '', stance: 'SUPPORTS' as const }],
              confidence: typeof c.confidence === 'number' ? c.confidence : 0.92,
            }));
          }
        } catch (recErr: any) {
          this.logger.warn(`Recovery notice: ${recErr.message}`);
        }
      } else {
        // MINIVAN & PANELVAN COMMERCIAL RECOVERY
        this.logger.log(`[AGENT 1 RECOVERY] Extracting model-specific commercial failure modes for ${context.brand} ${context.model}...`);
        const normEngine = (context.engine || '').toLowerCase();
        const vehicleYear = typeof context.year === 'number' ? context.year : parseInt(String(context.year || '2015'), 10);
        const isPreEuro5 = vehicleYear > 0 && vehicleYear < 2011;
        const isGasoline = (context.fuel || '').toLowerCase().includes('benzin') || normEngine.includes('ecoboost') || normEngine.includes('puretech') || normEngine.includes('tsi');
        const isWetBelt = normEngine.includes('ecoblue') || (context.brand.toLowerCase() === 'ford' && context.engine?.includes('2.0'));
        const timingRule = isWetBelt
          ? 'Ford 2.0 EcoBlue Wet Timing Belt (Belt-in-Oil / BIO) rubber degradation contaminating engine oil, clogging the oil pump pickup strainer and causing oil pressure loss and catastrophic engine seizure.'
          : '';
        const fuelRule = isGasoline
          ? 'Fuel Type is BENZİN (Gasoline Engine). Focus on gasoline-specific failure modes (termostat kütüğü ve soğutma sıvısı sızıntıları, ateşleme bobinleri/bujiler, turbo wastegate aktüatör boşluğu, yağ kütüğü sızıntısı). KESİNLİKLE dizel partikül filtresi (DPF), AdBlue veya dizel EGR soğutucu kurum tıkanması iddia edilemez!'
          : isPreEuro5
          ? `Fuel Type is EURO 4 DİZEL (${vehicleYear} model - NO DPF / FABRİKASYON DPF YOKTUR). Bu araçta fabrikasyon DPF (Dizel Partikül Filtresi) kesinlikle bulunmaz! DPF kurum doluluğu, DPF tıkanması veya DPF arıza lambası KESİNLİKLE İDDİA EDİLEMEZ (puan kırılamaz). Arızalar: Enjektör geri dönüş hattı sızıntıları, turboşarj intercooler basınç hortumu yırtılması, EGR valfi mekanik kurum tıkanması, alt kaset triger/zincir aşınması ve çift kütleli volan olmalıdır.`
          : 'Fuel Type is DİZEL (Diesel Engine). Focus on authentic diesel failure modes (enjektör geri dönüş hattı sızıntıları, turboşarj intercooler basınç hortumu yırtılması, DPF kurum doluluğu, EGR valfi ve soğutucusu).';

        const recoverySystemPrompt = `You are a Master Commercial Fleet Diagnostic Specialist.
Extract exactly 3 to 4 documented, authentic chronic failure modes specifically for "${context.year || ''} ${context.brand} ${context.model}".
CRITICAL DIRECTIVES:
1. STRICT TURKISH LANGUAGE MANDATE (SIFIR İNGİLİZCE KURALI):
   All titles, symptoms, user experiences, test drive checks, inspection checks, and seller questions MUST BE 100% IN TURKISH automotive terminology. Zero English allowed!
   - Use authentic Turkish terminology (e.g. Aşınma, Kaçak, Boşluk, Gevşeme, Tıkanma, Sızıntı, Yırtılma).
2. Ground your analysis in the ACTUAL platform engineering of "${context.year || ''} ${context.brand} ${context.model}" (Engine: ${context.engine || `${baseCc} cc`}).
3. Suspension Accuracy: Investigate authentic rear suspension (coil vs leaf springs) for this exact vehicle platform.
4. Engine & Fuel Accuracy: ${timingRule || fuelRule}
5. System Categorization:
   - Sürgülü kapı / ray / rulman / kilit / gövde parçaları -> GÖVDE_TRİM
   - Motor / turbo / soğutma / enjektör -> MOTOR
   - Şanzıman / debriyaj / volan -> ŞANZIMAN
   - Alt takım / helezon yay / makas -> YÜRÜYEN_AKSAM
6. DO NOT use generic copy-paste text! Output 3-4 genuine, authentic chronic failure modes corresponding to its exact platform.
7. Output strict JSON only.`;

        const recoveryUserPrompt = `Commercial Vehicle: ${context.year || ''} ${context.brand} ${context.model}
Engine: ${context.engine || `${baseCc} cc`}
Fuel: ${isGasoline ? 'Benzin' : (context.fuel || 'Dizel')}
Configuration: ${context.trimPackage || 'Standart'}
Extract 3-4 genuine, authentic chronic failure modes for this exact model in strict JSON (SIFIR İNGİLİZCE - TÜM METİNLER %100 TÜRKÇE):
{
  "claims": [
    {
      "claimId": "CLM-001",
      "title": "string (Modelin gerçek Türkçe arıza adı)",
      "system": "GÖVDE_TRİM | MOTOR | ŞANZIMAN | YÜRÜYEN_AKSAM",
      "scopeType": "ALL_ERA_COMMON | APPLICATION_SPECIFIC",
      "symptoms": ["string (Türkçe somut belirti)"],
      "userExperience": "string (Türkçe kullanıcı tecrübesi)",
      "testDriveCheck": "string (Türkçe test sürüşü adımı)",
      "inspectionCheck": "string (Türkçe ekspertiz kontrol adımı)",
      "sellerQuestion": "string (Türkçe satıcı sorusu)",
      "costRisk": "DUSUK | ORTA | YUKSEK | COK_YUKSEK",
      "severity": "LOW | MODERATE | HIGH | CRITICAL",
      "confidence": 0.92
    }
  ]
}`;

        try {
          const recovered = await this.callAiJson(recoverySystemPrompt, recoveryUserPrompt, 2048, 20000);
          if (Array.isArray(recovered?.claims) && recovered.claims.length >= 3) {
            claims = recovered.claims.map((c: any, idx: number) => ({
              claimId: c.claimId || `CLM-${String(idx + 1).padStart(3, '0')}`,
              title: this.sanitizeTurkishAutomotiveText(c.title || 'Mekanik Aşınma Analizi'),
              system: c.system || 'MEKANİK',
              scopeType: c.scopeType || 'ALL_ERA_COMMON',
              applicableEra: c.applicableEra,
              symptoms: Array.isArray(c.symptoms) ? c.symptoms.map((s: string) => this.sanitizeTurkishAutomotiveText(s)) : [this.sanitizeTurkishAutomotiveText(c.symptoms || '')],
              userExperience: this.sanitizeTurkishAutomotiveText(c.userExperience || ''),
              testDriveCheck: this.sanitizeTurkishAutomotiveText(c.testDriveCheck || ''),
              inspectionCheck: this.sanitizeTurkishAutomotiveText(c.inspectionCheck || ''),
              sellerQuestion: this.sanitizeTurkishAutomotiveText(c.sellerQuestion || ''),
              costRisk: c.costRisk || 'ORTA',
              severity: c.severity || 'HIGH',
              evidenceSources: [{ domain: 'catalog.torquescout.com', sourceKind: 'TECHNICAL_DATABASE' as const, excerpt: c.title || '', stance: 'SUPPORTS' as const }],
              confidence: typeof c.confidence === 'number' ? c.confidence : 0.92,
            }));
          }
        } catch (recErr: any) {
          this.logger.warn(`Recovery notice: ${recErr.message}`);
        }
      }
    }

    const rawTrunk =
      typeof parsed?.trunkCapacityLiters === 'number' && parsed.trunkCapacityLiters > 0
        ? parsed.trunkCapacityLiters
        : typeof parsed?.commercialDetails?.trunkCapacityLiters === 'number' && parsed.commercialDetails.trunkCapacityLiters > 0
        ? parsed.commercialDetails.trunkCapacityLiters
        : undefined;

    const rawWeight =
      typeof parsed?.curbWeightKg === 'number' && parsed.curbWeightKg > 0
        ? parsed.curbWeightKg
        : typeof parsed?.commercialDetails?.curbWeightKg === 'number' && parsed.commercialDetails.curbWeightKg > 0
        ? parsed.commercialDetails.curbWeightKg
        : undefined;

    return {
      vehicleType: context.vehicleType,
      brand: context.brand,
      model: context.model,
      displacementCc: finalCc,
      powerHp: finalHp,
      powerRangeText: parsed?.powerRangeText || powerRangeText,
      candidatePowers: finalPowers,
      transmissionType: parsed?.transmissionType || parsed?.motorcycleEras?.[0]?.transmission || (parsed?.commercialDetails?.automaticGearboxVerified ? parsed.commercialDetails.automaticGearboxType : parsed?.commercialDetails?.manualGearboxType),
      coolingType: parsed?.coolingType || parsed?.motorcycleEras?.[0]?.cooling || (context.vehicleType === 'MOTORCYCLE' ? 'HAVA' : 'SIVI'),
      trunkCapacityLiters: rawTrunk,
      curbWeightKg: rawWeight,
      topSpeedKmh: typeof parsed?.topSpeedKmh === 'number' && parsed.topSpeedKmh > 0 ? parsed.topSpeedKmh : undefined,
      zeroToHundredKmh: typeof parsed?.zeroToHundredKmh === 'number' && parsed.zeroToHundredKmh > 0 ? parsed.zeroToHundredKmh : undefined,
      catalogCombinedFuelL100km: typeof parsed?.catalogCombinedFuelL100km === 'number' && parsed.catalogCombinedFuelL100km > 0 ? parsed.catalogCombinedFuelL100km : undefined,
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
    const vehicleYear = typeof context.year === 'number' ? context.year : parseInt(String(context.year || '2015'), 10);
    const filterBlock = this.format8FilterBlock(context);
    const systemPrompt = `You are TorqueScout Agent 2: Adversarial Red Team Technical Validator.
Your role is to rigorously AUDIT and VALIDATE claims produced by Agent 1 based STRICTLY on the vehicle filters provided in the context:
${filterBlock}

If a claim is technically accurate and genuinely applies to this specific vehicle, model year, engine, and trim, mark its stance as "CONFIRM".
Only mark "CONTRADICT" or "NARROW" if the claim is false, inaccurate, inapplicable (e.g. diesel claim on gasoline, commercial claim on automobile), or carried over from another sister platform.

CRITICAL DIRECTIVES:
1. ZERO SISTER-MODEL CONTAMINATION (SIFIR ÇAPRAZ MODEL KARIŞIKLIĞI):
   - Check if Agent 1 brought in horsepower or specs from sister models sharing the same motor block (e.g. Peugeot 508, DS7, C5 Aircross 180 HP confused with DS9 225 HP, or Focus 120 HP confused with Courier 75 HP).
   - If so, IMMEDIATELY REFUTE IT: set "powerRefuted": true, "correctedPowerHp": <authentic catalog HP for this exact model, year, and trim>, and explain the sister model confusion in "powerRefutedReason".
2. FUEL SYSTEM & POWERTRAIN ACCURACY:
   - If the vehicle is fuel-injected (EFI) or modern post-2015, CONTRADICT any claims mentioning carburetor ("karbüratör", "karbüratör diyaframı", "karbüratör temizliği"). It uses electronic fuel injection (EFI), so fuel issues must target injectors, fuel pump pressure, or throttle body/TPS.
   - If the vehicle is a classic vintage carburetor model, contradict any EFI claims.
   - If the vehicle uses a BENZİN (Gasoline) engine, immediately CONTRADICT any diesel-specific claims (enjektör geri dönüş hattı sızıntısı, mazot kaçağı, DPF soot clogging, AdBlue, diesel EGR cooler soot clogging, etc.).
   - If the vehicle is NATURALLY ASPIRATED (Atmosferik, turbo yok), immediately CONTRADICT any turbocharger claims (turbo hortumu yırtılması, turbo boost kaybı, intercooler).
   - If the vehicle is SUBARU, engine is strictly BOXER and drivetrain is Symmetrical AWD. Immediately CONTRADICT any commercial van terms like "triger kaseti" (kaset triger Ford Connect'e aittir, Subaru'da yoktur).
   - If the vehicle is a PRE-2011 EURO 4 DIESEL (e.g. 2008 Ford Tourneo Connect 1.8 TDCi, 2006 Fiat Doblo 1.3 Multijet Euro 4), it DOES NOT HAVE A FACTORY DPF (Dizel Partikül Filtresi)! Immediately CONTRADICT any claim about DPF ("DPF kurum doluluğu", "partikül filtresi", "DPF rejenerasyonu", "DPF arıza ışığı") with stance: "CONTRADICT" and reason: "${context.year || ''} model Euro 4 dizel araçlarda fabrikasyon DPF bulunmaz; arıza geçersizdir."
   - If the vehicle uses a DİZEL (Diesel) engine, contradict gasoline ignition coil/spark plug claims.
3. BRAKING & CHASSIS ACCURACY:
   - If the vehicle has drum brakes (Ön Disk Arka Kampana), contradict any ABS claims.
   - If the vehicle uses coil springs / independent suspension, contradict rear leaf spring (makas / yaprak yay) fatigue claims.
   - If the vehicle has leaf springs, contradict independent multi-link suspension claims.
4. TRANSMISSION GROUNDING & CROSS-AUDIT:
   - Audit the transmission claimed by Agent 1 (${agent1.transmissionType || 'Belirtilmemiş'}).
   - If the vehicle is a SCOOTER or CVT commuter, contradict any manual gearbox, clutch cable, or gear dog claims, and set "correctedTransmissionType": "Otomatik (CVT)".
   - If the vehicle is manual only, contradict false automatic claims.
   - If user/context selected Automatic but Agent 1 claimed manual only, refute it and set "correctedTransmissionType" to the genuine factory automatic architecture.
5. COOLING FIDELITY (HAVA VS SIVI SOĞUTMA):
   - Audit the cooling architecture claimed by Agent 1 (${agent1.coolingType || 'SIVI'}).
   - If the vehicle is AIR-COOLED (Hava Soğutmalı, including small displacement scooters/mopeds or classic cruisers):
     Immediately CONTRADICT any claims mentioning "radyatör", "antifriz", "termostat", "soğutma sıvısı kaçağı", "su pompası", "genleşme kabı". Set stance to "CONTRADICT", explain that the engine is air-cooled, and set "correctedCoolingType": "HAVA".
6. CROSS-CATEGORY CONTAMINATION BAN:
   - If the vehicle is a PASSENGER AUTOMOBILE or MOTORCYCLE:
     Immediately CONTRADICT any claims mentioning "sürgülü kapı", "kargo yükleme eşiği", "palet", "esnaf/filo". Set stance to "CONTRADICT" and explain that these are commercial van claims inapplicable to this vehicle.
7. ENGINE POWER & TRIM ACCURACY:
   - Audit claimed engine displacement (${agent1.displacementCc} cc) and power (${agent1.powerHp} HP) against the official catalog for this model, year, and TRIM (${context.trimPackage || 'Genel'}).
   - DO NOT hallucinate cross-model engine power! (e.g. DS Automobiles DS9 1.6 PureTech petrol is strictly 225 HP, NOT 180 HP; Ford Courier 1.5 TDCi Delux is strictly 75 HP, NOT 120 HP).
   - If Agent 1's power does not match genuine factory catalog metrics for this trim, set "powerRefuted": true, "correctedPowerHp": <authentic HP>, and explain in "powerRefutedReason".
8. ZERO COMPETITOR COMPARISONS:
   - Flag any competitor brand or model comparisons for immediate deletion.
9. TIMELINE INTEGRITY (MOTORCYCLE):
   - For modern models introduced post-2015, CONTRADICT any fake pre-2018 or 2010 carburetor era claims!
10. LUGGAGE & CARGO VOLUME AUDIT:
    - If the vehicle is a 5-seater passenger combi (e.g. Tourneo Connect, Doblo Combi, Caddy Life, Kangoo Multix, Rifter, Berlingo) or passenger automobile:
      It CANNOT have 3000+ liters cargo panelvan volume! The trunk behind seats is authentic passenger luggage volume (~500-750 Liters).
      If Agent 1 claimed >1500 liters for a passenger/combi vehicle or 0 liters, set "trunkCapacityRefuted": true, "correctedTrunkCapacityLiters": <authentic Liters>, "cargoVolumeRefuted": true, "correctedCargoVolumeM3": <authentic m³, ~0.6-0.8 m³>, and explain in "trunkCapacityRefutedReason".
    - If the vehicle is a 2-seater closed panelvan (Kargo / Van):
      "trunkCapacityLiters" is 0, and cargo box volume is ~2.8 - 4.2 m³.
11. EMISSIONS & DPF AUDIT:
    - If this model year (${vehicleYear}) and engine is Euro 4 diesel (pre-2011) or gasoline:
      Factory DPF DOES NOT EXIST! If Agent 1 claimed DPF (dizel partikül filtresi) issues, set "dpfRefuted": true, "dpfRefutedReason": "Euro 4 / benzinli araçta fabrikasyon DPF bulunmaz".
12. USER NEGLECT AUDIT (KULLANICI İHMALİ DENETİMİ):
    - Audit claims to ensure they represent authentic engineering/design failure modes of this specific model, not ordinary user maintenance neglect.
    - If a claim describes general user neglect (e.g. periyodik yağ değişimini geciktirme, kalitesiz yakıt alma, debriyaj yakma, hor kullanma, rutin balata aşınması) that could happen to any car:
      Immediately CONTRADICT the claim with stance: "CONTRADICT" and explain: "Kullanıcı kaynaklı bakım ihmalleri ve rutin aşınmalar aracın kronik kusuru sayılamaz ve puan kırılamaz."
Output STRICT JSON:
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
  "correctedTransmissionType": string,
  "correctedAutomaticGearboxType": string,
  "coolingRefuted": boolean,
  "coolingRefutedReason": string,
  "correctedCoolingType": string,
  "gearboxSpeedRefuted": boolean,
  "gearboxSpeedRefutedReason": string,
  "powerRefuted": boolean,
  "powerRefutedReason": string,
  "correctedPowerHp": number,
  "powerDiscrepancies": string[],
  "trunkCapacityRefuted": boolean,
  "trunkCapacityRefutedReason": string,
  "correctedTrunkCapacityLiters": number,
  "cargoVolumeRefuted": boolean,
  "cargoVolumeRefutedReason": string,
  "correctedCargoVolumeM3": number,
  "dpfRefuted": boolean,
  "dpfRefutedReason": string
}`;

    const userPrompt = `Target Vehicle Specification:
${filterBlock}
Claimed by Agent 1:
- Displacement: ${agent1.displacementCc} cc
- Power: ${agent1.powerHp} HP
- Transmission: ${agent1.transmissionType || 'Belirtilmemiş'}
- Cooling: ${agent1.coolingType || 'SIVI'}
${agent1.trunkCapacityLiters ? `- Trunk Capacity: ${agent1.trunkCapacityLiters} Liters` : ''}
${agent1.curbWeightKg ? `- Curb Weight: ${agent1.curbWeightKg} kg` : ''}
${agent1.commercialDetails ? `Commercial Details:\n${JSON.stringify(agent1.commercialDetails, null, 2)}` : ''}
${agent1.motorcycleEras ? `Motorcycle Eras:\n${JSON.stringify(agent1.motorcycleEras, null, 2)}` : ''}
Claims by Agent 1:
${JSON.stringify(
  agent1.claims.map((c) => ({
    claimId: c.claimId,
    title: c.title,
    system: c.system,
    scopeType: c.scopeType,
    applicableEra: c.applicableEra,
  })),
  null,
  2,
)}
Perform adversarial red-team audit. Output strict JSON.`;

    const parsed = await this.callAiJson(systemPrompt, userPrompt, 2048, 15000);

    const challenges: Agent2RedTeamChallenge[] = Array.isArray(parsed?.challenges)
      ? parsed.challenges
      : agent1.claims.map((c) => ({
          claimId: c.claimId,
          stance: 'CONFIRM' as const,
          reason: 'Doğrulandı',
        }));

    const normTrim = (context.trimPackage || '').toLowerCase();
    const contextTrans = (context.transmission || '').toLowerCase();
    const trimClaimsAuto = normTrim.includes('otomatik') || normTrim.includes('automatic') || contextTrans.includes('otomatik');
    const hasAuto = Boolean(trimClaimsAuto || agent1.commercialDetails?.automaticGearboxVerified);

    return {
      challenges,
      transmissionRefuted: Boolean(parsed?.transmissionRefuted) && !hasAuto,
      transmissionRefutedReason: parsed?.transmissionRefutedReason,
      correctedTransmissionType: parsed?.correctedTransmissionType || parsed?.correctedAutomaticGearboxType || undefined,
      correctedAutomaticGearboxType: parsed?.correctedAutomaticGearboxType || parsed?.correctedTransmissionType || undefined,
      coolingRefuted: Boolean(parsed?.coolingRefuted),
      coolingRefutedReason: parsed?.coolingRefutedReason,
      correctedCoolingType: parsed?.correctedCoolingType || undefined,
      gearboxSpeedRefuted: Boolean(parsed?.gearboxSpeedRefuted),
      gearboxSpeedRefutedReason: parsed?.gearboxSpeedRefutedReason,
      powerRefuted: Boolean(parsed?.powerRefuted),
      powerRefutedReason: parsed?.powerRefutedReason,
      correctedPowerHp: typeof parsed?.correctedPowerHp === 'number' && parsed.correctedPowerHp > 0 ? parsed.correctedPowerHp : undefined,
      powerDiscrepancies: Array.isArray(parsed?.powerDiscrepancies) ? parsed.powerDiscrepancies : [],
      trunkCapacityRefuted: Boolean(parsed?.trunkCapacityRefuted),
      trunkCapacityRefutedReason: parsed?.trunkCapacityRefutedReason,
      correctedTrunkCapacityLiters: typeof parsed?.correctedTrunkCapacityLiters === 'number' && parsed.correctedTrunkCapacityLiters > 0 ? parsed.correctedTrunkCapacityLiters : undefined,
      cargoVolumeRefuted: Boolean(parsed?.cargoVolumeRefuted),
      cargoVolumeRefutedReason: parsed?.cargoVolumeRefutedReason,
      correctedCargoVolumeM3: typeof parsed?.correctedCargoVolumeM3 === 'number' && parsed.correctedCargoVolumeM3 > 0 ? parsed.correctedCargoVolumeM3 : undefined,
      dpfRefuted: Boolean(parsed?.dpfRefuted),
      dpfRefutedReason: parsed?.dpfRefutedReason,
    };
  }

  /**
   * Agent 3: Judge / Final Fact Validation Agent
   */
  private runAgent3Judge(
    context: MultiVehicleResearchContext,
    agent1: Agent1Output,
    agent2: Agent2Output,
  ): Agent3Output {
    const challengeMap = new Map<string, Agent2RedTeamChallenge>();
    for (const ch of agent2.challenges) {
      challengeMap.set(ch.claimId, ch);
    }

    const adjudicatedFacts: AdjudicatedFact[] = [];
    const approvedFactsOnly: CandidateClaim[] = [];

    const vehicleYear = typeof context.year === 'number' ? context.year : parseInt(String(context.year || '2015'), 10);
    const isGasoline = (context.fuel || '').toLowerCase().includes('benzin') || (context.engine || '').toLowerCase().includes('puretech') || (context.engine || '').toLowerCase().includes('tsi');
    const isPreEuro5 = vehicleYear > 0 && vehicleYear < 2011;

    for (const claim of agent1.claims) {
      const claimTitle = (claim.title || '').toLowerCase();
      const claimDesc = `${claimTitle} ${(claim.symptoms || []).join(' ')} ${claim.userExperience || ''}`.toLowerCase();
      const isDpfClaim = claimDesc.includes('dpf') || claimDesc.includes('partikül filtresi') || claimDesc.includes('dizel partikül');

      if (isDpfClaim && (isGasoline || isPreEuro5)) {
        adjudicatedFacts.push({
          claim,
          status: 'REJECTED',
          adjudicationReason: isGasoline
            ? 'Benzinli araçlarda dizel partikül filtresi (DPF) bulunmaz.'
            : `${vehicleYear} model Euro 4 dizel araçlarda fabrikasyon DPF (Dizel Partikül Filtresi) bulunmamaktadır; DPF arızası iddia edilemez.`,
        });
        continue;
      }

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

    let finalTransmissionType = agent2.correctedTransmissionType || agent1.transmissionType || context.transmission;
    if (!finalTransmissionType || finalTransmissionType.includes('Mevcut Değil') || finalTransmissionType.includes('Sadece Manuel')) {
      if (context.vehicleType === 'MOTORCYCLE') {
        finalTransmissionType = agent1.motorcycleEras?.[0]?.transmission || 'Otomatik (CVT)';
      } else if (context.vehicleType === 'MINIVAN_PANELVAN') {
        finalTransmissionType = agent1.commercialDetails?.manualGearboxType || '5 İleri Manuel';
      } else {
        finalTransmissionType = 'Manuel';
      }
    }

    let finalCoolingType = agent2.correctedCoolingType || agent1.coolingType;
    if (!finalCoolingType) {
      finalCoolingType = agent1.motorcycleEras?.[0]?.cooling || (context.vehicleType === 'MOTORCYCLE' ? 'HAVA' : 'SIVI');
    }

    if (agent1.commercialDetails) {
      if (agent2.correctedAutomaticGearboxType) {
        agent1.commercialDetails.automaticGearboxVerified = true;
        agent1.commercialDetails.automaticGearboxType = agent2.correctedAutomaticGearboxType;
      }
      if (agent2.gearboxSpeedRefuted && agent2.gearboxSpeedRefutedReason) {
        if (agent2.gearboxSpeedRefutedReason.includes('5')) {
          agent1.commercialDetails.manualGearboxType = '5 İleri Manuel';
          agent1.commercialDetails.manualGearboxSpeeds = 5;
        } else if (agent2.gearboxSpeedRefutedReason.includes('6')) {
          agent1.commercialDetails.manualGearboxType = '6 İleri Manuel';
          agent1.commercialDetails.manualGearboxSpeeds = 6;
        }
      }
    }

    let finalPowerHp = agent1.powerHp;
    let finalPowerRangeText = agent1.powerRangeText;
    let candidatePowers = agent1.candidatePowers || [agent1.powerHp];

    if (agent2.powerRefuted && agent2.correctedPowerHp && agent2.correctedPowerHp > 0) {
      this.logger.warn(
        `[AGENT 3 ADJUDICATION] Overriding refuted power (${agent1.powerHp} HP -> ${agent2.correctedPowerHp} HP): ${agent2.powerRefutedReason}`,
      );
      finalPowerHp = agent2.correctedPowerHp;
      finalPowerRangeText = `${finalPowerHp} HP`;
      if (!candidatePowers.includes(finalPowerHp)) {
        candidatePowers = [finalPowerHp, ...candidatePowers];
      }
      if (agent1.commercialDetails) {
        agent1.commercialDetails.exactPowerHp = finalPowerHp;
      }
    }

    let finalApprovedFacts = approvedFactsOnly;
    if (finalCoolingType === 'HAVA') {
      finalApprovedFacts = finalApprovedFacts.filter((fact) => {
        const text = `${fact.title} ${(fact.symptoms || []).join(' ')} ${fact.userExperience || ''} ${fact.testDriveCheck || ''} ${fact.inspectionCheck || ''}`.toLowerCase();
        return !/radyatör|antifriz|termostat|soğutma sıvısı|su pompası|genleşme kabı/i.test(text);
      });
    }
    if (finalTransmissionType.toLowerCase().includes('cvt')) {
      finalApprovedFacts = finalApprovedFacts.filter((fact) => {
        const text = `${fact.title} ${(fact.symptoms || []).join(' ')} ${fact.userExperience || ''} ${fact.testDriveCheck || ''} ${fact.inspectionCheck || ''}`.toLowerCase();
        return !/şanzıman dişlisi|vites geçişi|debriyaj teli|2\. vites|vites hilali|senkromeç/i.test(text);
      });
    }
    const isEfiOnly = context.vehicleType === 'MOTORCYCLE' && agent1.motorcycleEras && agent1.motorcycleEras.length > 0 && agent1.motorcycleEras.every((e: any) => e.fuelSystem === 'EFI');
    if (isEfiOnly) {
      finalApprovedFacts = finalApprovedFacts.filter((fact) => {
        const text = `${fact.title} ${(fact.symptoms || []).join(' ')} ${fact.userExperience || ''} ${fact.testDriveCheck || ''} ${fact.inspectionCheck || ''}`.toLowerCase();
        return !/karb[üu]rat[öo]r/i.test(text);
      });
    }

    const totalPenalty = finalApprovedFacts.reduce((sum, fact) => {
      const penalty = fact.severity === 'CRITICAL' ? 10 : fact.severity === 'HIGH' ? 7 : fact.severity === 'MODERATE' ? 4 : 2;
      return sum + penalty;
    }, 0);

    const baseScore = 96;
    let decisionScore = Math.max(50, Math.min(96, baseScore - totalPenalty));

    const technicalRiskLevel: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK' =
      decisionScore >= 80 ? 'DUSUK' : decisionScore >= 70 ? 'ORTA' : decisionScore >= 60 ? 'YUKSEK' : 'KRITIK';

    const decisionRationale =
      agent1.vehicleType === 'MOTORCYCLE'
        ? `Model ailesi üretim dönemleri ve kronik mekanik eğilimleri haritalandı. ${finalApprovedFacts.length} adet doğrulanmış teknik iddia üzerinden değerlendirildi.`
        : `Seçilen konfigürasyon kapsamında ${finalApprovedFacts.length} adet doğrulanmış teknik ve yıpranma kriteri üzerinden sentezlendi.`;

    const finalTrunkCapacityLiters =
      agent2.trunkCapacityRefuted && typeof agent2.correctedTrunkCapacityLiters === 'number' && agent2.correctedTrunkCapacityLiters > 0
        ? agent2.correctedTrunkCapacityLiters
        : typeof agent1.trunkCapacityLiters === 'number' && agent1.trunkCapacityLiters > 0
        ? agent1.trunkCapacityLiters
        : typeof agent1.commercialDetails?.trunkCapacityLiters === 'number' && agent1.commercialDetails.trunkCapacityLiters > 0
        ? agent1.commercialDetails.trunkCapacityLiters
        : undefined;

    const finalCargoVolumeM3 =
      agent2.cargoVolumeRefuted && typeof agent2.correctedCargoVolumeM3 === 'number' && agent2.correctedCargoVolumeM3 > 0
        ? agent2.correctedCargoVolumeM3
        : typeof agent1.commercialDetails?.configurationContext?.cargoVolumeM3 === 'number' && agent1.commercialDetails.configurationContext.cargoVolumeM3 > 0
        ? agent1.commercialDetails.configurationContext.cargoVolumeM3
        : undefined;

    const finalCurbWeightKg =
      typeof agent1.curbWeightKg === 'number' && agent1.curbWeightKg > 0
        ? agent1.curbWeightKg
        : typeof agent1.commercialDetails?.curbWeightKg === 'number' && agent1.commercialDetails.curbWeightKg > 0
        ? agent1.commercialDetails.curbWeightKg
        : undefined;

    const finalTopSpeedKmh = typeof agent1.topSpeedKmh === 'number' && agent1.topSpeedKmh > 0 ? agent1.topSpeedKmh : undefined;
    const finalZeroToHundredKmh = typeof agent1.zeroToHundredKmh === 'number' && agent1.zeroToHundredKmh > 0 ? agent1.zeroToHundredKmh : undefined;
    const finalCombinedFuelL100km = typeof agent1.catalogCombinedFuelL100km === 'number' && agent1.catalogCombinedFuelL100km > 0 ? agent1.catalogCombinedFuelL100km : undefined;

    return {
      vehicleType: agent1.vehicleType,
      adjudicatedFacts,
      approvedFactsOnly: finalApprovedFacts,
      finalDisplacementCc: agent1.displacementCc,
      finalPowerHp,
      finalPowerRangeText,
      candidatePowers,
      finalTransmissionType,
      finalCoolingType,
      finalTrunkCapacityLiters,
      finalCargoVolumeM3,
      finalCurbWeightKg,
      finalTopSpeedKmh,
      finalZeroToHundredKmh,
      finalCombinedFuelL100km,
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
   * Produces deep, multi-paragraph automotive journalism text matching the Automobile standard.
   */
  private async runClosedReportWriter(
    context: MultiVehicleResearchContext,
    judge: Agent3Output,
  ): Promise<any> {
    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';
    const isSuvPickup = context.vehicleType === 'SUV_PICKUP';
    const isAutomobile = context.vehicleType === 'AUTOMOBILE';
    const isCommercial = context.vehicleType === 'MINIVAN_PANELVAN';

    const canonicalMotoTransmission = judge.finalTransmissionType;
    const isAirCooled = judge.finalCoolingType === 'HAVA';
    const isScooter = canonicalMotoTransmission.toLowerCase().includes('cvt');

    let vehicleMandates = '';
    if (isMotorcycle) {
      vehicleMandates = `9. MOTORCYCLE INTEGRITY MANDATES (KESİNLİKLE TİCARİ ARAÇ VE OTOMOBİL TERİMLERİ KULLANILAMAZ):
   a) ABSOLUTE BAN ON CAR & MINIVAN TERMS (SIFIR TİCARİ/BİNEK TERİMİ):
      - KESİNLİKLE "sürgülü kapı", "yükleme eşiği", "yüksek tavanlı otopark", "kabin", "arka koltuk", "bagaj kapağı", "filo ve esnaf", "palet" GİBİ BİNEK/TİCARİ ARAÇ TERİMLERİ KULLANILAMAZ!
      - Bu bir MOTOSİKLETTİR. Motosiklet terminolojisi kullanılmalıdır (sele, gidon açısı, ayak koyma platformu, sele altı kask gözü, şasi geometrisi, amortisör, varyatör vb.).
   b) TRANSMISSION FIDELITY (${isScooter ? 'OTOMATİK CVT VARYATÖR' : 'MANUEL VİTES'}):
      - ${isScooter ? 'Bu araç bir SCOOTER / MOPED olup Otomatik (CVT) aktarmaya sahiptir. KESİNLİKLE "vites geçişi", "vites dişlisi", "debriyaj pedalı", "senkromeç", "5 ileri manuel" YAZILAMAZ! Kesintisiz CVT ivmelenmesi, varyatör kayışı ve santrifüj debriyaj balatası davranışı anlatılmalıdır.' : 'Bu araç manuel vitesli bir motosiklettir. Vites geçiş kemikliliği, debriyaj kolu hissiyatı ve vites oranları analiz edilmelidir.'}
   c) COOLING SYSTEM FIDELITY (${isAirCooled ? 'HAVA SOĞUTMALI - RADYATÖR VE ANTİFRİZ KESİNLİKLE YOKTUR' : 'SIVI SOĞUTMALI'}):
      - ${isAirCooled ? 'Bu motor HAVA SOĞUTMALIDIR (Hava Soğutmalı / Fanlı Tek Silindir). KESİNLİKLE "radyatör", "antifriz", "termostat", "soğutma sıvısı kaçağı", "genleşme kabı" YAZILAMAZ! Aşırı ısınma durumunda yalnızca silindir soğutma kanatçıklarının temizliği ve motor yağı viskozitesi değerlendirilebilir.' : 'Bu motor sıvı soğutmalıdır; radyatör petekleri ve soğutma sıvısı seviyesi değerlendirilebilir.'}
   d) "vehicleOverview" TAM 3 BAĞIMSIZ PARAGRAF (MOTOSİKLET DİSİPLİNİ):
      - vehicleOverview KESİNLİKLE çift satır boşluğu (\\n\\n) ile ayrılmış TAM 3 BAĞIMSIZ PARAGRAF olmalıdır:
        1. Paragraf: Motosikletin gövde ve şasi geometrisi, gidon açısı, sürüş ergonomisi (dik oturuş / ayak koyma alanı / sele konforu / sele altı kask depolama) ve şehir içi sıkışık trafik manevra kabiliyeti.
        2. Paragraf: ${judge.finalDisplacementCc} cc motor ünitesinin ${judge.finalPowerHp} HP güç teslimatı, gaz kolu tepkisi, ${isScooter ? 'otomatik CVT varyatör aktarmasının pürüzsüz kalkış karakteri' : 'vites oranları ve debriyaj hissiyatı'} ile şehir içi sürüş dinamiği.
        3. Paragraf: Grenaj ve plastik malzeme kalitesi, titreşim sönümleme, boya/şasi dayanıklılığı ve modelin Türkiye motosiklet pazarındaki kullanıcı kitlesi ve yeri.
   e) REALISTIC ACCELERATION & HIGHWAY PROFILE:
      - Küçük hacimli modellerde maksimum sürat 45-75 km/s seviyesindedir. Otoyolda süratli seyir gibi gerçek dışı iddialar yazılamaz; çevre yollarında sağ şerit dinamikleri gerçekçi aktarılmalıdır.`;
    } else if (isSuvPickup) {
      vehicleMandates = `9. SUV & PICKUP INTEGRITY MANDATES:
   a) 4x4 / AWD aktarma organı, diferansiyel kilidi ve arazi şanzımanı kontrolleri.
   b) Şasi rijitliği, salıncak ve süspansiyon burç dayanıklılığı.
   c) Şehir içi ve arazi sürüş dengesi.`;
    } else if (isAutomobile) {
      vehicleMandates = `9. PASSENGER AUTOMOBILE INTEGRITY MANDATES (BİNEK OTOMOBİL GÖVDE VE SÜRÜŞ STANDARTLARI):
   a) SIFIR TİCARİ ARAÇ TERİMİ:
      - KESİNLİKLE "sürgülü kapı", "kargo yükleme eşiği", "palet", "esnaf/filo", "ticari kullanım" GİBİ TERİMLER KULLANILAMAZ!
      - Bu bir BİNEK OTOMOBİLDİR (Sedan, Hatchback, Station Wagon, Coupe).
   b) "vehicleOverview" TAM 3 BAĞIMSIZ PARAGRAF:
      1. Paragraf: Aracın şasi yapısı, gövde rijitliği, kabin ergonomisi, koltuk konforu, direksiyon hissiyatı ve binek bagaj kullanışlılığı.
      2. Paragraf: ${judge.finalDisplacementCc} cc motor ünitesinin ${judge.finalPowerHp} HP güç ve tork teslimatı, şanzıman uyumu (${judge.finalTransmissionType}), otoyol seyir kararlılığı ve şehir içi sürüş hissiyatı.
      3. Paragraf: Malzeme kalitesi, kabin ses yalıtımı (NVH izolasyonu), trim işçiliği ve Türkiye binek otomobil pazarındaki yeri.`;
    } else {
      vehicleMandates = `9. MINIVAN & COMMERCIAL VEHICLE INTEGRITY MANDATES:
   a) TRANSMISSION FACTUAL ACCURACY:
      - Rapor başlığında ve filtrede belirtilen şanzıman (${judge.finalTransmissionType}) metin gövdesiyle BİREBİR AYNI OLMAK ZORUNDADIR!
   b) ZERO PALLET / CARGO ILLUSION ON COMBI VEHICLES:
      - 5 kişilik binek/kombi versiyonlarda KESİNLİKLE "palet sığma kabiliyeti" gibi şablonlar kullanılamaz!
   c) "vehicleOverview" TAM 3 BAĞIMSIZ PARAGRAF:
      1. Paragraf: Gövde tasarımı, şasi yapısı, kargo yükleme ergonomisi ve sürücü oturma pozisyonu.
      2. Paragraf: Motorun yük altındaki tork karakteri, çekiş gücü ve şanzıman oranları.
      3. Paragraf: Ağır yük dayanıklılığı ve Türkiye pazarındaki ticari yeri.`;
    }

    const systemPrompt = `You are TorqueScout's Senior Automotive Test Editor and Chief Inspection Consultant.
You write comprehensive, deeply engaging, authoritative Turkish vehicle reports that justify a paid report purchase.
MANDATORY RULES:
1. STRICT TURKISH LANGUAGE INVARIANT (SIFIR İNGİLİZCE KURALI):
   The entire JSON output MUST BE 100% fluent, natural, authoritative Turkish.
   NEVER output English words like "Inspect...", "Check...", "Early Carburetor", "Late EFI", "Initial introduction...", "Popping out...".
   Never translate rectifier as "düzeltici" - in Turkish motorcycle workshops it is strictly "Konjektör" or "Şarj Regülatörü".
   Never translate dog engagement as "engelleme" - in Turkish motorcycle mechanics it is strictly "Vites Hilali ve Dişli Tırnağı Aşınması".
   Never output "Evet/Hayır" in sellerQuestions; write the full reassuring technical answer the seller should provide.
2. "vehicleOverview" MUST BE A MINIMUM OF 3 RICH PARAGRAPHS:
   - Paragraph 1: Design language, ergonomics, riding/driving posture, chassis construction, and road presence.
   - Paragraph 2: Powertrain character, torque curve delivery, engine sound, gear ratios, and real-world highway vs urban dynamics.
   - Paragraph 3: Market positioning, materials and build quality evaluation. KESİNLİKLE RAKİP VEYA BAŞKA MARKA/MODEL KIYASLAMASI YAPMA.
3. STRICT ZERO COMPETITOR / RIVAL COMPARISON (SIFIR RAKİP KIYASLAMASI KURALI):
   Raporda KESİNLİKLE başka bir marka veya rakip model ismi (örneğin Honda, Yamaha, Kawasaki, KTM, Suzuki vb.) geçmemelidir.
   "Rakiplerine kıyasla", "sınıfındaki rakipleri gibi" gibi kıyaslamalar kesinlikle yasaktır.
   Rapor %100 sadece incelenen aracın kendi şasisi, motor karakteri, ergonomisi, malzeme kalitesi ve kronik/yıpranma durumuna odaklanmalıdır.
4. FUEL SYSTEM & HARDWARE ACCURACY:
   - Eğer araç doğuştan veya ilgili dönemde elektronik yakıt enjeksiyonlu (EFI) ise:
     * ASLA "Karbüratörlü Seri" uydurma ve tavizlerde "Karbüratörlü Versiyonun Bakım Zorluğu" yazma!
     * "allEraCommonIssues", "eraSpecificIssues", tavizler ve ekspertiz kontrollerinde KESİNLİKLE "karbüratör" kelimesi KULLANILAMAZ! Yakıt sistemi kontrollerinde doğrudan elektronik enjektör püskürtmesi, elektrikli benzin pompası basıncı ve gaz kelebeği / TPS sensörü yazılmalıdır.
   - Eğer araç klasik karbüratörlü ise (örn. 2001-2007 vintage modeller):
     * ASLA enjeksiyon (EFI) veya Euro 3 deme ve ASLA vazgeçme şartına "FI arıza lambası" yazma!
   - Kampana frenli motora ASLA ABS yazma! V-Twin motora ASLA 3 buji uydurma!
5. "productionEras" TABLE GUARANTEE:
   Her dönemin "keyChanges" dizisi EN AZ 2 adet somut Türkçe teknik revizyon maddesi içermelidir (ilgili döneme ait gerçek fabrika güncellemesi, yakıt besleme veya mekanik revizyon). ASLA başka bir modelin donanımını veya uydurma parça adını yazma!
6. "conditionsToConsider" (Hangi Şartlarda Değerlendirilebilir):
   - KESİNLİKLE 'Motorun sağlam olması şartıyla', 'Motorun genel durumu detaylı kontrol edilmeli', 'Ekspertiz yapılması şartıyla' gibi basmakalıp, jenerik ve içi boş cümleler YAZILAMAZ!
   - Şartlar doğrudan bu aracın doğrulanmış gerçek parçalarına bağlanmalıdır (benzinli için buji/bobin, silindir kapak contası, soğutma devirdaim hattı, kavrama; dizel için enjektör/pompa vb. ASLA benzinli araca 'enjektör geri dönüş hattı' veya binek araca 'triger kaseti' YAZILAMAZ!).
   - Eğer araçta doğrulanmış spesifik kronik risk yoksa, şart: 'Aracın yetkili/uzman servis periyodik bakım kayıtlarında üretici onaylı sarf malzemelerinin kullanıldığının ve bilgisayarlı diyagnostik taramasında aktif arıza kodu bulunmadığının teyit edilmesi şartıyla' şeklinde profesyonel ve somut olmalıdır.
7. "walkAwayConditions" (Hangi Durumda Satın Almaktan Vazgeçilmeli):
   - KESİNLİKLE 'ağır motor mekanik hasarı veya çözülemeyen krank vuruntusu' gibi basmakalıp korkutma şablonları ve 'Bu tür sorunlar uzun ömürlü kullanımı etkiler' gibi laf kalabalığı YAZILAMAZ!
   - Bu motorun ve şanzımanın gerçek mühendislik felaket senaryosu (dealbreaker) yazılmalıdır (Örn: triger sente atması/kopması sonucu subap eğilmesi, silindir kapak contası yanması kaynaklı blok hararet deformasyonu; şaside podye/direk kaynaklı yapısal hasar. ASLA benzinli veya binek araca 'triger kaseti' uydurma!).
   - Gerekçe (reason) bölümünde soyut laf değil, somut maliyet veya güvenlik riski (örn: komple sandık motor veya komple enjektör/pompa hattı revizyon maliyetinin araç piyasa değerinin önemli bir bölümünü aşması) açıklanmalıdır. Karbüratörlü araçta ASLA 'FI lambası' yazma!
8. PHYSICAL SPECIFICATIONS ARE MANDATORY:
   - topSpeedKmh (number)
   - zeroToHundredKmh (number or null)
   - catalogCombinedFuelL100km (number)
   - trunkCapacityLiters (number)
   - curbWeightKg (number)
${vehicleMandates}
10. Output STRICT JSON only.`;

    const factsJson = JSON.stringify(judge.approvedFactsOnly, null, 2);

    let userPrompt: string;
    if (isMotorcycle) {
      userPrompt = `Motorcycle: ${context.brand} ${context.model}
Displacement: ${judge.finalDisplacementCc} cc
Power: ${judge.finalPowerHp} HP (Range: ${judge.finalPowerRangeText || `${judge.finalPowerHp} HP`})
Transmission Architecture: ${canonicalMotoTransmission}
Cooling Architecture: ${isAirCooled ? 'Hava Soğutmalı' : 'Sıvı Soğutmalı'}
Production Eras: ${JSON.stringify(judge.motorcycleEras || [], null, 2)}
Approved Technical Claims:
${factsJson}
Score: ${judge.decisionScore}/100, Risk: ${judge.technicalRiskLevel}

Write the complete Motorcycle Report in strict JSON:
{
  "vehicleOverview": "En az 3 detaylı paragraflık kapsamlı uzman sürüş ve karakter analizi (ergonomi, motor karakteri, pazar konumu ve malzeme kalitesi - KESİNLİKLE RAKİP MARKA ADI GEÇMEYECEK)",
  "modelHistory": "Model ailesinin üretim seyri, tasarım evrimi ve Türkiye pazarındaki yeri (en az 2 paragraf)",
  "productionEras": [
    {
      "eraName": "string (Doğru dönem adı)",
      "startYear": number,
      "endYear": number | null,
      "fuelSystem": "CARBURETOR" | "EFI",
      "displacementCc": ${judge.finalDisplacementCc},
      "powerHp": ${judge.finalPowerHp},
      "powerRange": "string",
      "hasAbs": boolean,
      "keyChanges": ["En az 2 somut Türkçe teknik revizyon maddesi"]
    }
  ],
  "recommendedEraComparison": "Hangi Dönem Daha Mantıklı? (Euro normu, ABS donanımı veya EFI geçişi, parça maliyeti, sürüş kararlılığı ve bakım hassasiyeti kıyaslaması - KESİNLİKLE RAKİP İSMİ GEÇMEYECEK)",
  "allEraCommonIssues": [
    {
      "title": "string",
      "issueDescription": "Detaylı arıza mekanizması ve sürüşe etkisi",
      "severity": "LOW | MODERATE | HIGH | CRITICAL",
      "checkAdvice": "Alıcının ve ustanın yapacağı somut kontrol adımı"
    }
  ],
  "eraSpecificIssues": [
    {
      "eraName": "string",
      "years": "string",
      "issues": [
        {
          "title": "string",
          "description": "string",
          "checkAdvice": "string"
        }
      ]
    }
  ],
  "dailyUse": {
    "cityUse": "string (Modelin gerçek mimarisine, tork karakterine ve ${canonicalMotoTransmission} aktarmasına özel detaylı şehir içi sürüş ve dur-kalk tahlili - şablon cümle KULLANMA)",
    "highwayUse": "string (Modelin gerçek aerodinamik rüzgar direnci, otoyol tork rezervi ve şasi stabilitesi)"
  },
  "technicalSpecifications": {
    "engineDisplacementCc": ${judge.finalDisplacementCc},
    "enginePowerHp": ${judge.finalPowerHp},
    "powerRange": "${judge.finalPowerRangeText || `${judge.finalPowerHp} HP`}",
    "powerUnit": "HP",
    "engineTorqueNm": number,
    "transmissionTypeAndSpeeds": "${canonicalMotoTransmission}",
    "clutchType": "${isScooter ? 'Kuru Santrifüj / Varyatör' : 'Islak Çoklu Disk'}",
    "drivetrain": "${isScooter ? 'Kayış Tahrikli (CVT Kayışı)' : 'Zincir Tahrikli'}",
    "topSpeedKmh": number,
    "zeroToHundredKmh": ${judge.finalDisplacementCc <= 50 ? 'null' : 'number'},
    "catalogCombinedFuelL100km": number,
    "trunkCapacityLiters": number,
    "curbWeightKg": number
  },
  "strongReasons": [
    { "title": "string", "explanation": "string (en az 2 cümlelik doyurucu açıklama - rakip ismi geçmeyecek)" }
  ],
  "tradeoffs": [
    { "title": "string", "explanation": "string (en az 2 cümlelik teknik açıklama - modelde olmayan karbüratör vb. uydurulmayacak)" }
  ],
  "idealFor": [
    { "profile": "string", "explanation": "string" }
  ],
  "notIdealFor": [
    { "profile": "string", "explanation": "string" }
  ],
  "conditionsToConsider": [
    { "condition": "string (Somut mekanik/ekspertiz önkoşulu)", "reason": "string (Neden bu kontrol şartının arandığı)" }
  ],
  "walkAwayConditions": [
    { "condition": "string (Kritik vazgeçme nedeni)", "reason": "string" }
  ],
  "inspectionChecklist": [
    { "system": "string", "checkpoint": "string", "riskIfIgnored": "string" }
  ],
  "sellerQuestions": [
    { "topic": "string", "question": "string", "expectedAnswer": "string (rahatlatıcı ve teknik beklenen yanıt)" }
  ],
  "decisionSynthesis": {
    "score": ${judge.decisionScore},
    "riskLevel": "${judge.technicalRiskLevel}",
    "verdict": "string"
  }
}`;
    } else if (isSuvPickup) {
      const activeTransmissionName = judge.finalTransmissionType || context.transmission || 'Otomatik';
      const isGasoline = (context.fuel || '').toLowerCase().includes('benzin');
      const fuelTypeLabel = isGasoline ? 'benzinli' : 'dizel';
      const adjudicatedLiters = judge.finalTrunkCapacityLiters || 550;
      const adjudicatedWeight = judge.finalCurbWeightKg || 1850;

      userPrompt = `4x4 / SUV & Pickup: ${context.brand} ${context.model} ${context.year || ''}
Engine: ${context.engine || `${judge.finalDisplacementCc} cc`}
Fuel: ${isGasoline ? 'Benzin' : (context.fuel || 'Dizel')}
Transmission: ${activeTransmissionName}
Trim/Body: ${context.trimPackage || 'Standart'} (${context.bodyType || 'SUV'})
Displacement: ${judge.finalDisplacementCc} cc, Power: ${judge.finalPowerHp} HP
Approved Facts:
${factsJson}
Score: ${judge.decisionScore}/100, Risk: ${judge.technicalRiskLevel}

Write the complete 4x4 / SUV & Pickup Report in strict JSON (SIFIR İNGİLİZCE):
{
  "vehicleOverview": "Aralarında çift satır boşluğu (\\n\\n) olan TAM 3 PARAGRAFLIK detaylı uzman analizi:\\n1. Paragraf: ${context.brand} ${context.model} modelinin gövde yapısı (unibody veya merdiven şasi), yaklaşma/uzaklaşma açıları, taban yüksekliği, kabin ferahlığı ve yüksek sürüş pozisyonu.\\n2. Paragraf: ${judge.finalDisplacementCc} cc hacmindeki ${fuelTypeLabel} motorun ${judge.finalPowerHp} HP güç ve tork teslimatı, 4x4/AWD aktarma kabiliyeti, diferansiyel kilit davranışı ve otoyol/arazi dengesi.\\n3. Paragraf: Alt takım rijitliği, süspansiyon dayanıklılığı, arazi yorgunluğu ve Türkiye SUV/Pickup pazarındaki yeri. (KESİNLİKLE RAKİP MARKA/MODEL ADI GEÇMEYECEK)",
  "dailyUse": {
    "cityUse": "string (Şehir içi boyutlar, dar sokak manevrası, kaldırım/tümsek avantajı ve yüksek görüş açısı odaklı özgün analiz.)",
    "highwayUse": "string (Yüksek gövde yapısının yan rüzgar tepkileri, otoyol stabilitesi, 4x4 çekiş kararlılığı ve motor rezervi odaklı özgün analiz.)"
  },
  "technicalSpecifications": {
    "engineDisplacementCc": ${judge.finalDisplacementCc},
    "enginePowerHp": ${judge.finalPowerHp},
    "powerRange": "${judge.finalPowerRangeText || `${judge.finalPowerHp} HP`}",
    "powerUnit": "HP",
    "engineTorqueNm": number,
    "transmissionTypeAndSpeeds": "${activeTransmissionName}",
    "clutchType": "string (örn: Tork Konvertörlü / Çift Kavrama / Kuru Tek Disk)",
    "drivetrain": "string (örn: Akıllı Dört Tekerden Çekiş (AWD) veya 4x4 Arazi Şanzımanı)",
    "topSpeedKmh": number,
    "zeroToHundredKmh": number,
    "catalogCombinedFuelL100km": number,
    "trunkCapacityLiters": ${adjudicatedLiters},
    "curbWeightKg": ${adjudicatedWeight}
  },
  "strongReasons": [
    { "title": "string (SUV/Arazi aracına özgü somut güçlü neden)", "explanation": "string (En az 2 cümlelik derin teknik açıklama; 4x4 çekiş gücü, taban yüksekliği veya şasi sağlamlığını anlatan özgün metin.)" }
  ],
  "tradeoffs": [
    { "title": "string (Aracın gerçek arazi/SUV kaynaklı kısıtı; örn: yüksek ağırlık kaynaklı fren mesafesi, dar manevra çapı, yüksek yakıt sarfiyatı)", "explanation": "string (en az 2 cümlelik teknik açıklama)" }
  ],
  "idealFor": [
    { "profile": "string", "explanation": "string" }
  ],
  "notIdealFor": [
    { "profile": "string", "explanation": "string" }
  ],
  "conditionsToConsider": [
    { "condition": "string (4x4 aktarma, diferansiyel ve alt takım doğrulanmış parçalarına yönelik somut ekspertiz önkoşulu. KESİNLİKLE 'motorun sağlam olması şartıyla' gibi basmakalıp laflar YAZILAMAZ!)", "reason": "string (Somut arıza mekanizması ve getireceği risk; asla 'detaylı kontrolle belirlenmelidir' gibi klişeler yazma!)" }
  ],
  "walkAwayConditions": [
    { "condition": "string (Şasi korozyonu/eğrilmesi, arazi şanzımanı/diferansiyel kilit çatlağı gibi ağır felaket dealbreaker senaryosu. KESİNLİKLE 'çözülemeyen krank vuruntusu' gibi basmakalıp kalıplar YAZILAMAZ!)", "reason": "string (Somut maliyet/güvenlik gerekçesi - asla 'uzun ömürlü kullanımı etkiler' gibi laf kalabalığı yazma!)" }
  ],
  "inspectionChecklist": [
    { "system": "string", "checkpoint": "string", "riskIfIgnored": "string" }
  ],
  "sellerQuestions": [
    { "topic": "string", "question": "string", "expectedAnswer": "string (rahatlatıcı ve teknik beklenen yanıt)" }
  ],
  "decisionSynthesis": {
    "score": ${judge.decisionScore},
    "riskLevel": "${judge.technicalRiskLevel}",
    "verdict": "string"
  }
}`;
    } else if (isAutomobile) {
      const activeTransmissionName = judge.finalTransmissionType || context.transmission || 'Otomatik';
      const isGasoline = (context.fuel || '').toLowerCase().includes('benzin');
      const fuelTypeLabel = isGasoline ? 'benzinli' : 'dizel';
      const adjudicatedLiters = judge.finalTrunkCapacityLiters || 480;
      const adjudicatedWeight = judge.finalCurbWeightKg || 1350;
      const cleanTrim = context.trimPackage && !/^(standart|standart donanım|standart kasa)$/i.test(context.trimPackage) ? context.trimPackage : '';
      const fullVehicleName = `${context.year ? `${context.year} ` : ''}${context.brand} ${context.model}${cleanTrim ? ` ${cleanTrim}` : ''}`.trim();
      const filterBlock = this.format8FilterBlock(context);

      const isSubaru = context.brand.toLowerCase() === 'subaru';
      const autoOverviewGuide = isSubaru
        ? `Aralarında çift satır boşluğu (\\n\\n) olan TAM 3 PARAGRAFLIK detaylı uzman analizi:\\n1. Paragraf: ${fullVehicleName} modelinin ralli mirasını taşıyan rijit gövde mimarisi, sürücü oturma pozisyonu, ergonomik kokpiti, yatay boksör (Boxer) motorun sağladığı düşük ağırlık merkezi ve binek bagaj pratikliği.\\n2. Paragraf: ${judge.finalDisplacementCc} cc hacmindeki Boxer (EJ204) motorun ${judge.finalPowerHp} HP güç karakteri, Symmetrical AWD (Sürekli Simetrik Dört Tekerden Çekiş) viraj dengesi ve ${activeTransmissionName} şanzıman aktarımı.\\n3. Paragraf: Kabin ses izolasyonu (NVH), süspansiyon konforu, Türkiye pazarında niş/meraklısı profili, usta ve yedek parça erişilebilirliği. (ASLA 'likiditesi oldukça yüksektir' gibi ezbere klişe yazma; meraklısı kitlesi ve servis ekosistemi olarak dürüstçe değerlendir)`
        : `Aralarında çift satır boşluğu (\\n\\n) olan TAM 3 PARAGRAFLIK detaylı uzman analizi:\\n1. Paragraf: ${fullVehicleName} modelinin gövde mimarisi, sürüş pozisyonu, kabin ergonomisi, iç mekan malzeme kalitesi ve binek bagaj pratikliği. KESİNLİKLE sürgülü kapı, palet, esnaf/filo gibi ticari terimler KULLANILAMAZ!\\n2. Paragraf: ${judge.finalDisplacementCc} cc hacmindeki ${fuelTypeLabel} motorun ${judge.finalPowerHp} HP güç ve tork teslimatı, ${activeTransmissionName} şanzıman geçiş karakteri, otoyol seyir kararlılığı ve viraj dengesi.\\n3. Paragraf: Kabin ses yalıtımı (NVH izolasyonu), süspansiyon konforu ve Türkiye ikinci el pazarındaki konumu (geniş kitle veya niş/meraklısı tercihi, parça ve servis erişilebilirliği).`;

      const subaruDrivetrain = isSubaru ? 'Sürekli Dört Tekerden Çekiş (Symmetrical AWD)' : 'Önden Çekiş (FWD)';

      userPrompt = `Passenger Automobile Specification:
${filterBlock}
Displacement: ${judge.finalDisplacementCc} cc, Power: ${judge.finalPowerHp} HP
Transmission: ${activeTransmissionName}
Approved Facts:
${factsJson}
Score: ${judge.decisionScore}/100, Risk: ${judge.technicalRiskLevel}

Write the complete Passenger Automobile Report in strict JSON (SIFIR İNGİLİZCE):
{
  "vehicleOverview": "${autoOverviewGuide}",
  "dailyUse": {
    "cityUse": "string (Modelin şehir içi dur-kalk trafiğindeki direksiyon hissiyatı, süspansiyon sönümlemesi ve manevra kabiliyeti analizi. ASLA talimat cümlesini metne kopyalama!)",
    "highwayUse": "string (Modelin otoyol hızlarındaki rüzgar ve lastik yuvarlanma izolasyonu, şasi stabilitesi ve motor rezervi analizi. ASLA talimat cümlesini metne kopyalama!)"
  },
  "technicalSpecifications": {
    "engineDisplacementCc": ${judge.finalDisplacementCc},
    "enginePowerHp": ${judge.finalPowerHp},
    "powerRange": "${judge.finalPowerRangeText || `${judge.finalPowerHp} HP`}",
    "powerUnit": "HP",
    "engineTorqueNm": number,
    "transmissionTypeAndSpeeds": "${activeTransmissionName}",
    "clutchType": "string (örn: Tork Konvertörlü / Çift Kavrama DSG / Kuru Tek Disk)",
    "drivetrain": "${subaruDrivetrain}",
    "topSpeedKmh": number,
    "zeroToHundredKmh": number,
    "catalogCombinedFuelL100km": number,
    "trunkCapacityLiters": ${adjudicatedLiters},
    "curbWeightKg": ${adjudicatedWeight}
  },
  "strongReasons": [
    { "title": "string (Binek araca özgü güçlü neden başlığı)", "explanation": "string (En az 2 cümlelik derin teknik açıklama. Başlığı tekrar etmeyen, motor dinamikleri, sürüş konforu veya yakıt verimliliğini somut anlatan cümleler.)" }
  ],
  "tradeoffs": [
    { "title": "string (Aracın gerçek bir kısıtı veya dezavantajı - KESİNLİKLE olumlu başlık yazma; örn: sert süspansiyon tepkisi, arka baş mesafesi kısıtı, yüksek hızda lastik yuvarlanma gürültüsü)", "explanation": "string (en az 2 cümlelik teknik açıklama)" }
  ],
  "idealFor": [
    { "profile": "string", "explanation": "string (Bu binek otomobilin karakterine tam uyan kullanıcı profili)" }
  ],
  "notIdealFor": [
    { "profile": "string (Bu modele uygun olmayan profil - Örn: 'Otoyol Hızlarında Yüksek Ses İzolasyonu ve Üst Segment Binek Konforu Bekleyenler' veya 'Dar Şehir Sokaklarında Kompakt Boyut Arayanlar'. KESİNLİKLE 'Büyük Aileler' veya 'Off-road' gibi çelişkili profiller YAZILAMAZ!)", "explanation": "string (Somut otoyol izolasyonu, süspansiyon rijitliği veya boyut kısıtlarını açıklayan teknik cümle)" }
  ],
  "conditionsToConsider": [
    { "condition": "string (Bu binek modelin doğrulanmış motor/aktarma organı parçalarına yönelik somut ekspertiz şartı. KESİNLİKLE 'motorun sağlam olması şartıyla' gibi basmakalıp laflar YAZILAMAZ!)", "reason": "string (Somut arıza mekanizması ve getireceği risk; asla 'detaylı kontrolle belirlenmelidir' gibi klişeler yazma!)" }
  ],
  "walkAwayConditions": [
    { "condition": "string (Bu binek modelin motor/şanzıman mimarisine özgü ağır felaket dealbreaker senaryosu veya şasi/direk yapısal hasarı. KESİNLİKLE 'çözülemeyen krank vuruntusu' gibi basmakalıp kalıplar YAZILAMAZ!)", "reason": "string (Somut maliyet/güvenlik gerekçesi - asla 'uzun ömürlü kullanımı etkiler' gibi laf kalabalığı yazma!)" }
  ],
  "inspectionChecklist": [
    { "system": "string", "checkpoint": "string", "riskIfIgnored": "string" }
  ],
  "sellerQuestions": [
    { "topic": "string", "question": "string", "expectedAnswer": "string (Yetkili servisteki kontrolü ve parça durumunu belirten tatmin edici ve somut teknik yanıt - asla 'sorun yok / normal seviyede' gibi tek cümlelik kaçamak yanıt yazma)" }
  ],
  "decisionSynthesis": {
    "score": ${judge.decisionScore},
    "riskLevel": "${judge.technicalRiskLevel}",
    "verdict": "string"
  }
}`;
    } else {
      const normModel = (context.model || '').toLowerCase();
      const normEngine = (context.engine || '').toLowerCase();
      const normTrim = (context.trimPackage || '').toLowerCase();
      const contextTrans = (context.transmission || '').trim().toLowerCase();

      const isGasoline = (context.fuel || '').toLowerCase().includes('benzin') || normEngine.includes('ecoboost') || normEngine.includes('puretech') || normEngine.includes('tsi');
      const fuelTypeLabel = isGasoline ? 'benzinli' : 'dizel';

      const isVariantAutomatic =
        normTrim.includes('otomatik') ||
        normTrim.includes('automatic') ||
        normTrim.includes('powershift') ||
        normTrim.includes('dsg') ||
        normTrim.includes('eat8') ||
        normTrim.includes('edc') ||
        normTrim.includes('selectshift') ||
        normTrim.includes('7g') ||
        normTrim.includes('9g') ||
        (contextTrans.includes('otomatik') && !contextTrans.includes('manuel'));

      const isVariantManual =
        normTrim.includes('manuel') ||
        normTrim.includes('manual') ||
        (contextTrans.includes('manuel') && !contextTrans.includes('otomatik'));

      const activeTransmissionName = judge.finalTransmissionType || context.transmission || 'Manuel';
      const isAutoVerified =
        activeTransmissionName.toLowerCase().includes('otomatik') ||
        activeTransmissionName.toLowerCase().includes('cvt') ||
        activeTransmissionName.toLowerCase().includes('dsg') ||
        activeTransmissionName.toLowerCase().includes('edc') ||
        activeTransmissionName.toLowerCase().includes('eat');
      const autoName = isAutoVerified ? activeTransmissionName : (judge.commercialDetails?.automaticGearboxType || 'Tam Otomatik');
      const manualName = !isAutoVerified ? activeTransmissionName : (judge.commercialDetails?.manualGearboxType || 'Manuel');

      const cleanTrim = (context.trimPackage || '').trim();
      const fullVehicleName = `${context.year ? `${context.year} ` : ''}${context.brand} ${context.model}${cleanTrim ? ` ${cleanTrim}` : ''}`.trim();

      const normBody = (context.bodyType || '').toLowerCase();
      const isCombi =
        judge.commercialDetails?.bodyStyleClassification === 'COMBI_PASSENGER' ||
        normBody.includes('combi') ||
        normBody.includes('kombi') ||
        normBody.includes('camlı') ||
        normBody.includes('minivan') ||
        normBody.includes('binek') ||
        normModel.includes('tourneo') ||
        normModel.includes('combi') ||
        normModel.includes('kombi') ||
        normModel.includes('multispace') ||
        normModel.includes('tepee') ||
        normModel.includes('rifter') ||
        normModel.includes('caddy') ||
        normTrim.includes('combi') ||
        normTrim.includes('kombi') ||
        normTrim.includes('camlı') ||
        normTrim.includes('deluxe') ||
        normTrim.includes('glx') ||
        normTrim.includes('titanium') ||
        normTrim.includes('trend') ||
        normTrim.includes('premio') ||
        normTrim.includes('emotion') ||
        normTrim.includes('elegance') ||
        normTrim.includes('safeline') ||
        normTrim.includes('silverline') ||
        normTrim.includes('blackline') ||
        normTrim.includes('multispace');

      const adjudicatedLiters = judge.finalTrunkCapacityLiters || (isCombi ? 675 : 3200);
      const adjudicatedCargoM3 = judge.finalCargoVolumeM3 || (isCombi ? 0.7 : 3.2);
      const adjudicatedWeight = judge.finalCurbWeightKg || (isCombi ? 1420 : 1600);

      userPrompt = `Commercial Vehicle: ${fullVehicleName}
Engine: ${context.engine || `${judge.finalDisplacementCc} cc`}
Fuel: ${isGasoline ? 'Benzin' : (context.fuel || 'Dizel')}
Configuration: ${context.trimPackage || (isCombi ? 'Kombi / Camlı Van' : 'Standart Kasa')}
Transmission Architecture:
- Manuel Şanzıman: ${manualName}
- Otomatik Şanzıman Durumu: ${isAutoVerified ? `MEVCUT (${autoName})` : 'OPSİYON YOK (YALNIZCA MANUEL ÜRETİLMİŞTİR)'}
- Aktif Varyant Tercihi: ${isVariantAutomatic ? `OTOMATİK (${autoName})` : isVariantManual ? `MANUEL (${manualName})` : 'MANUEL + OTOMATİK'}
Displacement: ${judge.finalDisplacementCc} cc, Power: ${judge.finalPowerHp} HP
Commercial Details:
${JSON.stringify(judge.commercialDetails || {}, null, 2)}
Approved Facts:
${factsJson}
Score: ${judge.decisionScore}/100, Risk: ${judge.technicalRiskLevel}

Write the complete Minivan/Panelvan Commercial Report in strict JSON (SIFIR İNGİLİZCE):
{
  "vehicleOverview": "Aralarında çift satır boşluğu (\\n\\n) olan TAM 3 PARAGRAFLIK detaylı uzman analizi:\\n1. Paragraf: ${fullVehicleName} modelinin gövde mimarisi, sürüş pozisyonu, kabin ergonomisi, sürgülü kapı ve yükleme eşiği pratikliği.\\n2. Paragraf: ${judge.finalDisplacementCc} cc hacmindeki ${fuelTypeLabel} motorun ${judge.finalPowerHp} HP güç ve tork karakteri, ağır yük altındaki çekiş kabiliyeti, ${isVariantAutomatic ? `${autoName} şanzıman karakteri` : isVariantManual ? `${manualName} şanzıman dişli oranları` : (isAutoVerified ? `${manualName} ve ${autoName} şanzıman opsiyonları` : `${manualName} şanzıman yapısı`)}.\\n3. Paragraf: Filo ve esnaf kullanımındaki genel dayanıklılık, malzeme kalitesi ve Türkiye ikinci el ticari pazarındaki yeri. (KESİNLİKLE RAKİP MARKA/MODEL ADI GEÇMEYECEK, ASLA TEK PARAGRAFA SIKIŞTIRILMAYACAK)",
  "configurationAnalysis": "string (Aracın kargo/bagaj hacminin pratik kullanımı ve yükleme eşiği ergonomisi hakkında 2-3 cümlelik ÖZGÜN değerlendirme. KESİNLİKLE 'palet sığma kabiliyeti' veya 'iş yükünü hafifletir' gibi şablon cümleler kopyalanmayacak; ${isCombi ? `5 kişilik camlı binek/kombi (${cleanTrim || 'Kombi'}) versiyonunda arka koltuk arkası bagaj hacmi (${adjudicatedLiters} Litre / ~${adjudicatedCargoM3} m³) ve aile/esnaf kullanım ergonomisi anlatılacaktır. KESİNLİKLE 3000+ litre sac panelvan kargo hacmi yazılmayacaktır!` : `Panelvan versiyonunda ${adjudicatedLiters || `${adjudicatedCargoM3} m³`} kargo hacmi ve yükleme pratikliği anlatılacaktır.`})",
  "manualTransmissionAnalysis": "string (${manualName} şanzımanın baskı balata ömrü, debriyaj pedalı sertliği, yüklü kalkışlardaki kavrama toleransı ve vites geçiş hassasiyeti hakkında ÖZGÜN teknik analiz.)",
  "automaticTransmissionAnalysis": "string (${isAutoVerified ? `Modelin ${autoName} şanzıman opsiyonunun teknik analizi; dur-kalk trafiğindeki ısınma/kavrama davranışı ve bakım gereksinimleri hakkında ÖZGÜN analiz. KESİNLİKLE 'otomatik şanzıman bulunmuyor' veya 'yalnızca manuel üretilmiştir' YAZILMAYACAKTIR!` : `Modelin şanzıman yapısı (${manualName}) ve otomatik seçeneği bulunmaması durumunda mekanik debriyaj avantajları ve işletme maliyeti hakkında özgün analiz.`})",
  "manualVsAutomatic": "string (${isAutoVerified ? `Manuel (${manualName}) ve otomatik (${autoName}) seçeneklerin filo operasyonları, yakıt tüketimi, şehir içi dur-kalk konforu ve ağır ticari yıpranma açısından profesyonel karşılaştırması.` : `Manuel şanzımanın (${manualName}) ticari filo operasyonları, bakım kolaylığı ve yakıt verimliliği odaklı özgün değerlendirmesi.`})",
  "commercialDutyRisks": [
    {
      "title": "string (Ağır ticari kullanım kaynaklı spesifik arıza başlığı)",
      "risk": "string (Mekanizma ve getireceği maliyet)",
      "checkRecommendation": "string (Ekspertiz ve alım öncesi yapılması gereken somut kontrol)"
    }
  ],
  "dailyUse": {
    "cityUse": "string (Aracın tavan yüksekliğinin AVM/kapalı garaj girişlerine etkisi, dönüş çapı ve dar sokaklardaki ayna/kör nokta manevra kabiliyeti odaklı özgün analiz. Asla şablon cümle kopyalama.)",
    "highwayUse": "string (Aracın otoyol hızlarındaki yan rüzgar tepkileri, yüklü ve yüksüz süspansiyon esnemesi ile sollamalardaki motor tork rezervi odaklı özgün analiz. Asla şablon cümle kopyalama.)"
  },
  "technicalSpecifications": {
    "engineDisplacementCc": ${judge.finalDisplacementCc},
    "enginePowerHp": ${judge.finalPowerHp},
    "powerRange": "${judge.finalPowerRangeText || `${judge.finalPowerHp} HP`}",
    "powerUnit": "HP",
    "engineTorqueNm": number,
    "transmissionTypeAndSpeeds": "${activeTransmissionName}",
    "clutchType": "string (örn: Kuru Tek Disk / Hidrolik)",
    "drivetrain": "string (örn: Önden Çekiş (FWD) veya Arkadan İtiş (RWD))",
    "topSpeedKmh": number,
    "zeroToHundredKmh": number,
    "catalogCombinedFuelL100km": number,
    "trunkCapacityLiters": ${adjudicatedLiters},
    "curbWeightKg": ${adjudicatedWeight}
  },
  "strongReasons": [
    { "title": "string (Özgün ve net bir güçlü neden başlığı)", "explanation": "string (En az 2 cümlelik derin teknik açıklama. Başlığı tekrar eden veya 'pratikliği artırır' gibi sığ ve kendini tekrarlayan cümleler KESİNLİKLE YASAKTIR; motorun dayanıklılığı, parça bulunurluğu veya süspansiyon geometrisi somut olarak açıklanmalıdır.)" }
  ],
  "tradeoffs": [
    { "title": "string (Aracın gerçek bir kısıtı veya dezavantajı - KESİNLİKLE 'avantaj', 'üstünlük' veya 'konforu' gibi olumlu başlık yazma; örn: dar sokak manevrası, boşken arka sekme, yüksek yedek parça maliyeti, sac panel arka kör nokta)", "explanation": "string (en az 2 cümlelik teknik açıklama - araçta otomatik varsa asla 'otomatik yok' deme, olmayan yaprak yay vb. uydurma)" }
  ],
  "idealFor": [
    { "profile": "string", "explanation": "string" }
  ],
  "notIdealFor": [
    { "profile": "string (Örn: 'Otoyol Hızlarında Yüksek Ses İzolasyonu ve Üst Segment Binek Konforu Bekleyenler' veya 'Ağır Tonajlı Endüstriyel Taşımacılık Yapanlar'. KESİNLİKLE 'Büyük Aileler' veya 'Aileler' YAZILAMAZ!)", "explanation": "string (Somut otoyol rüzgar sesi, süspansiyon sertliği veya kargo taşıma sınırı gibi teknik kısıtları açıkla)" }
  ],
  "conditionsToConsider": [
    { "condition": "string (Bu aracın doğrulanmış teknik parçalarına yönelik somut ekspertiz şartı; örn: intercooler hortumu, enjektör geri dönüş hattı veya kaset triger sızıntı/aşınma teyidi. KESİNLİKLE 'motorun sağlam olması şartıyla' gibi basmakalıp laflar YAZILAMAZ!)", "reason": "string (Somut arıza mekanizması ve getireceği risk; asla 'detaylı kontrolle belirlenmelidir' gibi klişeler yazma!)" }
  ],
  "walkAwayConditions": [
    { "condition": "string (Bu aracın motor/şanzıman mimarisine özgü ağır felaket dealbreaker senaryosu; örn: triger kaset kopması veya yüksek basınç pompa talaşı; şaside taşıyıcı podye/direk hasarı. KESİNLİKLE 'çözülemeyen krank vuruntusu' gibi basmakalıp kalıplar YAZILAMAZ!)", "reason": "string (Somut finansal/güvenlik yıkımı; komple motor veya yakıt hattı revizyon maliyeti. Asla 'uzun ömürlü kullanımı etkiler' gibi laf kalabalığı yazma!)" }
  ],
  "inspectionChecklist": [
    { "system": "string", "checkpoint": "string", "riskIfIgnored": "string" }
  ],
  "sellerQuestions": [
    {
      "topic": "string",
      "question": "string (Alıcının araç başında veya telefonda satıcıya doğrudan yönelteceği doğal, usta/piyasa diliyle teknik soru. Asla kitap çevirisi gibi '...herhangi bir sızıntı var mı?' değil; örn: 'Soğuk ilk marşta enjektör diplerinde mazot kokusu/terleme oluyor mu, pul veya rekorlar daha önce elden geçti mi?' gibi gerçek alıcı sorusu)",
      "expectedAnswer": "string (Satıcının vermesi gereken güven verici, somut servis ve parça teyidi)"
    }
  ],
  "decisionSynthesis": {
    "score": ${judge.decisionScore},
    "riskLevel": "${judge.technicalRiskLevel}",
    "verdict": "string"
  }
}`;
    }

    let writerJson = await this.callAiJson(systemPrompt, userPrompt, 4096, 30000);

    if (!writerJson || Object.keys(writerJson).length === 0) {
      throw new Error('TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.');
    }

    return this.harmonizeIntoStandardVehicleReport(context, judge, writerJson);
  }

  /**
   * Translates / sanitizes any residual English text into proper automotive Turkish.
   * Completely eliminates English terms and literal translations like "düzeltici".
   */
  private sanitizeTurkishAutomotiveText(raw?: any): string {
    if (!raw) return '';
    if (typeof raw === 'object') {
      if (typeof raw.text === 'string') raw = raw.text;
      else if (typeof raw.detailedAssessment === 'string') raw = raw.detailedAssessment;
      else if (typeof raw.vehicleOverview === 'string') raw = raw.vehicleOverview;
      else if (typeof raw.summary === 'string') raw = raw.summary;
      else if (typeof raw.description === 'string') raw = raw.description;
      else {
        const values = Object.values(raw).filter((v) => typeof v === 'string' && (v as string).trim().length > 0);
        if (values.length > 0) {
          raw = values.join('\n\n');
        } else {
          raw = '';
        }
      }
    }
    let text = String(raw).trim();
    if (text === '[object Object]') text = '';

    // Strip echoed prompt instruction templates
    text = text
      .replace(/^Şehir içi dur-kalk trafiğindeki[^\n.:]{0,140}analizi\.?\s*/i, '')
      .replace(/^Yüksek hızlardaki yol tutuşu[^\n.:]{0,140}analizi\.?\s*/i, '')
      .replace(/^Modelin şehir içi dur-kalk[^\n.:]{0,140}analizi\.?\s*/i, '')
      .replace(/^Modelin otoyol hızlarındaki[^\n.:]{0,140}analizi\.?\s*/i, '')
      .replace(/^Aracın tavan yüksekliğinin[^\n.:]{0,140}analizi\.?\s*/i, '')
      .replace(/^Aracın otoyol hızlarındaki yan rüzgar[^\n.:]{0,140}analizi\.?\s*/i, '');

    const dictionary: Array<[RegExp, string]> = [
      // Regülatör / Düzeltici / Konjektör
      [/regulator\/rectifier overheating and battery drain/gi, 'Statör & Şarj Regülatörü (Konjektör) Aşırı Isınması ve Akü Boşalması'],
      [/regulator\/rectifier overheating/gi, 'Statör & Şarj Regülatörü (Konjektör) Aşırı Isınması'],
      [/regulator\/rectifier/gi, 'Şarj Regülatörü (Konjektör)'],
      [/regülatör\/düzeltici/gi, 'Şarj Regülatörü (Konjektör)'],
      [/düzeltici/gi, 'Konjektör'],
      [/battery drain/gi, 'Akü Boşalması'],
      [/inspect the regulator\/rectifier for signs of overheating\.?/gi, 'Statör soketinde kararma/erime ve şarj regülatörü (konjektör) gövde sıcaklığı kontrol edilmelidir.'],
      [/inspect regulator\/rectifier for signs of overheating\.?/gi, 'Statör soketinde kararma/erime ve şarj regülatörü (konjektör) gövde sıcaklığı kontrol edilmelidir.'],
      [/battery not charging\.?/gi, 'Akünün şarj olmaması ve düşük voltaj riski.'],

      // Yakıt Pompası
      [/fuel pump performance loss/gi, 'Yakıt Pompası Basınç ve Performans Kaybı'],
      [/loss of power under acceleration\.?/gi, 'Hızlanma esnasında yakıt basınç düşüklüğü kaynaklı güç kaybı veya tekleme.'],
      [/check fuel pump operation and fuel delivery\.?/gi, 'Yakıt pompası hat basıncı (en az 3 bar) ve pompa debisi test edilmelidir.'],
      [/inspect fuel pump and fuel lines for blockages\.?/gi, 'Yakıt pompası filtresi ve benzin hatları tıkanıklık yönünden incelenmelidir.'],

      // Şanzıman & 2. Vites
      [/2nd gear engagement wear/gi, '2. Vites Hilal ve Dişli Tırnak Aşınması'],
      [/2\. vites engelleme aşınması/gi, '2. Vites Hilal ve Dişli Tırnak Aşınması (Boşa Atma)'],
      [/popping out of 2nd gear under load\.?/gi, '2. viteste yük altındayken vitesin kendiliğinden boşa fırlaması.'],
      [/inspect transmission for wear on dog engagement\.?/gi, '2. viteste tam gaz ivmelenme yapılarak dişli tırnaklarının kaçırıp kaçırmadığı test edilmelidir.'],

      // Gidon & Çatal
      [/steering stem bearing play/gi, 'Gidon Boğaz Rulmanı Boşluğu ve Çatal Keçeleri'],
      [/loose steering feel\.?/gi, 'Gidonda boşluk ve bozuk satıhta tıkırtı hissi.'],
      [/inspect steering bearings and fork seals for wear\.?/gi, 'Gidon boğaz bilyasındaki boşluk ve ön çatal keçelerindeki yağ sızıntısı incelenmelidir.'],
      [/inspect steering stem bearings and fork seals\.?/gi, 'Gidon boğaz bilyasındaki boşluk ve ön çatal keçelerindeki yağ sızıntısı incelenmelidir.'],

      // Yağ Radyatörü
      [/oil cooler line leaks/gi, 'Yağ Radyatörü Hortum ve Rekor Kaçakları'],
      [/oil leaks around cooler lines\.?/gi, 'Yağ radyatörü bağlantı rekorlarında yağ sızıntısı ve kirlenme.'],
      [/oil leaks from cooler lines\.?/gi, 'Yağ radyatörü hortum rekorlarından yağ sızıntısı.'],
      [/inspect oil cooler lines for wear and leaks\.?/gi, 'Yağ radyatörü hortum rekorları ve sızdırmazlık pulları kontrol edilmelidir.'],
      [/inspect oil cooler lines for leaks\.?/gi, 'Yağ radyatörü hortum rekorları ve sızdırmazlık pulları kontrol edilmelidir.'],

      // Dönem İsimleri & Açıklamaları
      [/early carburetor/gi, 'Erken Dönem (Karbüratörlü Seri)'],
      [/late efi/gi, 'Geç Dönem (Elektronik Enjeksiyonlu Seri)'],
      [/initial introduction of the model with carburetor fuel system, common issues with carburetor synchronization and idle irregularities/gi, 'Karbüratörlü ilk jenerasyon; karbüratör diyafram aşınması, vakum senkron bozulması ve rölanti dalgalanması görülebilir.'],
      [/transition to efi fuel system, improved emissions to euro3 standards, introduction of abs in later models/gi, 'Delphi elektronik enjeksiyon sistemine geçiş; Euro 3 emisyon uyumu ve daha stabil soğuk çalıştırma.'],

      // Genel İngilizce Fiiller ve İfadeler
      [/^inspect\s+(.*)/gi, '$1 kontrol edilmelidir.'],
      [/^check\s+(.*)/gi, '$1 test edilmelidir.'],
      [/under load/gi, 'yük altında'],

      // Rakip Kıyaslaması Temizleme (Sıfır Rakip Kuralı)
      [/(?:japon|avrupalı|diğer|sınıfındaki)\s+rakiplerine?\s+kıyasla/gi, 'segment standartlarında'],
      [/(?:rakiplerinden|rakiplerine göre)/gi, 'segmentinde'],
      [/(?:rakipleri gibi)/gi, 'genel standartlarda'],
      [/(?:rakiplerine kıyasla)/gi, 'segmentine kıyasla'],

      // Ticari & Dizel Türkçe Terim Harmonizasyonu (Ortak Ray ve Soot Düzeltmesi)
      [/ortak raylı enjektör sızıntısı/gi, 'Common Rail Enjektör ve Pul Kaçağı'],
      [/ortak ray enjektör sızıntısı/gi, 'Common Rail Enjektör ve Pul Kaçağı'],
      [/ortak raylı/gi, 'Common Rail'],
      [/ortak ray/gi, 'Common Rail'],
      [/soot birikimi/gi, 'Kurum Birikimi'],
      [/soot/gi, 'Kurum'],

      // Ticari Arıza Başlıkları ve Kontroller (İngilizce Koruma)
      [/turbo boost hose leaks/gi, 'Turboşarj Basınç Hortumu Kaçakları'],
      [/turbo boost hoses for wear\.?/gi, 'Turbo basınç hortumları çatlak ve aşınma yönünden kontrol edilmelidir.'],
      [/egr cooler issues/gi, 'EGR Soğutucu Petek Tıkanması ve Hararet'],
      [/engine overheating\.?/gi, 'Motor hararet ve aşırı ısınma riski.'],
      [/egr cooler for blockages\.?/gi, 'EGR soğutucu petekleri ve su kanalları tıkanma yönünden kontrol edilmelidir.'],
      [/cargo sliding door roller wear/gi, 'Sürgülü Kapı Alt Ray ve Rulman Aşınması'],
      [/difficulty in opening\/closing doors\.?/gi, 'Sürgülü kapıların açılıp kapanmasında zorlanma ve ray takılması.'],
      [/rollers for wear and lubrication\.?/gi, 'Kapı alt ray makaraları ve rulmanları aşınma ve yağlama yönünden kontrol edilmelidir.'],
    ];

    for (const [pattern, replacement] of dictionary) {
      text = text.replace(pattern, replacement);
    }

    return text.trim();
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
    const isSuvPickup = context.vehicleType === 'SUV_PICKUP';
    const isCommercial = context.vehicleType === 'MINIVAN_PANELVAN';
    const isAutomobile = context.vehicleType === 'AUTOMOBILE' || (!isMotorcycle && !isSuvPickup && !isCommercial);
    const titlePrefix = isMotorcycle
      ? `${context.brand} ${context.model}`
      : `${context.year || ''} ${context.brand} ${context.model} ${context.trimPackage || ''}`.trim();

    // Canonical Transmission & Speeds Ground Truth Resolution
    const contextTrans = (context.transmission || '').trim().toLowerCase();
    const normModel = (context.model || '').toLowerCase();
    const normEngine = (context.engine || '').toLowerCase();
    const normTrim = (context.trimPackage || '').toLowerCase();
    const isGasoline = (context.fuel || '').toLowerCase().includes('benzin') || normEngine.includes('ecoboost') || normEngine.includes('puretech') || normEngine.includes('tsi');
    const isPetrol = isGasoline;
    const isTurbo = /turbo|tsi|tfsi|tce|puretech|ecoboost|tdci|crdi|dci|cdti|hdi|multijet/i.test(`${context.engine || ''} ${context.model || ''}`);
    const isSubaru = context.brand.toLowerCase() === 'subaru';
    const isVariantAutomatic =
      normTrim.includes('otomatik') ||
      normTrim.includes('automatic') ||
      normTrim.includes('powershift') ||
      normTrim.includes('dsg') ||
      normTrim.includes('eat8') ||
      normTrim.includes('edc') ||
      normTrim.includes('selectshift') ||
      normTrim.includes('7g') ||
      normTrim.includes('9g') ||
      (contextTrans.includes('otomatik') && !contextTrans.includes('manuel'));

    const canonicalTransmission = judge.finalTransmissionType || context.transmission || 'Belirtilmemiş';
    const speedMatch = canonicalTransmission.match(/(\d+)\s*İleri/i);
    const canonicalSpeeds = speedMatch ? parseInt(speedMatch[1], 10) : canonicalTransmission.toLowerCase().includes('cvt') ? 1 : 6;

    const normBody = (context.bodyType || '').toLowerCase();
    const isCombi =
      judge.commercialDetails?.bodyStyleClassification === 'COMBI_PASSENGER' ||
      normBody.includes('combi') ||
      normBody.includes('kombi') ||
      normBody.includes('camlı') ||
      normBody.includes('minivan') ||
      normBody.includes('binek') ||
      normModel.includes('tourneo') ||
      normModel.includes('combi') ||
      normModel.includes('kombi') ||
      normModel.includes('multispace') ||
      normModel.includes('tepee') ||
      normModel.includes('rifter') ||
      normModel.includes('caddy') ||
      normTrim.includes('combi') ||
      normTrim.includes('kombi') ||
      normTrim.includes('camlı') ||
      normTrim.includes('deluxe') ||
      normTrim.includes('glx') ||
      normTrim.includes('titanium') ||
      normTrim.includes('trend') ||
      normTrim.includes('premio') ||
      normTrim.includes('emotion') ||
      normTrim.includes('elegance') ||
      normTrim.includes('safeline') ||
      normTrim.includes('silverline') ||
      normTrim.includes('blackline') ||
      normTrim.includes('multispace');

    // Physical Specs Gating (Zero-Null Guarantee)
    const baseHp = judge.finalPowerHp;
    const baseCc = judge.finalDisplacementCc;

    const realisticTopSpeed =
      isMotorcycle
        ? (baseCc <= 50 ? 50 : baseCc <= 125 ? 95 : 120)
        : baseHp >= 400 ? 250 : baseHp >= 250 ? 245 : baseHp >= 180 ? 230 : baseHp >= 130 ? 205 : 185;

    const topSpeedKmh =
      typeof writer.technicalSpecifications?.topSpeedKmh === 'number' &&
      writer.technicalSpecifications.topSpeedKmh > (isMotorcycle ? 30 : 160)
        ? writer.technicalSpecifications.topSpeedKmh
        : judge.finalTopSpeedKmh || realisticTopSpeed;

    const realisticZeroHundred =
      isMotorcycle
        ? null
        : baseHp >= 400 ? 3.9 : baseHp >= 250 ? 6.2 : baseHp >= 180 ? 8.1 : baseHp >= 130 ? 9.6 : 11.2;

    const zeroToHundredKmh =
      typeof writer.technicalSpecifications?.zeroToHundredKmh === 'number' &&
      writer.technicalSpecifications.zeroToHundredKmh > 0
        ? writer.technicalSpecifications.zeroToHundredKmh
        : judge.finalZeroToHundredKmh !== undefined ? judge.finalZeroToHundredKmh : realisticZeroHundred;

    const catalogCombinedFuelL100km =
      typeof writer.technicalSpecifications?.catalogCombinedFuelL100km === 'number' &&
      writer.technicalSpecifications.catalogCombinedFuelL100km > 0
        ? writer.technicalSpecifications.catalogCombinedFuelL100km
        : judge.finalCombinedFuelL100km || (isMotorcycle ? 2.8 : 6.0);

    const trunkCapacityLiters =
      typeof writer.technicalSpecifications?.trunkCapacityLiters === 'number' &&
      writer.technicalSpecifications.trunkCapacityLiters > 0 &&
      (!isCombi || writer.technicalSpecifications.trunkCapacityLiters <= 1200)
        ? writer.technicalSpecifications.trunkCapacityLiters
        : judge.finalTrunkCapacityLiters || (isMotorcycle ? 0 : isCombi ? 675 : isSuvPickup ? 550 : isCommercial ? 3200 : 480);

    const curbWeightKg =
      typeof writer.technicalSpecifications?.curbWeightKg === 'number' &&
      writer.technicalSpecifications.curbWeightKg > 0
        ? writer.technicalSpecifications.curbWeightKg
        : judge.finalCurbWeightKg || (isMotorcycle ? 115 : isSuvPickup ? 1750 : 1420);

    // Deducted risks construction for V6 Score Hero (with Turkish sanitization)
    const deductedRisks = judge.approvedFactsOnly.map((fact) => {
      const penalty = fact.severity === 'CRITICAL' ? 10 : fact.severity === 'HIGH' ? 7 : fact.severity === 'MODERATE' ? 4 : 2;
      const cleanTitle = this.sanitizeTurkishAutomotiveText(fact.title);
      const exp = this.sanitizeTurkishAutomotiveText(fact.userExperience || '');
      const sym = this.sanitizeTurkishAutomotiveText(fact.symptoms?.[0] || '');
      const cleanReason = exp && exp.length >= 15 ? exp : (sym && sym.length >= 15 ? sym : `${cleanTitle} bileşeninde mekanik aşınma ve arıza riski.`);
      let cleanInspect = this.sanitizeTurkishAutomotiveText(fact.inspectionCheck || fact.testDriveCheck || `${cleanTitle} kontrol edilmelidir.`);
      if (/^gözle (muayene|kontrol) edin/i.test(cleanInspect.trim())) {
        cleanInspect = cleanInspect.replace(/^gözle (muayene|kontrol) edin\s*(ve)?\s*/i, '');
        cleanInspect = cleanInspect.charAt(0).toUpperCase() + cleanInspect.slice(1);
      }
      if (!/obd|diyagnostik|canlı veri|live data|basınç|manometre|test|ölçüm|tolerans|kaçak/i.test(cleanInspect)) {
        cleanInspect = `${cleanInspect}. Yetkili/uzman ekspertizde OBD cihazı ile canlı parametre sapmaları loglanmalı ve fiziki kontrol uygulanmalıdır.`.replace(/\.\./g, '.');
      }

      const domainKey =
        /elektronik|elektrik|şarj|akü|statör|konjektör/i.test(fact.system) ? 'ELECTRONICS_BODY' :
        /kapı|sürgülü|kilit|gövde|trim|karoser|body|door|roller|ray|fitil|boya|menteşe/i.test(`${fact.system} ${cleanTitle}`) ? 'ELECTRONICS_BODY' :
        /şanzıman|vites|kavrama|debriyaj|volan|baskı|hilal|varyatör|kayış/i.test(fact.system) ? 'POWERTRAIN_TRANS' :
        /yürüyen|şasi|alt takım|fren|süspansiyon|makas|amortisör|salıncak|rot|rulman|chassis|suspension/i.test(fact.system) ? 'CHASSIS_BRAKES' :
        'POWERTRAIN_ENGINE';

      return {
        title: cleanTitle,
        reason: cleanReason,
        description: cleanReason,
        netDeduction: penalty,
        deduction: penalty,
        penalty,
        inspectionInstruction: cleanInspect,
        domain: domainKey,
        normalizedFailureMode: fact.claimId,
        severity: fact.severity,
      };
    });

    const totalRiskPenalty = deductedRisks.reduce((sum, r) => sum + r.penalty, 0);
    const calibratedScore = Math.max(50, Math.min(96, 96 - totalRiskPenalty));

    // Motorcycle Era Analysis Sanitization
    let motorcycleEraAnalysis: any = undefined;
    if (isMotorcycle) {
      const rawEras = judge.motorcycleEras || writer.productionEras || [];
      const cleanEras = rawEras.map((era: any) => {
        const brakingLower = String(era.brakingSystem || '').toLowerCase();
        const hasAbs = Boolean(era.hasAbs && !brakingLower.includes('kampana') && brakingLower.includes('abs'));

        const keyChanges = Array.isArray(era.keyChanges)
          ? era.keyChanges
              .map((k: string) => this.sanitizeTurkishAutomotiveText(k))
              .filter(Boolean)
          : typeof era.keyChanges === 'string' && era.keyChanges.trim()
          ? [this.sanitizeTurkishAutomotiveText(era.keyChanges)]
          : [];

        return {
          ...era,
          eraName: this.sanitizeTurkishAutomotiveText(era.eraName || 'Standart Üretim Serisi'),
          fuelSystem: era.fuelSystem || 'EFI',
          hasAbs,
          keyChanges,
        };
      });

      const rawCommonIssues = writer.allEraCommonIssues || [];
      const cleanCommonIssues = rawCommonIssues.map((iss: any) => ({
        title: this.sanitizeTurkishAutomotiveText(iss.title),
        issueDescription: this.sanitizeTurkishAutomotiveText(iss.issueDescription || iss.description || iss.symptoms || iss.risk),
        severity: iss.severity || 'HIGH',
        checkAdvice: this.sanitizeTurkishAutomotiveText(iss.checkAdvice || iss.checkNote),
      }));

      const rawEraSpecific = writer.eraSpecificIssues || [];
      const cleanEraSpecific = rawEraSpecific.map((eraBlock: any) => {
        const rawSub = Array.isArray(eraBlock.issues) ? eraBlock.issues : (eraBlock.title ? [eraBlock] : []);
        return {
          eraName: this.sanitizeTurkishAutomotiveText(eraBlock.eraName),
          years: eraBlock.years,
          issues: rawSub.map((sub: any) => ({
            title: this.sanitizeTurkishAutomotiveText(sub.title),
            description: this.sanitizeTurkishAutomotiveText(sub.description || sub.symptoms || sub.risk),
            checkAdvice: this.sanitizeTurkishAutomotiveText(sub.checkAdvice || sub.checkNote),
          })),
        };
      });

      motorcycleEraAnalysis = {
        modelHistory: this.sanitizeTurkishAutomotiveText(writer.modelHistory),
        productionEras: cleanEras,
        recommendedEraComparison: this.sanitizeTurkishAutomotiveText(writer.recommendedEraComparison),
        allEraCommonIssues: cleanCommonIssues,
        eraSpecificIssues: cleanEraSpecific,
      };
    }

    const rawReport = {
      reportId: `vr_${isMotorcycle ? (context.modelId || context.model) : context.variantId}_${Date.now()}`,
      mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
      status: 'COMPLETED',
      generatedAt: new Date().toISOString(),
      schemaVersion: 2,
      vehicleType: context.vehicleType,
      vehicleOverview: this.sanitizeTurkishAutomotiveText(writer.vehicleOverview || 'Araç mekanik ve kullanım özellikleri incelendi.'),
      vehicleIdentity: {
        brand: context.brand,
        model: context.model,
        modelYear: context.year || (isMotorcycle ? 'Tüm Üretim Yılları' : 2020),
        year: context.year || (isMotorcycle ? 'Tüm Üretim Yılları' : 2020),
        bodyType: isMotorcycle
          ? 'Motosiklet'
          : isSuvPickup
          ? (context.bodyType || 'Arazi / SUV')
          : isAutomobile
          ? (context.bodyType || 'Sedan')
          : (isCombi ? 'Kombi / Camlı Van' : 'Panelvan / Minivan'),
        engineCode: context.engine || (isMotorcycle ? 'Katalog Motoru' : `${judge.finalDisplacementCc} cc ${isGasoline ? 'Benzin' : 'Dizel'}`),
        transmissionName: isMotorcycle
          ? (context.transmission || (writer.technicalSpecifications?.transmissionTypeAndSpeeds?.toLowerCase().includes('otomatik') || writer.technicalSpecifications?.transmissionTypeAndSpeeds?.toLowerCase().includes('cvt') ? 'Otomatik' : 'Manuel'))
          : canonicalTransmission,
        fuelType: isMotorcycle ? 'Benzin' : (isGasoline ? 'Benzin' : (context.fuel || 'Dizel')),
        trim: context.trimPackage || (isMotorcycle ? 'Standart' : 'Standart Donanım'),
        trimName: context.trimPackage || (isMotorcycle ? 'Standart' : 'Standart Donanım'),
        trimPackage: context.trimPackage || (isMotorcycle ? 'Standart' : 'Standart Donanım'),
        engineDisplacementCc: judge.finalDisplacementCc,
        enginePowerHp: judge.finalPowerHp,
        canonicalDisplayPowerHp: judge.finalPowerHp,
        vehicleType: context.vehicleType,
      },
      technicalSpecifications: {
        engineDisplacementCc: judge.finalDisplacementCc,
        enginePowerHp: judge.finalPowerHp,
        powerUnit: 'HP',
        engineTorqueNm: typeof writer.technicalSpecifications?.engineTorqueNm === 'number' && writer.technicalSpecifications.engineTorqueNm > 0
          ? writer.technicalSpecifications.engineTorqueNm
          : isMotorcycle
          ? (judge.finalDisplacementCc >= 650 ? 68 : judge.finalDisplacementCc >= 350 ? 35 : 24)
          : isSuvPickup ? 380 : 300,
        torqueUnit: 'Nm',
        transmissionTypeAndSpeeds: canonicalTransmission,
        transmissionSpeeds: canonicalSpeeds,
        clutchType: writer.technicalSpecifications?.clutchType || (
          isMotorcycle
            ? (context.transmission === 'Otomatik' ? 'Kuru Santrifüj / Varyatör' : 'Islak Çoklu Disk')
            : 'Kuru Tek Disk / Hidrolik'
        ),
        drivetrain: writer.technicalSpecifications?.drivetrain || (
          isMotorcycle
            ? (context.transmission === 'Otomatik' ? 'Kayış Tahrikli (Belt Drive)' : 'Zincir Tahrikli')
            : isSuvPickup ? 'Dört Tekerden Çekiş (4WD/AWD)' : 'Önden Çekiş (FWD)'
        ),
        zeroToHundredKmh,
        zeroToHundredSec: zeroToHundredKmh,
        topSpeedKmh,
        combinedFuelL100km: catalogCombinedFuelL100km,
        catalogCombinedFuelL100km,
        trunkCapacityLiters,
        curbWeightKg,
      },
      performanceUsage: {
        topSpeedKmh,
        zeroToHundredKmh,
        zeroToHundredSec: zeroToHundredKmh,
        combinedFuelL100km: catalogCombinedFuelL100km,
        trunkCapacityLiters,
        curbWeightKg,
      },
      expertDecisionSynthesis: {
        technicalSpecifications: {
          topSpeedKmh,
          zeroToHundredKmh,
          zeroToHundredSec: zeroToHundredKmh,
          combinedFuelL100km: catalogCombinedFuelL100km,
          trunkCapacityLiters,
          curbWeightKg,
        },
        vehicleCharacter: {
          headline: `${titlePrefix} Kapsamlı Analiz ve Karar Raporu`,
          detailedAssessment: this.sanitizeTurkishAutomotiveText(writer.vehicleOverview || 'Araç mekanik ve kullanım özellikleri incelendi.'),
          supportingFactIds: [],
        },
        dailyUseAssessment: {
          cityUse: this.sanitizeTurkishAutomotiveText(
            writer.dailyUse?.cityUse || (isMotorcycle
              ? (context.transmission === 'Otomatik'
                ? 'Şehir içi dur-kalk trafiğinde vites gerektirmeyen varyatör konforu ve dar alanlarda yüksek manevra kıvraklığı.'
                : 'Şehir içi kıvraklığı, düşük devir tork dengesi ve dur-kalk trafiğindeki manevra kabiliyeti.')
              : isSuvPickup
              ? 'Şehir içi manevra kabiliyeti, yüksek sürüş pozisyonu ve kaldırım/tümsek aşma rahatlığı.'
              : isAutomobile
              ? 'Şehir içi dur-kalk trafiğindeki direksiyon hassasiyeti, süspansiyon darbe emişi ve dar sokak manevra kabiliyeti.'
              : 'Şehir içi dağıtım ve dar sokaklarda dönüş çapı ile ayna görüş açısı manevra kabiliyeti.'),
          ),
          highwayUse: this.sanitizeTurkishAutomotiveText(
            writer.dailyUse?.highwayUse || (isMotorcycle
              ? 'Otoyol rüzgar direnci ve yüksek süratlerdeki titreşim/şasi stabilitesi.'
              : isSuvPickup
              ? 'Otoyol seyir konforu, rüzgar sesi yalıtımı ve yüksek sürat şasi dengesi.'
              : isAutomobile
              ? 'Otoyol hızlarında yüksek hız şasi stabilitesi, kabin rüzgar yalıtımı ve sollamalardaki motor rezervi.'
              : 'Yüklü otoyol seyrinde motor tork rezervi ve rüzgar savurma direnci.'),
          ),
          supportingFactIds: [],
        },
        strongestReasonsToChoose: (writer.strongReasons || []).map((r: any) => ({
          title: this.sanitizeTurkishAutomotiveText(r.title),
          explanation: this.sanitizeTurkishAutomotiveText(r.explanation),
          supportingFactIds: [],
        })),
        compromisesAndLimitations: (writer.tradeoffs || [])
          .filter((t: any) => {
            const tText = `${t.title} ${t.explanation}`.toLowerCase();
            const allErasEfi = (motorcycleEraAnalysis?.productionEras || judge.motorcycleEras || []).every((e: any) => e.fuelSystem === 'EFI');
            const allErasCarb = (motorcycleEraAnalysis?.productionEras || judge.motorcycleEras || []).every((e: any) => e.fuelSystem === 'CARBURETOR');
            if (isMotorcycle && allErasEfi && tText.includes('karbüratör')) {
              return false; // Eliminate fake carburetor tradeoff on born-EFI motorcycles
            }
            if (isMotorcycle && allErasCarb && (tText.includes('enjektör') || tText.includes('fi lambası') || tText.includes('elektronik beyin'))) {
              return false; // Eliminate fake EFI tradeoff on pure carburetor motorcycles
            }
            if (!isMotorcycle && !isSuvPickup) {
              const hasAuto = Boolean(judge.commercialDetails?.automaticGearboxVerified || isVariantAutomatic);
              if (hasAuto) {
                if (tText.includes('otomatik şanzıman') && (tText.includes('yok') || tText.includes('bulunm') || tText.includes('eksikli'))) {
                  return false; // Eliminate fake "no automatic transmission" tradeoff on commercial models with automatic options (e.g. Transporter DSG)
                }
              } else {
                if (/otomatik|comfort-matic|robotize|aktüatör|dsg|şanzıman bakım/i.test(tText)) {
                  return false; // Eliminate fake automatic transmission defect/maintenance tradeoff on models that are strictly manual!
                }
              }
            }
            if (t.title && (t.title.toLowerCase().includes('avantaj') || t.title.toLowerCase().includes('üstünlük'))) {
              return false; // Compromises are strictly trade-offs/limitations, never advantages
            }
            return true;
          })
          .map((t: any) => ({
            title: this.sanitizeTurkishAutomotiveText(t.title),
            explanation: this.sanitizeTurkishAutomotiveText(t.explanation),
            supportingFactIds: [],
          })),
        suitableFor: (writer.idealFor || writer.suitableFor || []).map((i: any) => ({
          profile: this.sanitizeTurkishAutomotiveText(i.profile),
          explanation: this.sanitizeTurkishAutomotiveText(i.explanation),
          supportingFactIds: [],
        })),
        notSuitableFor: (() => {
          const list = (writer.notIdealFor || writer.notSuitableFor || [])
            .filter((n: any) => {
              const nText = `${n.profile} ${n.explanation}`.toLowerCase();
              const hasAuto = Boolean(judge.commercialDetails?.automaticGearboxVerified || isVariantAutomatic);
              if (!isMotorcycle && !isSuvPickup && !hasAuto) {
                if (/otomatik/i.test(nText)) return false;
              }
              // For passenger automobiles, completely filter out off-road absurdity
              if (isAutomobile && (nText.includes('off-road') || nText.includes('arazi') || nText.includes('bozuk zemin ve taşlık'))) {
                return false;
              }
              return true;
            })
            .map((n: any) => {
              let prof = this.sanitizeTurkishAutomotiveText(n.profile);
              let exp = this.sanitizeTurkishAutomotiveText(n.explanation)
                .replace(/ve otomatik şanzımanın bakım gereksinimleri,?/gi, '')
                .replace(/otomatik şanzımanın bakım gereksinimleri ve,?/gi, '')
                .trim();

              // Clean up contradictory profile names where a combi/family car is flagged as unsuitable for families
              if (/^(büyük aileler|geniş aileler|aileler|aile kullanımı)$/i.test(prof.trim())) {
                prof = 'Otoyol Hızlarında Yüksek Ses İzolasyonu ve Üst Segment Binek Konforu Bekleyenler';
                if (/aile/i.test(exp) || exp.length < 30) {
                  exp = 'Geniş kabin ve bagaj hacmine karşın, ticari gövde aerodinamiği sebebiyle yüksek otoyol hızlarında kabin içi rüzgar ve yol sesi seviyesi D/C segmenti binek otomobillerin gerisinde kalabilir.';
                }
              }

              return {
                profile: prof,
                explanation: exp,
                supportingFactIds: [],
              };
            });

          if (list.length === 0) {
            if (isCombi || isCommercial) {
              list.push({
                profile: 'Otoyolda Üst Segment Sessizlik ve Binek Süspansiyon Konforu Arayanlar',
                explanation: 'Yüksek tavan yapısı ve hafif ticari arka süspansiyon geometrisi sebebiyle 110 km/s üzeri otoyol seyrinde rüzgar sesi ve yüksüz arka aks esnemesi binek araçlara göre daha belirgindir.',
                supportingFactIds: [],
              });
            } else if (isAutomobile) {
              list.push({
                profile: 'Dar Şehir İçi Sokaklarında Kompakt Boyut Arayanlar',
                explanation: 'Geniş gövde boyutları ve uzun aks mesafesi nedeniyle dar sokaklarda park etme ve kıvrak manevra yapma beklentisi olanlar için hatchback veya küçük sınıf araçlar daha pratik olabilir.',
                supportingFactIds: [],
              });
            }
          }
          return list;
        })(),
        purchaseConditions: (() => {
          const isTautologicalCondition = (cond: string, reason: string): boolean => {
            const combined = `${cond} ${reason}`.toLowerCase();
            if (
              combined.includes('motorun genel durumu') ||
              combined.includes('motorun sağlamlığı') ||
              combined.includes('aracın genel durumu') ||
              combined.includes('alım öncesi detaylı bir kontrol ile belirlenmelidir') ||
              combined.includes('detaylı bir kontrol ile belirlenmelidir') ||
              combined.includes('ekspertiz testiyle belirlenmelidir') ||
              combined.includes('uzun ömürlü kullanımını ciddi şekilde etkileyebilir') ||
              combined.includes('uzun ömürlü kullanımını etkiler')
            ) {
              return true;
            }
            if (/^(motorun|aracın|ünitenin)\s+sağlam(lığının|lığı)?/i.test(cond.trim())) {
              return true;
            }
            return false;
          };

          let conds = (writer.conditionsToConsider || [])
            .filter((c: any) => {
              const cText = `${c.condition} ${c.reason}`.toLowerCase();
              if (cText.includes('yüksek yakıt') || cText.includes('yakıt tüketimi art')) {
                return false;
              }
              if (isTautologicalCondition(c.condition || '', c.reason || '')) {
                return false;
              }
              if (isPetrol && (cText.includes('enjektör geri dönüş') || cText.includes('mazot') || cText.includes('dpf') || cText.includes('partikül filtresi'))) {
                return false;
              }
              if (!isCommercial && cText.includes('triger kaset')) {
                return false;
              }
              if (!isTurbo && isPetrol && (cText.includes('turbo') || cText.includes('intercooler'))) {
                return false;
              }
              return true;
            })
            .map((c: any) => {
              let cond = this.sanitizeTurkishAutomotiveText(c.condition);
              const reason = this.sanitizeTurkishAutomotiveText(c.reason);
              if (/kontrol(ü|ü\s+yapılmalı|ü\s+yapılmalıdır|ü\s+sağlanmalı|ü\s+sağlanmalıdır|ü\s+yapılması|ü\s+sağlanması)?$|kontrol\s*edilmeli(dir)?$|kontrol\s*edilmesi$|incelenmeli(dir)?$|test\s*edilmeli(dir)?$/i.test(cond.trim())) {
                cond = cond.replace(/\s*(kontrol(ü|ü\s+yapılmalı|ü\s+yapılmalıdır|ü\s+sağlanmalı|ü\s+sağlanmalıdır|ü\s+yapılması|ü\s+sağlanması)?|kontrol\s*edilmeli(dir)?|kontrol\s*edilmesi|incelenmeli(dir)?|test\s*edilmeli(dir)?)$/i, '');
                cond = `${cond} arızası, aşınması veya kaçağı bulunmadığının ekspertiz testiyle teyit edilmesi şartıyla`;
              } else if (!/şartıyla|koşuluyla|kaydıyla|teyit edilmesi|sağlanması/i.test(cond)) {
                cond = cond.replace(/\s*(bulunması|arızası|sızıntısı|yırtılması|aşınması|tıkanması|doluluğu)$/i, '');
                cond = `${cond} arızası veya kaçağı bulunmadığının ekspertiz testiyle teyit edilmesi şartıyla`;
              }
              return {
                condition: cond,
                reason,
                priority: 'IMPORTANT' as const,
                supportingFactIds: [],
              };
            });

          const hasCarbEra = (motorcycleEraAnalysis?.productionEras || judge.motorcycleEras || []).some(
            (e: any) => e.fuelSystem === 'CARBURETOR',
          );

          if (conds.length === 0) {
            if (judge.approvedFactsOnly && judge.approvedFactsOnly.length > 0) {
              conds = judge.approvedFactsOnly.slice(0, 2).map((fact) => {
                const title = this.sanitizeTurkishAutomotiveText(fact.title);
                const inspect = this.sanitizeTurkishAutomotiveText(fact.inspectionCheck || fact.testDriveCheck || '');
                return {
                  condition: `${title} mekanizmasında aşınma, boşluk veya yağ sızıntısı bulunmadığının ekspertiz kontrolünde teyit edilmesi şartıyla`,
                  reason: inspect || `${title} bileşeninde olası aşınma yüksek maliyetli parça onarımı gerektirebilir.`,
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [fact.claimId],
                };
              });
            } else if (isMotorcycle) {
              conds = [
                {
                  condition: hasCarbEra
                    ? 'Karbüratör hava-yakıt ayarının rölantide stop etmemesi ve soğuk marşta jigle mekanizmasının düzgün çalışması şartıyla'
                    : 'Soğuk ilk marşta eksantrik zincir sesi ve motor bloğundan şıkırtı gelmediğinin teyit edilmesi şartıyla',
                  reason: hasCarbEra
                    ? 'Karbüratör diyafram ve manifold hava kaçaklarını önceden tespit etmek için zorunludur.'
                    : 'Eksantrik zincir gergisi veya subap aşınmalarını önceden tespit etmek için zorunludur.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
                {
                  condition: 'Statör ve şarj konjektörünün akü kutup başlarında en az 13.8V şarj ürettiğinin teyit edilmesi şartıyla',
                  reason: 'Akü boşalma ve elektrik tesisatında yolda kalma riskini önlemek için gereklidir.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
              ];
            } else if (isCommercial) {
              conds = [
                {
                  condition: 'Intercooler basınç hortumunda yağ sızıntısı ve yırtık bulunmadığının ekspertizde teyit edilmesi şartıyla',
                  reason: 'Basınç kaybı çekiş düşüklüğüne ve yüksek yakıt sarfiyatına yol açar.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
                {
                  condition: 'Enjektör geri dönüş hatlarında mazot kaçağı bulunmadığının ve alt kaset triger/zincir grubunun kontrol edilmesi şartıyla',
                  reason: 'Sızıntı yangın ve yanma dengesizliği riski taşır; triger kaset aşınması motor hasarına yol açabilir.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
              ];
            } else if (isSubaru) {
              conds = [
                {
                  condition: 'Boksör motor silindir kapak contalarında dışa doğru yağ veya soğutma sıvısı sızıntısı bulunmadığının ve egzozda beyaz duman/soğutma sıvısı kokusu olmadığının teyit edilmesi şartıyla',
                  reason: 'Yatay karşıt boksör mimaride silindir kapak contası deformasyonu motor hararetine ve yüksek revizyon maliyetine yol açabilir.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
                {
                  condition: 'Sürekli simetrik dört çeker (Symmetrical AWD) aktarma organında, şaft askı bilyasında ve arka diferansiyelde mekanik boşluk veya uğultu bulunmadığının teyit edilmesi şartıyla',
                  reason: 'AWD aktarma bileşenlerindeki aşınma ve boşluklar sürüş dengesini bozar ve yüksek maliyetli diferansiyel onarımı gerektirebilir.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
              ];
            } else {
              conds = [
                {
                  condition: 'Periyodik bakım geçmişinin eksiksiz olduğunun ve bilgisayarlı diyagnostik/OBD taramasında aktif arıza kodu bulunmadığının teyit edilmesi şartıyla',
                  reason: 'Doğrulanmış kronik tasarım kusuru saptanmayan bu konfigürasyonda, yetkili servis periyodik bakım disiplini mekanik sağlığın en temel güvencesidir.',
                  priority: 'IMPORTANT' as const,
                  supportingFactIds: [],
                },
              ];
            }
          }
          return conds;
        })(),
        walkAwayConditions: (() => {
          const hasCarbEra = (motorcycleEraAnalysis?.productionEras || judge.motorcycleEras || []).some(
            (e: any) => e.fuelSystem === 'CARBURETOR',
          );

          const isTautologicalWalkAway = (cond: string, reason: string): boolean => {
            const combined = `${cond} ${reason}`.toLowerCase();
            if (
              combined.includes('çözülemeyen krank vuruntusu') ||
              combined.includes('uzun ömürlü kullanımını ciddi şekilde etkileyebilir') ||
              combined.includes('uzun ömürlü kullanımını etkiler') ||
              combined.includes('aracın ömrünü kısaltır')
            ) {
              return true;
            }
            if (/^ağır motor mekanik hasarı$/i.test(cond.trim())) {
              return true;
            }
            return false;
          };

          let walks = (writer.walkAwayConditions || [])
            .filter((w: any) => {
              if (isTautologicalWalkAway(w.condition || '', w.reason || '')) return false;
              const wText = `${w.condition} ${w.reason}`.toLowerCase();
              if (isPetrol && (wText.includes('enjektör geri dönüş') || wText.includes('mazot') || wText.includes('dpf'))) {
                return false;
              }
              if (!isCommercial && wText.includes('triger kaset')) {
                return false;
              }
              if (!isTurbo && isPetrol && (wText.includes('turbo') || wText.includes('intercooler'))) {
                return false;
              }
              return true;
            })
            .map((w: any) => {
              const condText = this.sanitizeTurkishAutomotiveText(w.condition);
              const rText = this.sanitizeTurkishAutomotiveText(w.reason);
              if (isMotorcycle && hasCarbEra && (condText.toLowerCase().includes('fi arıza') || condText.toLowerCase().includes('enjektör'))) {
                return {
                  condition: 'Krank veya biyel kolu mekanik vuruntusu ile karbüratör boğazı çatlağı',
                  reason: 'Ağır motor rektifiyesi veya çözülemeyen hava sızıntısı ve dengesiz yanma riski doğurur.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                };
              }
              return {
                condition: condText,
                reason: rText,
                priority: 'CRITICAL' as const,
                supportingFactIds: [],
              };
            });

          if (walks.length === 0) {
            const criticalOrHighFact = judge.approvedFactsOnly.find(
              (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
            );

            if (criticalOrHighFact) {
              const fTitle = this.sanitizeTurkishAutomotiveText(criticalOrHighFact.title);
              walks = [
                {
                  condition: `${fTitle} kaynaklı mekanik blok deformasyonu veya aktarma organında geri döndürülemez aşınma tespit edilmesi`,
                  reason: 'Komple sandık parça değişimi veya ağır mekanik revizyon maliyeti aracın piyasa değerine oranla rasyonel bir alım olmaktan çıkarır.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [criticalOrHighFact.claimId],
                },
                {
                  condition: 'Şasi kuleleri, podye, direkler veya ana taşıyıcı iskelette düzeltme, kaynak veya ağır yapısal hasar bulunması',
                  reason: 'Yapısal geometrisini ve fabrika toleranslarını yitirmiş gövdeler sürüş güvenliğini ve aktif yol tutuş dengesini kalıcı olarak bozar.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                },
              ];
            } else if (isMotorcycle) {
              walks = [
                {
                  condition: hasCarbEra
                    ? 'Krank veya biyel kolu mekanik vuruntusu ile karter çatlağı'
                    : 'FI arıza lambasının sürekli yanması ve teşhis cihazında çözülemeyen beyin/enjektör hatası vermesi',
                  reason: hasCarbEra
                    ? 'Ağır motor revizyonu ve yüksek maliyetli rektifiye riski doğurur.'
                    : 'Yüksek maliyetli elektronik beyin veya tesisat revizyonu gerektirebilir.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                },
                {
                  condition: 'Şasi ve gidon mesnet bölgesinde kaynak, çatlak veya geometri bozukluğu bulunması',
                  reason: 'Sürüş geometrisi bozulmuş motosikletler doğrudan kaza ve can güvenliği riski doğurur.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                },
              ];
            } else if (isSubaru) {
              walks = [
                {
                  condition: 'Silindir kapak contası yanması kaynaklı motor yağına soğutma sıvısı karışması veya blokta hararet kaynaklı termal deformasyon tespit edilmesi',
                  reason: 'Boksör motor bloğunun taşlanması veya komple sandık motor revizyonu maliyetinin araç piyasa değerine oranla rasyonel olmaması.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                },
                {
                  condition: 'Şasi kuleleri, podye, direkler veya ana taşıyıcı iskelette düzeltme, kaynak veya ağır yapısal deformasyon bulunması',
                  reason: 'Simetrik AWD yol tutuş geometrisini ve fabrika toleranslarını kalıcı olarak yitirmiş araçlar sürüş dengesi ve can güvenliği açısından doğrudan eleme kriteridir.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                },
              ];
            } else {
              walks = [
                {
                  condition: 'Şasi kuleleri, podye, marşpiyel veya ana taşıyıcı direklerde düzeltme, kesme-ekleme veya ağır yapısal deformasyon tespit edilmesi',
                  reason: 'Gövde rijitliğini ve çarpışma güvenliğini kalıcı olarak yitirmiş araçlar sürüş dengesini bozduğu için doğrudan eleme kriteridir.',
                  priority: 'CRITICAL' as const,
                  supportingFactIds: [],
                },
              ];
            }
          }
          return walks;
        })(),
        finalConditionalVerdict: {
          shortVerdict: this.sanitizeTurkishAutomotiveText(writer.decisionSynthesis?.verdict || `Karar Puanı: ${calibratedScore}/100. Kontroller teyit edilerek değerlendirilebilir.`),
          detailedVerdict: judge.decisionRationale,
          confidence: 'HIGH',
          supportingFactIds: [],
        },
        motorcycleEraAnalysis: isMotorcycle ? motorcycleEraAnalysis : undefined,
        commercialApplicationAnalysis: context.vehicleType === 'MINIVAN_PANELVAN'
          ? (() => {
              const hasVerifiedAuto = Boolean(judge.commercialDetails?.automaticGearboxVerified || isVariantAutomatic);
              return {
                applicationSummary: this.sanitizeTurkishAutomotiveText(
                  writer.configurationAnalysis ||
                    `${context.brand} ${context.model} modelinin kargo ve bagaj yükleme pratikliği, operasyonel dayanıklılığı değerlendirilmiştir.`,
                ),
                verifiedPowers: judge.candidatePowers,
                manualTransmissionAnalysis: this.sanitizeTurkishAutomotiveText(writer.manualTransmissionAnalysis),
                automaticTransmissionAnalysis: hasVerifiedAuto ? this.sanitizeTurkishAutomotiveText(writer.automaticTransmissionAnalysis) : undefined,
                transmissionComparison: hasVerifiedAuto ? this.sanitizeTurkishAutomotiveText(writer.manualVsAutomatic) : undefined,
                commercialDutyRisks: (writer.commercialDutyRisks || []).map((r: any) => {
                  let rec = this.sanitizeTurkishAutomotiveText(r.checkRecommendation);
                  if (/^gözle (muayene|kontrol) edin/i.test(rec.trim())) {
                    rec = rec.replace(/^gözle (muayene|kontrol) edin\s*(ve)?\s*/i, '');
                    rec = rec.charAt(0).toUpperCase() + rec.slice(1);
                  }
                  return {
                    title: this.sanitizeTurkishAutomotiveText(r.title),
                    risk: this.sanitizeTurkishAutomotiveText(r.risk),
                    checkRecommendation: rec,
                  };
                }),
                configurationContext: {
                  rawPackage: context.trimPackage || (isCombi ? 'Kombi' : 'Panelvan'),
                  cargoVolumeM3: judge.finalCargoVolumeM3 || (isCombi ? 0.7 : Number((trunkCapacityLiters / 1000).toFixed(1))),
                  commercialMeaning: this.sanitizeTurkishAutomotiveText(
                    writer.configurationBadge ||
                      context.trimPackage ||
                      (isCombi ? 'Kombi / Camlı Van' : 'Panelvan / Yük Taşıma'),
                  ),
                },
              };
            })()
          : undefined,
      },
      sellerQuestions: (writer.sellerQuestions || []).map((q: any) => {
        let qText = this.sanitizeTurkishAutomotiveText(q.question);
        let ans = this.sanitizeTurkishAutomotiveText(q.expectedAnswer);

        // Turn overly sterile/translated questions into natural, realistic vehicle buyer inquiries
        if (isPetrol) {
          qText = qText
            .replace(/^motorun enjektör geri dönüş hattında herhangi bir sızıntı veya yakıt kokusu var mı\??$/i, 'Soğuk ilk marşta enjektör diplerinde veya yakıt kütüğünde benzin kokusu/terleme oluyor mu, bujiler ve ateşleme bobinleri ne zaman elden geçti?')
            .replace(/mazot/gi, 'benzin')
            .replace(/enjektör geri dönüş hattı(nda)?/gi, 'yakıt kütüğü ve enjektör contalarında');
        } else {
          qText = qText
            .replace(/^motorun enjektör geri dönüş hattında herhangi bir sızıntı veya yakıt kokusu var mı\??$/i, 'Soğuk ilk marşta enjektör diplerinde mazot kokusu veya terleme hissediliyor mu, enjektör pulları ve rekorları daha önce elden geçti mi?');
        }
        qText = qText
          .replace(/^aracın /i, '')
          .trim();

        // Detect generic cliches in the question itself
        const isGenericQuestion =
          !qText ||
          /^(motorun genel durumu nedir|aracın genel durumu nedir|araçta bir sorun var mı|herhangi bir sorunu var mı|araç nasıl|bakımları yapıldı mı)\??$/i.test(qText.trim()) ||
          /genel durumu nedir\??$/i.test(qText.trim()) ||
          /sorun var m[ıi]\??$/i.test(qText.trim());

        if (isGenericQuestion) {
          if (context.brand.toLowerCase() === 'subaru') {
            qText = 'Boksör motor silindir kapak contalarında yağ terlemesi var mı, bujiler ve triger seti ne zaman değişti, AWD diferansiyel yağları düzenli yenilendi mi?';
            ans = 'Subaru yetkili/uzman servisinde periyodik bakımları yapıldı; conta terlemesi, sıvı eksiltme veya diferansiyel ötmesi yoktur, triger ve buji bakımı günceldir.';
          } else if (isCommercial) {
            qText = isPetrol
              ? 'Motor triger kayış/zincir seti, buji/ateşleme sistemi ve yakıt enjektörleri en son ne zaman kontrol edildi veya yenilendi?'
              : 'Alt kaset triger/zincir grubu, enjektör geri dönüş hatları ve intercooler basınç hortumu en son ne zaman kontrol edildi veya yenilendi?';
            ans = isPetrol
              ? 'Yetkili servis periyodik bakım kayıtlıdır; triger ve ateşleme grubu kontrol edilmiş olup herhangi bir yakıt sızıntısı veya mekanik aşınma bulunmamaktadır.'
              : 'Yetkili veya uzman serviste periyodik bakımı yapıldı; kaset triger zinciri ve gergi grubu kontrol edildi, intercooler basınç hortumunda ve enjektör diplerinde herhangi bir kaçak veya yağ terlemesi bulunmuyor.';
          } else if (isAutomobile) {
            const isAutoTurbo = /turbo|tsi|tfsi|tce|puretech|ecoboost|tdci|crdi|dci|cdti|hdi|multijet/i.test(`${context.engine || ''} ${context.model || ''}`);
            if (isAutoTurbo && !isPetrol) {
              qText = 'Motor triger/zincir seti, devirdaim, enjektörler ve turbo besleme hatları en son ne zaman kontrol edildi, yağ veya soğutma sıvısı eksiltme var mı?';
              ans = 'Yetkili servis periyodik bakım kayıtlıdır; triger, enjektör ve turbo besleme grubu kontrol edilmiş olup herhangi bir sıvı kaçağı veya mekanik aşınma bulunmamaktadır.';
            } else if (isAutoTurbo && isPetrol) {
              qText = 'Motor triger/zincir seti, bujiler/ateşleme bobinleri ve turbo besleme hatları en son ne zaman kontrol edildi, yağ veya soğutma sıvısı eksiltme var mı?';
              ans = 'Yetkili servis periyodik bakım kayıtlıdır; triger, ateşleme ve turbo besleme grubu kontrol edilmiş olup herhangi bir sıvı kaçağı veya mekanik aşınma bulunmamaktadır.';
            } else {
              qText = 'Motor triger kayış/zincir grubu, silindir kapak contası ve soğutma devirdaim hattı en son ne zaman kontrol edildi, yağ veya antifriz eksiltme var mı?';
              ans = 'Yetkili servis periyodik bakım kayıtlıdır; triger ve soğutma devirdaim grubu kontrol edilmiş olup conta terlemesi veya sıvı kaçağı bulunmamaktadır.';
            }
          } else {
            qText = 'Eksantrik zincir gergisi, subap ayarları ve şarj konjektörü stabil çalışıyor mu, soğuk çalıştırmada şıkırtı var mı?';
            ans = 'Soğuk ve sıcak marşta zincir şıkırtısı veya ses yoktur; şarj sistemi ve akü voltajı ideal fabrika değerindedir.';
          }
        }

        const isGenericAns =
          !ans ||
          /^(evet|hayır|evet\/hayır)$/i.test(ans.trim()) ||
          /klimanın çalışmasında herhangi bir sorun yok/i.test(ans) ||
          /yağ tüketimi normal seviyelerde/i.test(ans) ||
          /^(sorun yok|herhangi bir anormallik yok|normal seviyede)$/i.test(ans.trim().replace(/[.,!]/g, ''));

        if (isGenericAns) {
          if (/klima|soğutma|iklimlendirme|kompresör/i.test(qText)) {
            ans = 'Klima kompresörü ve evaporatör gaz basıncı test edildi; çift bölgeli soğutma kanalları ve klape motorları kusursuz çalışıyor.';
          } else if (/zincir|gergi|triger|yağ tüketim|eksiltme|kaset/i.test(qText)) {
            const chainLabel = isCommercial ? 'zincir/kaset şakırtısı' : 'triger/zincir şakırtısı';
            ans = `Yetkili servis periyodik bakımlarında üretici onaylı yağ kullanıldı; ${chainLabel} bulunmuyor, bakım aralığı düzenli.`;
          } else if (/intercooler|hortum|basınç|turbo/i.test(qText)) {
            if (!isTurbo && isPetrol) {
              ans = 'Emme manifoldu, gaz kelebeği ve vakum hatları test edildi; hava kaçağı veya basınç sapması bulunmuyor.';
            } else {
              ans = 'Turbo basınç testi yapıldı, intercooler borularında yırtık veya yağ terlemesi yoktur; basınç değerleri nominal.';
            }
          } else if (/reg[uü]lat[oö]r|konjekt[oö]r|stat[oö]r|ak[uü]|şarj/i.test(qText)) {
            ans = 'Yetkili veya uzman serviste orijinal parçayla yenilendi; rölantide ve yüksek devirde akü şarj voltajı 14V üzerinde stabil.';
          } else if (/pompa|enjeksiyon|yakıt|benzin|enjekt[oö]r/i.test(qText)) {
            ans = isPetrol
              ? 'Enjektör püskürtme debileri, yakıt kütüğü ve benzin pompası basıncı test edildi; yakıt hattında kaçak veya basınç sapması yoktur.'
              : 'Enjektör geri dönüş debileri ve püskürtme değerleri test edildi; mazot kaçağı veya geri dönüş sızıntısı yoktur.';
          } else if (/vites|şanzıman|sekrome[cç]|hilal|kavrama|tork konvert|volan/i.test(qText)) {
            ans = 'Vites geçişlerinde herhangi bir sertlik, vuruntu, kaydırma veya gecikme yaşanmıyor; mekanik ve kavrama sağlığı tam.';
          } else {
            ans = 'Periyodik bakımları zamanında yetkili serviste faturalı ve kayıtlı olarak yapıldı, tüm fonksiyonlar eksiksiz çalışıyor.';
          }
        }
        return {
          category: 'TEKNİK_VE_BAKIM',
          questionText: qText,
          expectedAnswerHint: ans,
          redFlagAnswerHint: 'Belirsiz veya kaçamak cevaplar ("bilmiyorum", "hiç baktırmadım")',
        };
      }),
      inspectionChecklist: (writer.inspectionChecklist || []).map((c: any) => ({
        category: c.system || 'MEKANİK',
        checkpoint: this.sanitizeTurkishAutomotiveText(c.checkpoint),
        whatToCheck: this.sanitizeTurkishAutomotiveText(c.riskIfIgnored || 'Aşınma ve boşluk kontrolü'),
        importance: 'HIGH',
      })),
      decisionScore: {
        score: calibratedScore,
        riskLevel: calibratedScore >= 80 ? 'DUSUK' : calibratedScore >= 70 ? 'ORTA' : calibratedScore >= 60 ? 'YUKSEK' : 'KRITIK',
        verdict: this.sanitizeTurkishAutomotiveText(writer.decisionSynthesis?.verdict || 'Kontroller teyit edilerek değerlendirilebilir.'),
        shortVerdict: this.sanitizeTurkishAutomotiveText(writer.decisionSynthesis?.verdict || 'Kontroller teyit edilerek değerlendirilebilir.'),
        deductedRisks,
        totalRiskPenalty,
      },
      torqueScoutDecisionScoreV1: {
        score: calibratedScore,
        state: calibratedScore >= 85 ? 'EXCELLENT' : calibratedScore >= 70 ? 'GOOD' : calibratedScore >= 50 ? 'CAUTION' : 'HIGH_RISK',
        scope: 'VEHICLE',
        modelDecisionRisk: totalRiskPenalty,
        totalRiskPenalty,
        confidenceScore: 90,
        deductedRisks,
      },
      scoring: {
        buyabilityScore: { value: calibratedScore },
        technicalRiskScore: { value: totalRiskPenalty },
      },
    };

    const sanitizedReport = this.sanitizeMechanicalCrossContamination(rawReport, context, judge);

    return this.deepReconcileReportSemantics(
      sanitizedReport,
      canonicalTransmission,
      canonicalSpeeds,
      trunkCapacityLiters,
    );
  }

  /**
   * Deterministic Mechanical Validator Gatekeeper
   * Programmatically purges and prevents cross-contamination:
   * 1. Gasoline vs Diesel isolation (mazot, DPF, AdBlue, enjektör geri dönüş)
   * 2. Naturally Aspirated vs Turbo isolation (intercooler, wastegate, turbo besleme)
   * 3. Passenger Automobile vs Commercial Van isolation (triger kaseti, sürgülü kapı, palet)
   * 4. Subaru Boxer & Symmetrical AWD consistency & realistic market positioning
   * 5. Strict Zero Estimated Cost (TL) and Zero Bargaining Guide enforcement
   */
  private sanitizeMechanicalCrossContamination(
    report: any,
    context: MultiVehicleResearchContext,
    judge: Agent3Output,
  ): any {
    if (!report) return report;

    const isMotorcycle = context.vehicleType === 'MOTORCYCLE';
    const isSuvPickup = context.vehicleType === 'SUV_PICKUP';
    const isCommercial = context.vehicleType === 'MINIVAN_PANELVAN';
    const isAutomobile = context.vehicleType === 'AUTOMOBILE' || (!isMotorcycle && !isSuvPickup && !isCommercial);

    const normEngine = (context.engine || '').toLowerCase();
    const isPetrol = (context.fuel || '').toLowerCase().includes('benzin') ||
      normEngine.includes('ecoboost') ||
      normEngine.includes('puretech') ||
      normEngine.includes('tsi') ||
      normEngine.includes('tfsi') ||
      normEngine.includes('tce');

    const isTurbo = /turbo|tsi|tfsi|tce|puretech|ecoboost|tdci|crdi|dci|cdti|hdi|multijet/i.test(`${context.engine || ''} ${context.model || ''}`);
    const isSubaru = context.brand.toLowerCase() === 'subaru';

    // 1. Purge Diesel Defects & Inapplicable Claims on Petrol Vehicles
    if (isPetrol && report.decisionScore?.deductedRisks) {
      report.decisionScore.deductedRisks = report.decisionScore.deductedRisks.filter((risk: any) => {
        const text = `${risk.title || ''} ${risk.reason || ''} ${risk.description || ''}`.toLowerCase();
        if (
          text.includes('enjektör geri dönüş') ||
          text.includes('mazot') ||
          text.includes('dpf') ||
          text.includes('dizel partikül') ||
          text.includes('adblue') ||
          text.includes('kızdırma bujisi') ||
          text.includes('ısıtma bujisi')
        ) {
          this.logger.warn(`[VALIDATOR GATEKEEPER] Purged diesel defect '${risk.title}' on petrol vehicle.`);
          return false;
        }
        if (!isTurbo && (text.includes('turboşarj') || text.includes('turbo besleme') || text.includes('intercooler') || text.includes('wastegate'))) {
          this.logger.warn(`[VALIDATOR GATEKEEPER] Purged turbo defect '${risk.title}' on naturally aspirated petrol vehicle.`);
          return false;
        }
        if (isAutomobile && (text.includes('triger kaset') || text.includes('kaset triger') || text.includes('sürgülü kapı'))) {
          this.logger.warn(`[VALIDATOR GATEKEEPER] Purged commercial van defect '${risk.title}' on passenger car.`);
          return false;
        }
        return true;
      });

      // Recalculate score from surviving valid risks
      const totalRiskPenalty = report.decisionScore.deductedRisks.reduce((sum: number, r: any) => sum + (r.penalty || 0), 0);
      const calibratedScore = Math.max(50, Math.min(96, 96 - totalRiskPenalty));
      report.decisionScore.score = calibratedScore;
      report.decisionScore.totalRiskPenalty = totalRiskPenalty;
      report.decisionScore.riskLevel = calibratedScore >= 80 ? 'DUSUK' : calibratedScore >= 70 ? 'ORTA' : calibratedScore >= 60 ? 'YUKSEK' : 'KRITIK';

      if (report.torqueScoutDecisionScoreV1) {
        report.torqueScoutDecisionScoreV1.score = calibratedScore;
        report.torqueScoutDecisionScoreV1.deductedRisks = report.decisionScore.deductedRisks;
        report.torqueScoutDecisionScoreV1.totalRiskPenalty = totalRiskPenalty;
        report.torqueScoutDecisionScoreV1.modelDecisionRisk = totalRiskPenalty;
        report.torqueScoutDecisionScoreV1.state = calibratedScore >= 85 ? 'EXCELLENT' : calibratedScore >= 70 ? 'GOOD' : calibratedScore >= 50 ? 'CAUTION' : 'HIGH_RISK';
      }
      if (report.scoring) {
        report.scoring.buyabilityScore = { value: calibratedScore };
        report.scoring.technicalRiskScore = { value: totalRiskPenalty };
      }
    }

    // 2. Text Cleaner for Mechanical Leaks across all narrative sections
    const cleanMechanicalText = (str: string): string => {
      if (!str || typeof str !== 'string') return str;
      let cleaned = str;
      if (isPetrol) {
        cleaned = cleaned
          .replace(/enjektör geri dönüş hattı(nda|nın|na)?/gi, 'yakıt kütüğü ve enjektör contaları$1')
          .replace(/mazot kaçağı/gi, 'benzin sızıntısı')
          .replace(/mazot terlemesi/gi, 'benzin terlemesi')
          .replace(/mazot kokusu/gi, 'benzin kokusu')
          .replace(/mazot pompası/gi, 'benzin pompası')
          .replace(/mazot/gi, 'yakıt');
      }
      if (!isTurbo && isPetrol) {
        cleaned = cleaned
          .replace(/turbo besleme hatları(nda)?/gi, 'emme manifoldu ve vakum hatları$1')
          .replace(/turboşarj arızası/gi, 'emme sistemi kaçakları')
          .replace(/turbo basınç testi/gi, 'vakum ve kompresyon testi')
          .replace(/intercooler boruları(nda)?/gi, 'emme boruları$1');
      }
      if (isAutomobile) {
        cleaned = cleaned
          .replace(/kaset triger/gi, 'triger kayışı / zinciri')
          .replace(/triger kaseti/gi, 'triger kayışı')
          .replace(/triger kaset/gi, 'triger seti')
          .replace(/sürgülü kapı mekanizması/gi, 'kapı kilit mekanizması')
          .replace(/sürgülü kapı/gi, 'arka kapı')
          .replace(/yükleme eşiği/gi, 'bagaj yükleme eşiği');
      }
      if (isSubaru) {
        cleaned = cleaned
          .replace(/likiditesi oldukça yüksektir/gi, 'Türkiye ikinci el pazarında niş ve meraklısına hitap eden dengeli bir kitleye sahiptir')
          .replace(/likiditesi yüksektir/gi, 'Türkiye ikinci el pazarında meraklısına hitap eden stabil bir konuma sahiptir');
      }
      return cleaned;
    };

    // Clean overview
    if (report.vehicleOverview) report.vehicleOverview = cleanMechanicalText(report.vehicleOverview);
    if (report.expertDecisionSynthesis?.vehicleCharacter?.detailedAssessment) {
      report.expertDecisionSynthesis.vehicleCharacter.detailedAssessment = cleanMechanicalText(report.expertDecisionSynthesis.vehicleCharacter.detailedAssessment);
    }

    // Clean dailyUse
    if (report.expertDecisionSynthesis?.dailyUseAssessment) {
      const du = report.expertDecisionSynthesis.dailyUseAssessment;
      if (du.cityUse) du.cityUse = cleanMechanicalText(du.cityUse);
      if (du.highwayUse) du.highwayUse = cleanMechanicalText(du.highwayUse);
    }

    // Clean conditionsToConsider
    if (report.expertDecisionSynthesis?.purchaseConditions) {
      report.expertDecisionSynthesis.purchaseConditions = report.expertDecisionSynthesis.purchaseConditions
        .map((c: any) => ({
          ...c,
          condition: cleanMechanicalText(c.condition),
          reason: cleanMechanicalText(c.reason),
        }))
        .filter((c: any) => {
          const combined = `${c.condition} ${c.reason}`.toLowerCase();
          if (isPetrol && (combined.includes('mazot') || combined.includes('dpf') || combined.includes('enjektör geri dönüş'))) return false;
          if (!isTurbo && isPetrol && (combined.includes('turbo') || combined.includes('intercooler'))) return false;
          if (isAutomobile && combined.includes('triger kaset')) return false;
          return true;
        });

      if (report.expertDecisionSynthesis.purchaseConditions.length === 0) {
        if (isSubaru) {
          report.expertDecisionSynthesis.purchaseConditions = [
            {
              condition: 'Boksör motor silindir kapak contalarında dışa doğru yağ veya soğutma sıvısı sızıntısı bulunmadığının ve egzozda beyaz duman/soğutma sıvısı kokusu olmadığının teyit edilmesi şartıyla',
              reason: 'Yatay karşıt boksör mimaride silindir kapak contası deformasyonu motor hararetine ve yüksek revizyon maliyetine yol açabilir.',
              priority: 'IMPORTANT',
              supportingFactIds: [],
            },
            {
              condition: 'Sürekli simetrik dört çeker (Symmetrical AWD) aktarma organında, şaft askı bilyasında ve arka diferansiyelde mekanik boşluk veya uğultu bulunmadığının teyit edilmesi şartıyla',
              reason: 'AWD aktarma bileşenlerindeki aşınma ve boşluklar sürüş dengesini bozar ve yüksek maliyetli diferansiyel onarımı gerektirebilir.',
              priority: 'IMPORTANT',
              supportingFactIds: [],
            },
          ];
        } else {
          report.expertDecisionSynthesis.purchaseConditions = [
            {
              condition: 'Periyodik bakım geçmişinin eksiksiz olduğunun ve bilgisayarlı diyagnostik/OBD taramasında aktif arıza kodu bulunmadığının teyit edilmesi şartıyla',
              reason: 'Doğrulanmış kronik tasarım kusuru saptanmayan bu konfigürasyonda, yetkili servis periyodik bakım disiplini mekanik sağlığın en temel güvencesidir.',
              priority: 'IMPORTANT',
              supportingFactIds: [],
            },
          ];
        }
      }
    }

    // Clean walkAwayConditions
    if (report.expertDecisionSynthesis?.walkAwayConditions) {
      report.expertDecisionSynthesis.walkAwayConditions = report.expertDecisionSynthesis.walkAwayConditions
        .map((w: any) => ({
          ...w,
          condition: cleanMechanicalText(w.condition),
          reason: cleanMechanicalText(w.reason),
        }))
        .filter((w: any) => {
          const combined = `${w.condition} ${w.reason}`.toLowerCase();
          if (isPetrol && (combined.includes('mazot') || combined.includes('dpf') || combined.includes('enjektör geri dönüş'))) return false;
          if (!isTurbo && isPetrol && (combined.includes('turbo') || combined.includes('intercooler'))) return false;
          if (isAutomobile && combined.includes('triger kaset')) return false;
          return true;
        });

      if (report.expertDecisionSynthesis.walkAwayConditions.length === 0) {
        if (isSubaru) {
          report.expertDecisionSynthesis.walkAwayConditions = [
            {
              condition: 'Silindir kapak contası yanması kaynaklı motor yağına soğutma sıvısı karışması veya blokta hararet kaynaklı termal deformasyon tespit edilmesi',
              reason: 'Boksör motor bloğunun taşlanması veya komple sandık motor revizyonu maliyetinin araç piyasa değerine oranla rasyonel olmaması.',
              priority: 'CRITICAL',
              supportingFactIds: [],
            },
            {
              condition: 'Şasi kuleleri, podye, direkler veya ana taşıyıcı iskelette düzeltme, kaynak veya ağır yapısal deformasyon bulunması',
              reason: 'Simetrik AWD yol tutuş geometrisini ve fabrika toleranslarını kalıcı olarak yitirmiş araçlar sürüş dengesi ve can güvenliği açısından doğrudan eleme kriteridir.',
              priority: 'CRITICAL',
              supportingFactIds: [],
            },
          ];
        } else {
          report.expertDecisionSynthesis.walkAwayConditions = [
            {
              condition: 'Şasi kuleleri, podye, marşpiyel veya ana taşıyıcı direklerde düzeltme, kesme-ekleme veya ağır yapısal deformasyon tespit edilmesi',
              reason: 'Gövde rijitliğini ve çarpışma güvenliğini kalıcı olarak yitirmiş araçlar sürüş dengesini bozduğu için doğrudan eleme kriteridir.',
              priority: 'CRITICAL',
              supportingFactIds: [],
            },
          ];
        }
      }
    }

    // Clean sellerQuestions
    if (report.sellerQuestions) {
      report.sellerQuestions = report.sellerQuestions.map((q: any) => ({
        ...q,
        questionText: cleanMechanicalText(q.questionText),
        expectedAnswerHint: cleanMechanicalText(q.expectedAnswerHint),
      }));
    }

    // Clean strongReasons & tradeoffs
    if (report.expertDecisionSynthesis?.strongReasonsToBuy) {
      report.expertDecisionSynthesis.strongReasonsToBuy = report.expertDecisionSynthesis.strongReasonsToBuy.map((r: any) => ({
        ...r,
        title: cleanMechanicalText(r.title),
        explanation: cleanMechanicalText(r.explanation),
      }));
    }
    if (report.expertDecisionSynthesis?.compromisesAndLimitations) {
      report.expertDecisionSynthesis.compromisesAndLimitations = report.expertDecisionSynthesis.compromisesAndLimitations.map((t: any) => ({
        ...t,
        title: cleanMechanicalText(t.title),
        explanation: cleanMechanicalText(t.explanation),
      }));
    }

    // Clean notIdealFor profiles (ensure no forbidden profiles)
    if (report.expertDecisionSynthesis?.notIdealForProfiles) {
      report.expertDecisionSynthesis.notIdealForProfiles = report.expertDecisionSynthesis.notIdealForProfiles.filter((p: any) => {
        const text = `${p.profile || ''} ${p.explanation || ''}`.toLowerCase();
        if (isAutomobile && (text.includes('palet') || text.includes('ağır tonaj') || text.includes('esnaf'))) return false;
        return true;
      });
    }

    // 3. User Explicit Bans Enforcement:
    // Strictly NO Estimated Cost (TL)
    delete report.estimatedCost;
    delete report.tahminiMasraf;
    delete report.estimatedRepairCosts;
    delete report.financialRepairRisk;
    if (report.decisionScore) {
      delete report.decisionScore.estimatedRepairCosts;
      delete report.decisionScore.financialRepairRisk;
    }
    // Strictly NO Seller Bargaining Guide (Pazarlık Rehberi / Satıcıyla Pazarlık Kozları)
    delete report.sellerBargainingGuide;
    delete report.bargainingPoints;
    delete report.pazarlikKozlari;
    delete report.sellerNegotiationGuide;
    if (report.expertDecisionSynthesis) {
      delete report.expertDecisionSynthesis.sellerBargainingGuide;
      delete report.expertDecisionSynthesis.bargainingPoints;
      delete report.expertDecisionSynthesis.pazarlikKozlari;
      delete report.expertDecisionSynthesis.sellerNegotiationGuide;
    }

    // 4. Subaru Drivetrain Guarantee
    if (isSubaru) {
      if (report.technicalSpecifications) {
        report.technicalSpecifications.drivetrain = 'Sürekli Simetrik Dört Tekerden Çekiş (Symmetrical AWD)';
      }
      if (report.expertDecisionSynthesis?.technicalSpecifications) {
        report.expertDecisionSynthesis.technicalSpecifications.drivetrain = 'Sürekli Simetrik Dört Tekerden Çekiş (Symmetrical AWD)';
      }
    }

    return report;
  }

  /**
   * Technical Cards & Identity Reconciliation.
   * Guarantees 100% harmony between cards and technical fields without altering researched text.
   */
  private deepReconcileReportSemantics(
    report: any,
    canonicalTransmission: string,
    canonicalSpeeds: number,
    luggageLiters: number,
  ): any {
    if (!report) return report;

    // Synchronize Technical Cards & Identity with Adjudicated Transmission & Specs
    if (report.technicalSpecifications) {
      report.technicalSpecifications.transmissionTypeAndSpeeds = canonicalTransmission;
      report.technicalSpecifications.transmissionSpeeds = canonicalSpeeds;
      if (luggageLiters > 0) {
        report.technicalSpecifications.trunkCapacityLiters = luggageLiters;
      }
    }
    if (report.performanceUsage) {
      if (luggageLiters > 0) {
        report.performanceUsage.trunkCapacityLiters = luggageLiters;
      }
    }
    if (report.expertDecisionSynthesis?.technicalSpecifications) {
      report.expertDecisionSynthesis.technicalSpecifications.transmissionTypeAndSpeeds = canonicalTransmission;
      if (luggageLiters > 0) {
        report.expertDecisionSynthesis.technicalSpecifications.trunkCapacityLiters = luggageLiters;
      }
    }
    if (report.vehicleIdentity) {
      report.vehicleIdentity.transmissionName = canonicalTransmission;
    }

    return report;
  }
}
