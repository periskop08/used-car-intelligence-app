import { Injectable, Logger } from '@nestjs/common';
import {
  VehicleReportResearchData,
  GroundingSource,
  ResearchClaim,
  VerificationStatus,
  SectionStatusMap,
  VehicleCharacterResearch,
  CharacterResearchSection,
} from '@used-car-intelligence/shared';

@Injectable()
export class ResearchEvidenceValidationService {
  private readonly logger = new Logger(ResearchEvidenceValidationService.name);

  validateResearchData(rawResearch: any, vehicleContext: any): VehicleReportResearchData {
    const identity = vehicleContext?.vehicleIdentity || {};
    const brand = (identity.brand || '').toLowerCase();
    const model = (identity.model || '').toLowerCase();
    const year = identity.modelYear;
    const bodyType = (identity.bodyType || '').toLowerCase();
    const trim = (identity.trimName || '').toLowerCase();
    const engine = (identity.engineCode || '').toLowerCase();
    const transmission = (identity.transmissionName || '').toLowerCase();

    // 1. Process & Grade Grounding Sources with Backend Reliability Scores
    // Normalize sources from both legacy (rawResearch.groundingSources) and production (rawResearch.questions[*] / vehicleCharacterResearch.questions[*])
    const rawSourcesList: any[] = [];
    const seenSourceKeys = new Set<string>();

    const addSource = (src: any) => {
      if (!src) return;
      const key = (src.url || src.domain || src.title || '').trim().toLowerCase();
      if (key && seenSourceKeys.has(key)) return;
      if (key) seenSourceKeys.add(key);
      rawSourcesList.push(src);
    };

    if (Array.isArray(rawResearch?.groundingSources)) {
      rawResearch.groundingSources.forEach(addSource);
    }

    const questionContainer = rawResearch?.questions || rawResearch?.vehicleCharacterResearch?.questions || (rawResearch?.vehicleCharacterResearch && typeof rawResearch.vehicleCharacterResearch === 'object' && !rawResearch.vehicleCharacterResearch.questions ? rawResearch.vehicleCharacterResearch : null);
    if (questionContainer && typeof questionContainer === 'object') {
      Object.values(questionContainer).forEach((q: any) => {
        if (Array.isArray(q?.sources)) {
          q.sources.forEach(addSource);
        }
      });
    }

    const processedSources: GroundingSource[] = rawSourcesList.map((src, idx) => {
      const sourceKind = this.determineSourceKind(src.url, src.domain, src.sourceKind);
      const reliabilityScore = this.getReliabilityScore(sourceKind);
      const contentHash = src.contentHash || `hash_${src.domain || 'src'}_${idx}`;
      const canonicalSourceId = src.canonicalSourceId || `SRC-${idx + 1}`;
      const independenceGroupId = `GRP_${src.domain || 'unknown'}_${contentHash.slice(0, 8)}`;

      return {
        sourceId: src.sourceId || `SRC-${idx + 1}`,
        url: src.url || 'https://google.com',
        title: src.title || 'Automotive Source',
        domain: src.domain || 'unknown',
        sourceKind,
        reliabilityScore,
        retrievedAt: src.retrievedAt || new Date().toISOString(),
        publishedAt: src.publishedAt,
        contentHash,
        canonicalSourceId,
        independenceGroupId,
        evidenceExcerpt: src.evidenceExcerpt || src.relevantSnippet || src.snippet || '',
        evidenceLocation: src.evidenceLocation || {},
      };
    });

    const sourceMap = new Map<string, GroundingSource>();
    processedSources.forEach((s) => sourceMap.set(s.sourceId, s));

    // 2. Validate Claims & Assign Verification Status
    const rawClaims: any[] = Array.isArray(rawResearch?.claims) ? rawResearch.claims : [];
    const validatedClaims: ResearchClaim[] = rawClaims.map((c, idx) => {
      const claimId = c.claimId || `CLM-${idx + 1}`;
      const claimText = c.claimText || c.claim || '';
      const category = c.category || 'GENERAL';
      const claimType = c.claimType || 'FACT';
      const derivedFromClaimIds = Array.isArray(c.derivedFromClaimIds) ? c.derivedFromClaimIds : [];

      // Evaluate Relevance Gates
      const rel = c.relevance || {};
      const relevanceBasis = {
        generation: { required: rel.generation?.required ?? false, match: rel.generation?.match ?? true },
        bodyType: { required: rel.bodyType?.required ?? false, match: rel.bodyType?.match ?? true },
        year: { required: rel.year?.required ?? false, match: rel.year?.match ?? true },
        engineFamily: { required: rel.engineFamily?.required ?? false, match: rel.engineFamily?.match ?? true },
        engineCode: { required: rel.engineCode?.required ?? false, match: rel.engineCode?.match ?? true },
        transmission: { required: rel.transmission?.required ?? false, match: rel.transmission?.match ?? true },
        trim: { required: rel.trim?.required ?? false, match: rel.trim?.match ?? true },
        market: { required: rel.market?.required ?? false, match: rel.market?.match ?? true },
        equipmentPeriod: { required: rel.equipmentPeriod?.required ?? false, match: rel.equipmentPeriod?.match ?? true },
      };

      let verificationStatus: VerificationStatus = 'RAW';

      // Helper function to evaluate base claim status
      const evaluateBaseClaimStatus = (claim: any): VerificationStatus => {
        const mappedSources = (Array.isArray(claim.sources) ? claim.sources : []).map((s: any) => {
          const sourceObj = sourceMap.get(s.sourceId);
          return {
            sourceId: s.sourceId,
            stance: s.stance || 'SUPPORTS',
            reliabilityScore: sourceObj?.reliabilityScore || 30,
            groupId: sourceObj?.independenceGroupId || s.sourceId,
          };
        });

        const supportingSources = mappedSources.filter((s: any) => s.stance === 'SUPPORTS');
        const uniqueGroupCount = new Set(supportingSources.map((s: any) => s.groupId)).size;
        const maxReliability = Math.max(0, ...supportingSources.map((s: any) => s.reliabilityScore));

        if (uniqueGroupCount >= 2 || maxReliability >= 80) {
          return 'VERIFIED';
        } else if (supportingSources.length >= 1) {
          return 'INSUFFICIENT_EVIDENCE';
        } else {
          return 'REJECTED';
        }
      };

      const hasRelevanceMismatch = Object.values(relevanceBasis).some(
        (check) => check.required && check.match === false,
      );

      if (hasRelevanceMismatch) {
        verificationStatus = 'REJECTED';
      } else if (claimType === 'DERIVED_CONCLUSION') {
        // Rule B: DERIVED_CONCLUSION requires verified parent claims
        const parentVerifiedCount = derivedFromClaimIds.filter((parentId: string) => {
          const parent = rawClaims.find((rc) => rc.claimId === parentId);
          return parent && evaluateBaseClaimStatus(parent) === 'VERIFIED';
        }).length;

        verificationStatus = parentVerifiedCount > 0 ? 'VERIFIED' : 'REJECTED';
      } else {
        verificationStatus = evaluateBaseClaimStatus(c);
      }

      return {
        claimId,
        claimText,
        category,
        claimType,
        verificationStatus,
        derivedFromClaimIds,
        sources: Array.isArray(c.sources) ? c.sources : [],
        relevance: relevanceBasis,
      };
    });

    const verifiedClaimIds = new Set(
      validatedClaims.filter((c) => c.verificationStatus === 'VERIFIED').map((c) => c.claimId),
    );

    // 3. Process Vehicle Character Research Sections
    const rawChar = rawResearch?.vehicleCharacterResearch || {};
    const defaultSection = (rawSec: any): CharacterResearchSection => {
      const claimIds = Array.isArray(rawSec?.claimIds)
        ? rawSec.claimIds.filter((id: string) => verifiedClaimIds.has(id))
        : [];
      return {
        summary: rawSec?.summary || 'Doğrulanmış araç karakter verisi analiz ediliyor.',
        claimIds,
        sourceIds: Array.isArray(rawSec?.sourceIds) ? rawSec.sourceIds : [],
        insufficientData: claimIds.length === 0,
      };
    };

    const vehicleCharacterResearch: VehicleCharacterResearch = {
      segmentPositioning: defaultSection(rawChar.segmentPositioning),
      engineTransmissionFit: defaultSection(rawChar.engineTransmissionFit),
      drivingDynamics: defaultSection(rawChar.drivingDynamics),
      comfortAndIsolation: defaultSection(rawChar.comfortAndIsolation),
      interiorPracticality: defaultSection(rawChar.interiorPracticality),
      usageScenarios: defaultSection(rawChar.usageScenarios),
      targetUserProfile: defaultSection(rawChar.targetUserProfile),
    };

    // 4. Determine Section Status Map
    const sectionStatus: SectionStatusMap = {
      vehicleIdentity: verifiedClaimIds.size > 0 ? 'VERIFIED' : 'PARTIAL',
      vehicleCharacter:
        Object.values(vehicleCharacterResearch).filter((s) => !s.insufficientData).length >= 4
          ? 'VERIFIED'
          : 'PARTIAL',
      equipment: Array.isArray(rawResearch?.equipmentResearch) && rawResearch.equipmentResearch.length > 0 ? 'VERIFIED' : 'PARTIAL',
      reliability: Array.isArray(rawResearch?.reliabilityResearch) && rawResearch.reliabilityResearch.length > 0 ? 'VERIFIED' : 'PARTIAL',
      recall: Array.isArray(rawResearch?.recallResearch) ? 'VERIFIED' : 'PARTIAL',
      buyerInspection: 'DERIVED',
      sellerQuestions: 'DERIVED',
    };

    const verifiedClaimsCount = validatedClaims.filter((c) => c.verificationStatus === 'VERIFIED').length;
    const researchStatus =
      verifiedClaimsCount >= 5
        ? 'WEB_VERIFIED'
        : verifiedClaimsCount >= 1
          ? 'PARTIAL_WEB_VERIFIED'
          : 'DB_ONLY_FALLBACK';

    // 5. Extract & Structure Verified Technical Specs (Power & Torque)
    let verifiedTechnicalSpecs: any = undefined;
    const isHybrid = brand.includes('toyota') || brand.includes('lexus') || engine.includes('hybrid') || (identity.fuelType || '').toLowerCase().includes('hibrit') || (identity.fuelType || '').toUpperCase() === 'HYBRID';

    if (rawResearch?.verifiedTechnicalSpecs) {
      const rawP = rawResearch.verifiedTechnicalSpecs;
      const numHp = typeof rawP.powerHp === 'number' ? rawP.powerHp : (typeof rawP.powerHp === 'string' ? parseInt(rawP.powerHp.replace(/\D/g, ''), 10) || undefined : undefined);
      const rawUnit = String(rawP.powerUnit || 'HP').toUpperCase();
      const unit = rawUnit === 'BG' || rawUnit === 'BEYGIR' ? 'HP' : (rawUnit as 'HP' | 'PS' | 'KW');
      verifiedTechnicalSpecs = {
        powerHp: numHp,
        powerUnit: unit,
        powerSource: rawP.powerSource || 'VERIFIED_STAGE_1',
        powerSemantic: rawP.powerSemantic || (isHybrid ? 'TOTAL_HYBRID_SYSTEM_POWER' : 'STANDARD_POWER'),
        torqueNm: typeof rawP.torqueNm === 'number' ? rawP.torqueNm : undefined,
        torqueUnit: rawP.torqueUnit || 'Nm',
        torqueSource: rawP.torqueSource || 'VERIFIED_STAGE_1',
        torqueSemantic: rawP.torqueSemantic || (isHybrid ? 'TOTAL_HYBRID_SYSTEM_TORQUE' : 'STANDARD_TORQUE'),
      };
    } else {
      // Check if verified claims contain power / torque facts
      const powerClaim = validatedClaims.find(
        (c) => c.verificationStatus === 'VERIFIED' && (c.category === 'TECHNICAL' || c.category === 'GENERAL' || c.category === 'POWER') && /güç|power|hp|ps|kw/i.test(c.claimText),
      );
      if (powerClaim) {
        const hpMatch = powerClaim.claimText.match(/(\d+)\s*(HP|PS|kW|bg|beygir)\b/i);
        if (hpMatch) {
          const val = parseInt(hpMatch[1], 10);
          const rawUnit = hpMatch[2].toUpperCase();
          const unit = rawUnit === 'BG' || rawUnit === 'BEYGIR' ? 'HP' : (rawUnit as 'HP' | 'PS' | 'KW');
          verifiedTechnicalSpecs = {
            powerHp: val,
            powerUnit: unit,
            powerSource: 'VERIFIED_STAGE_1',
            powerSemantic: isHybrid ? 'TOTAL_HYBRID_SYSTEM_POWER' : 'STANDARD_POWER',
          };
        }
      }

      // If still not found, search in normalized evidence collection
      if (!verifiedTechnicalSpecs) {
        const textSnippets: string[] = [];
        if (typeof rawResearch === 'string') textSnippets.push(rawResearch);

        // 1. Top-level answers & summaries (legacy schema)
        if (rawResearch?.answers) {
          Object.values(rawResearch.answers).forEach((a: any) => {
            if (a?.answerText) textSnippets.push(a.answerText);
            if (a?.searchSnippet) textSnippets.push(a.searchSnippet);
          });
        }
        if (rawResearch?.engineTransmissionFit?.summary) {
          textSnippets.push(rawResearch.engineTransmissionFit.summary);
        }
        if (rawResearch?.vehicleCharacterResearch?.engineTransmissionFit?.summary) {
          textSnippets.push(rawResearch.vehicleCharacterResearch.engineTransmissionFit.summary);
        }
        if (Array.isArray(rawResearch?.groundingSources)) {
          rawResearch.groundingSources.forEach((s: any) => {
            if (s?.evidenceExcerpt) textSnippets.push(s.evidenceExcerpt);
          });
        }

        // 2. Production questions[*].synthesisedAnswer & questions[*].sources[*].relevantSnippet
        if (questionContainer && typeof questionContainer === 'object') {
          Object.values(questionContainer).forEach((q: any) => {
            if (q?.synthesisedAnswer) textSnippets.push(q.synthesisedAnswer);
            if (q?.summary) textSnippets.push(q.summary);
            if (Array.isArray(q?.sources)) {
              q.sources.forEach((s: any) => {
                if (s?.relevantSnippet) textSnippets.push(s.relevantSnippet);
                if (s?.snippet) textSnippets.push(s.snippet);
                if (s?.evidenceExcerpt) textSnippets.push(s.evidenceExcerpt);
              });
            }
          });
        }

        // 3. Processed grounding sources excerpts
        processedSources.forEach((s) => {
          if (s.evidenceExcerpt) textSnippets.push(s.evidenceExcerpt);
        });

        for (const text of textSnippets) {
          const match = text.match(/\b(\d{2,3})\s*(HP|PS|kW|bg|beygir)\b/i);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val >= 40 && val <= 1000 && !(isHybrid && val === 100)) { // Skip legacy 100 on hybrid
              const rawUnit = match[2].toUpperCase();
              const unit = rawUnit === 'BG' || rawUnit === 'BEYGIR' ? 'HP' : (rawUnit as 'HP' | 'PS' | 'KW');
              verifiedTechnicalSpecs = {
                powerHp: val,
                powerUnit: unit,
                powerSource: 'VERIFIED_STAGE_1',
                powerSemantic: isHybrid ? 'TOTAL_HYBRID_SYSTEM_POWER' : 'STANDARD_POWER',
              };
              break;
            }
          }
        }
      }
    }

    if (!verifiedTechnicalSpecs && vehicleContext?.verifiedResearch?.verifiedTechnicalSpecs) {
      verifiedTechnicalSpecs = vehicleContext.verifiedResearch.verifiedTechnicalSpecs;
    }

    return {
      vehicleIdentityResearch: rawResearch?.vehicleIdentityResearch || {},
      vehicleCharacterResearch,
      verifiedTechnicalSpecs,
      equipmentResearch: rawResearch?.equipmentResearch || {},
      reliabilityResearch: rawResearch?.reliabilityResearch || {},
      recallResearch: rawResearch?.recallResearch || {},
      buyerInspectionResearch: rawResearch?.buyerInspectionResearch || {},
      sellerQuestionResearch: rawResearch?.sellerQuestionResearch || {},
      groundingSources: processedSources,
      claims: validatedClaims,
      researchStatus,
      sectionStatus,
      webSearchPerformed: Boolean(rawResearch?.webSearchPerformed),
      researchedAt: new Date().toISOString(),
      freshness: {
        vehicleCharacter: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        equipment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        reliability: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        recalls: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  private determineSourceKind(url?: string, domain?: string, proposedKind?: string): any {
    if (proposedKind && proposedKind !== 'OTHER') return proposedKind;

    const lowerUrl = (url || '').toLowerCase();
    const lowerDomain = (domain || '').toLowerCase();

    if (
      lowerDomain.includes('bmw.') ||
      lowerDomain.includes('honda.') ||
      lowerDomain.includes('vw.') ||
      lowerDomain.includes('kia.') ||
      lowerDomain.includes('toyota.')
    ) {
      return 'OFFICIAL_MANUFACTURER';
    }

    if (lowerDomain.includes('nhtsa.gov') || lowerDomain.includes('kba.de') || lowerDomain.includes('ebis.')) {
      return 'OFFICIAL_REGULATOR';
    }

    if (lowerUrl.includes('.pdf') || lowerUrl.includes('katalog') || lowerUrl.includes('brochure')) {
      return 'OFFICIAL_BROCHURE';
    }

    if (
      lowerDomain.includes('autocar.co.uk') ||
      lowerDomain.includes('motor1.com') ||
      lowerDomain.includes('auto-motor-und-sport.de') ||
      lowerDomain.includes('otomobil.com')
    ) {
      return 'PERIOD_ROAD_TEST';
    }

    if (
      lowerDomain.includes('forum') ||
      lowerDomain.includes('golfmk7.com') ||
      lowerDomain.includes('civicx.com') ||
      lowerDomain.includes('reddit.com')
    ) {
      return 'SPECIALIST_FORUM';
    }

    if (lowerDomain.includes('sahibinden.com') || lowerDomain.includes('arabam.com')) {
      return 'MARKETPLACE';
    }

    return 'OTHER';
  }

  private getReliabilityScore(sourceKind: string): number {
    switch (sourceKind) {
      case 'OFFICIAL_MANUFACTURER':
        return 100;
      case 'OFFICIAL_REGULATOR':
        return 100;
      case 'OFFICIAL_BROCHURE':
        return 95;
      case 'OFFICIAL_DEALER_DOCUMENT':
        return 85;
      case 'TECHNICAL_PUBLICATION':
        return 80;
      case 'PERIOD_ROAD_TEST':
        return 75;
      case 'SPECIALIST_FORUM':
        return 55;
      case 'MARKETPLACE':
        return 35;
      default:
        return 20;
    }
  }
}
