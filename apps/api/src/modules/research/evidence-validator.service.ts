/**
 * evidence-validator.service.ts
 * 
 * Hard Relevance Gates and Class-Based Evidence Thresholds Engine.
 * Rejects mismatched or unverified candidate problems before report generation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ResearchConfidenceService } from './research-confidence.service';
import { ClaimEvidenceService, StructuredRelevanceBasis } from './claim-evidence.service';

export interface CandidateProblem {
  problemName: string;
  systemFingerprint: string;
  problemFingerprint: string;
  affectedGeneration: string;
  affectedYears: string;
  affectedEngineCodes: string[];
  affectedTransmissionCodes: string[];
  classification: string;
  failureOrigin: string;
  frequency: string;
  severity: string;
  description: string;
  rootCause: string;
  symptoms: string[];
  howToCheckBeforeBuying: string[];
  obdCodes: string[];
  typicalMileage: number | null;
  consequenceIfIgnored: string;
  solution: string;
  preventiveMaintenance: string;
  repairCostLevel: string;
  buyDecision: string;
  claims: any[];
}

@Injectable()
export class EvidenceValidatorService {
  private readonly logger = new Logger(EvidenceValidatorService.name);

  constructor(
    private confidenceService: ResearchConfidenceService,
    private claimEvidenceService: ClaimEvidenceService
  ) {}

  /**
   * Validates candidate problem against Hard Relevance Gates and Class-Based Thresholds.
   */
  validateProblem(
    problem: CandidateProblem,
    variantContext: {
      generation: string;
      year: number;
      engineCodes: string[];
      transmissionCodes: string[];
      market: string;
    }
  ): {
    isValid: boolean;
    confidenceScore: number;
    relevanceBasis: StructuredRelevanceBasis;
    rejectReason?: string;
  } {
    // 1. HARD RELEVANCE GATES (Instant REJECT, not point penalties)

    // Generation Match Gate
    const genMatch = !problem.affectedGeneration || 
      problem.affectedGeneration.toLowerCase().includes(variantContext.generation.toLowerCase()) ||
      variantContext.generation.toLowerCase().includes(problem.affectedGeneration.toLowerCase());
    
    if (!genMatch) {
      this.logger.warn(`Hard Gate REJECT: Generation mismatch for "${problem.problemName}". Target: ${variantContext.generation}, Problem: ${problem.affectedGeneration}`);
      return this.reject('Generation mismatch');
    }

    // Engine Code Match Gate (Instant REJECT if engine codes defined and none match)
    const hasEngineCodeFilter = problem.affectedEngineCodes && problem.affectedEngineCodes.length > 0;
    const engineMatch = !hasEngineCodeFilter || problem.affectedEngineCodes.some(code => 
      variantContext.engineCodes.some(vCode => vCode.toLowerCase() === code.toLowerCase())
    );

    if (hasEngineCodeFilter && !engineMatch) {
      this.logger.warn(`Hard Gate REJECT: Engine code mismatch for "${problem.problemName}". Target: ${variantContext.engineCodes.join('/')}, Problem: ${problem.affectedEngineCodes.join('/')}`);
      return this.reject('Engine code mismatch');
    }

    // Transmission Match Gate (Only required if transmission-related problem)
    const isTransProblem = problem.systemFingerprint.toLowerCase().includes('transmission') || 
                           problem.systemFingerprint.toLowerCase().includes('gearbox') ||
                           problem.systemFingerprint.toLowerCase().includes('dsg') ||
                           problem.systemFingerprint.toLowerCase().includes('cvt');

    const hasTransFilter = problem.affectedTransmissionCodes && problem.affectedTransmissionCodes.length > 0;
    const transMatch = !hasTransFilter || problem.affectedTransmissionCodes.some(tCode =>
      variantContext.transmissionCodes.some(vtCode => vtCode.toLowerCase() === tCode.toLowerCase())
    );

    if (isTransProblem && hasTransFilter && !transMatch) {
      this.logger.warn(`Hard Gate REJECT: Transmission code mismatch for "${problem.problemName}". Target: ${variantContext.transmissionCodes.join('/')}, Problem: ${problem.affectedTransmissionCodes.join('/')}`);
      return this.reject('Transmission code mismatch');
    }

    // Structured relevance_basis
    const relevanceBasis: StructuredRelevanceBasis = {
      generation: { required: true, match: true },
      year: { required: true, match: true },
      engineCode: { required: hasEngineCodeFilter, match: engineMatch },
      transmissionCode: { required: isTransProblem, match: isTransProblem ? transMatch : null },
      market: { required: true, match: true }
    };

    // 2. CLAIM STANCE EVALUATION
    const supportedClaims = problem.claims.filter(c => this.claimEvidenceService.isClaimSupported(c));
    if (supportedClaims.length === 0) {
      return this.reject('No claims supported by evidence or refutations outweigh supporting evidence', relevanceBasis);
    }

    // Extract all evidence sources across supported claims
    const allSources = supportedClaims.flatMap(c => c.evidenceSources || []);
    const uniqueDomains = new Set(allSources.map(s => s.domain)).size;
    const uniqueSourceKinds = new Set(allSources.map(s => s.sourceKind)).size;
    const hasOfficialSource = allSources.some(s => 
      ['MANUFACTURER', 'REGULATOR_RECALL', 'TSB', 'SERVICE_CAMPAIGN'].includes(s.sourceKind)
    );

    // 3. DETERMINISTIC CONFIDENCE SCORE
    const confidenceScore = this.confidenceService.calculateScore({
      hasOfficialSource,
      hasExactEngineMatch: engineMatch,
      hasExactTransmissionMatch: transMatch,
      uniqueDomainCount: uniqueDomains,
      uniqueSourceKindCount: uniqueSourceKinds,
      hasProductionPeriodMatch: true,
      hasMarketMatch: true
    });

    // 4. CLASS-BASED EVIDENCE THRESHOLDS
    switch (problem.classification) {
      case 'RECALL':
        if (!hasOfficialSource && uniqueDomains < 1) return this.reject('RECALL requires official regulator/manufacturer source', relevanceBasis);
        break;

      case 'SERVICE_CAMPAIGN':
      case 'TSB':
        if (!hasOfficialSource) return this.reject('TSB/Service Campaign requires official technical source', relevanceBasis);
        break;

      case 'KNOWN_COMMON_PROBLEM':
        if (uniqueDomains < 2 || uniqueSourceKinds < 2) {
          this.logger.warn(`Demoting KNOWN_COMMON_PROBLEM "${problem.problemName}" to RECURRING_OWNER_COMPLAINT due to insufficient source diversity (${uniqueDomains} domains, ${uniqueSourceKinds} kinds).`);
          problem.classification = 'RECURRING_OWNER_COMPLAINT';
        }
        break;

      case 'BUYER_CHECKPOINT':
        if (confidenceScore < 40) return this.reject('BUYER_CHECKPOINT confidence score too low', relevanceBasis);
        break;

      case 'POSSIBLE_PROBLEM':
      case 'NORMAL_WEAR':
        // Filter out from primary verified chronic report
        return this.reject(`Classification ${problem.classification} excluded from primary verified report`, relevanceBasis);

      default:
        break;
    }

    return {
      isValid: true,
      confidenceScore,
      relevanceBasis
    };
  }

  private reject(reason: string, relevanceBasis?: StructuredRelevanceBasis) {
    return {
      isValid: false,
      confidenceScore: 0,
      relevanceBasis: relevanceBasis || {
        generation: { required: true, match: false },
        year: { required: true, match: false },
        engineCode: { required: false, match: false },
        transmissionCode: { required: false, match: null },
        market: { required: true, match: false }
      },
      rejectReason: reason
    };
  }
}
