import { Injectable, Logger } from '@nestjs/common';
import { ApprovalStatus, SourceKind, DataConfidence, ProblemType } from '@prisma/client';

@Injectable()
export class EvidenceRulesService {
  private readonly logger = new Logger(EvidenceRulesService.name);

  /**
   * Helper to parse hostname/domain from URL
   */
  private getDomain(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return 'unknown-domain';
    }
  }

  private normalizeTerminology(str: string): string {
    return str
      .toLowerCase()
      .replace(/\bmanual\b/g, 'manuel')
      .replace(/\bautomatic\b/g, 'otomatik')
      .replace(/\bdiesel\b/g, 'dizel')
      .replace(/\bpetrol\b/g, 'benzin')
      .replace(/\bgasoline\b/g, 'benzin')
      .trim();
  }

  /**
   * Evaluate CommonProblem auto-publish rules and variant match confidences
   */
  evaluateCommonProblem(
    prob: any,
    sources: any[],
    variant?: any,
  ): {
    status: ApprovalStatus;
    dataConfidence: DataConfidence;
    problemType: ProblemType;
    metadata: any;
  } {
    const domains = sources.map((s) => s.sourceDomain || this.getDomain(s.url));
    const uniqueDomains = Array.from(new Set(domains)).filter((d) => d !== 'unknown-domain');
    const uniqueKinds = Array.from(new Set(sources.map((s) => s.sourceKind)));

    const uniqueDomainCount = uniqueDomains.length;
    const uniqueKindCount = uniqueKinds.length;

    // Calculate variant match confidence details
    let variantMatchConfidence = 'HIGH';
    const matchedFields: string[] = ['brand', 'model'];
    const missingFields: string[] = ['trim'];
    const mismatchFields: string[] = [];

    if (variant) {
      // Check Year Match
      if (prob.affectedYears) {
        const yearsStr = prob.affectedYears.toString();
        if (yearsStr.includes(variant.year.toString())) {
          matchedFields.push('year');
        } else {
          mismatchFields.push('year');
          variantMatchConfidence = 'MEDIUM';
        }
      } else {
        missingFields.push('year');
      }

      // Check Engine Match
      if (prob.affectedEngine && prob.affectedEngine !== 'Tümü' && prob.affectedEngine !== 'ALL') {
        const engineStr = this.normalizeTerminology(prob.affectedEngine);
        const variantEngine = this.normalizeTerminology(variant.engine?.code || '');
        const engineTokens = engineStr.split(/[^a-z0-9]+/);
        const variantEngineTokens = variantEngine.split(/[^a-z0-9]+/);
        const hasIntersection = engineTokens.some(t => t && t.length >= 2 && variantEngineTokens.includes(t));
        if (hasIntersection || engineStr.includes(variantEngine) || variantEngine.includes(engineStr)) {
          matchedFields.push('engine');
        } else {
          mismatchFields.push('engine');
          variantMatchConfidence = 'LOW';
        }
      } else {
        matchedFields.push('engine'); // wildcards default match
      }

      // Check Transmission Match
      if (prob.affectedTransmission && prob.affectedTransmission !== 'Tümü' && prob.affectedTransmission !== 'ALL') {
        const transStr = this.normalizeTerminology(prob.affectedTransmission);
        const variantTrans = this.normalizeTerminology(variant.transmission?.name || '');
        const transTokens = transStr.split(/[^a-z0-9]+/);
        const variantTransTokens = variantTrans.split(/[^a-z0-9]+/);
        const hasIntersection = transTokens.some(t => t && variantTransTokens.includes(t));
        if (hasIntersection || transStr.includes(variantTrans) || variantTrans.includes(transStr)) {
          matchedFields.push('transmission');
        } else {
          mismatchFields.push('transmission');
          variantMatchConfidence = 'LOW';
        }
      } else {
        matchedFields.push('transmission');
      }
    }

    // Checks for official/verified sources
    const hasOfficialSource = sources.some(
      (s) =>
        s.sourceKind === SourceKind.OFFICIAL_RECALL ||
        s.sourceKind === SourceKind.MANUFACTURER ||
        s.isOfficial === true,
    );

    const hasVerifiedServiceNote = sources.some(
      (s) => s.sourceKind === SourceKind.SERVICE_NOTE && s.isVerified === true,
    );

    const unverifiedServiceNotesCount = sources.filter(
      (s) => s.sourceKind === SourceKind.SERVICE_NOTE && s.isVerified !== true,
    ).length;

    // Decision Logic
    let status: ApprovalStatus = ApprovalStatus.PENDING;
    let dataConfidence: DataConfidence = DataConfidence.LOW;
    let problemType: ProblemType = prob.problemType || ProblemType.COMMON_PROBLEM;
    let reason = 'insufficient_evidence';

    if (variantMatchConfidence === 'LOW') {
      // Demote to PENDING if variant mismatch is detected
      status = ApprovalStatus.PENDING;
      reason = 'variant_mismatch_detected';
    } else if (variantMatchConfidence === 'MEDIUM') {
      // Missing critical fields or partial year mismatches -> demote to USER_COMPLAINT
      status = ApprovalStatus.APPROVED;
      dataConfidence = DataConfidence.LOW;
      problemType = ProblemType.USER_COMPLAINT;
      reason = 'variant_match_medium_demoted';
    } else if (hasOfficialSource || hasVerifiedServiceNote) {
      status = ApprovalStatus.APPROVED;
      dataConfidence = DataConfidence.HIGH;
      reason = hasOfficialSource ? 'official_source_present' : 'verified_service_bulletin';
    } else if (uniqueDomainCount >= 3) {
      status = ApprovalStatus.APPROVED;
      dataConfidence = uniqueDomainCount >= 4 ? DataConfidence.HIGH : DataConfidence.MEDIUM;
      reason = '3_unique_domains';
    } else if (uniqueKindCount >= 2 && uniqueDomainCount >= 2) {
      status = ApprovalStatus.APPROVED;
      dataConfidence = DataConfidence.MEDIUM;
      reason = '2_kinds_and_2_domains';
    } else if (unverifiedServiceNotesCount > 0) {
      status = ApprovalStatus.APPROVED;
      dataConfidence = DataConfidence.LOW;
      problemType = ProblemType.USER_COMPLAINT;
      reason = 'unverified_service_note_only';
    } else if (uniqueDomainCount >= 1) {
      status = ApprovalStatus.APPROVED;
      dataConfidence = DataConfidence.LOW;
      problemType = ProblemType.USER_COMPLAINT;
      reason = 'weak_signal_user_complaint';
    }

    const warningMsg = problemType === ProblemType.USER_COMPLAINT
      ? 'Bu kayıt tekil kullanıcı deneyimi niteliğindedir. Her araçta görüleceği anlamına gelmez. Alım öncesi kontrol edilmesi önerilir.'
      : undefined;

    return {
      status,
      dataConfidence,
      problemType,
      metadata: {
        publishedBy: 'AUTO_RULES',
        publishedReason: reason,
        uniqueDomainCount,
        uniqueKindCount,
        variantMatchConfidence,
        matchedFields,
        missingFields,
        mismatchFields,
        warningMsg,
        ruleVersion: 'v2',
      },
    };
  }

  /**
   * Evaluate Recall auto-publish rules
   */
  evaluateRecall(
    recall: any,
    sources: any[],
  ): {
    status: ApprovalStatus;
    dataConfidence: DataConfidence;
    metadata: any;
  } {
    const hasOfficialSource = sources.some(
      (s) =>
        s.sourceKind === SourceKind.OFFICIAL_RECALL ||
        s.sourceKind === SourceKind.MANUFACTURER ||
        s.isOfficial === true,
    );

    if (hasOfficialSource) {
      return {
        status: ApprovalStatus.APPROVED,
        dataConfidence: DataConfidence.HIGH,
        metadata: {
          publishedBy: 'AUTO_RULES',
          publishedReason: 'official_recall_source',
          ruleVersion: 'v2',
        },
      };
    }

    // Forum/User claims do not publish recalls
    return {
      status: ApprovalStatus.REJECTED,
      dataConfidence: DataConfidence.LOW,
      metadata: {
        publishedBy: 'AUTO_RULES',
        publishedReason: 'rejected_unverified_recall_source',
        warningMsg: 'Geri çağırma kaydı resmi/üretici kanalları tarafından doğrulanmadığı için otomatik olarak reddedildi.',
        ruleVersion: 'v2',
      },
    };
  }
}
