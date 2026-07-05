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

  /**
   * Evaluate CommonProblem auto-publish rules
   */
  evaluateCommonProblem(
    prob: any,
    sources: any[],
  ): {
    status: ApprovalStatus;
    dataConfidence: DataConfidence;
    problemType: ProblemType;
    metadata: any;
  } {
    const domains = sources.map((s) => this.getDomain(s.url));
    const uniqueDomains = Array.from(new Set(domains)).filter((d) => d !== 'unknown-domain');
    const uniqueKinds = Array.from(new Set(sources.map((s) => s.sourceKind)));

    const uniqueDomainCount = uniqueDomains.length;
    const uniqueKindCount = uniqueKinds.length;

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

    // Rule C & D: Official / Verified Service Bulletin
    if (hasOfficialSource || hasVerifiedServiceNote) {
      return {
        status: ApprovalStatus.APPROVED,
        dataConfidence: DataConfidence.HIGH,
        problemType: prob.problemType || ProblemType.COMMON_PROBLEM,
        metadata: {
          publishedBy: 'AUTO_RULES',
          publishedReason: hasOfficialSource ? 'official_source_present' : 'verified_service_bulletin',
          uniqueDomainCount,
          uniqueKindCount,
          ruleVersion: 'v1',
        },
      };
    }

    // Rule A: 3+ unique domains
    if (uniqueDomainCount >= 3) {
      return {
        status: ApprovalStatus.APPROVED,
        dataConfidence: uniqueDomainCount >= 4 ? DataConfidence.HIGH : DataConfidence.MEDIUM,
        problemType: prob.problemType || ProblemType.COMMON_PROBLEM,
        metadata: {
          publishedBy: 'AUTO_RULES',
          publishedReason: '3_unique_domains',
          uniqueDomainCount,
          uniqueKindCount,
          ruleVersion: 'v1',
        },
      };
    }

    // Rule B: 2+ source kinds AND 2+ unique domains
    if (uniqueKindCount >= 2 && uniqueDomainCount >= 2) {
      return {
        status: ApprovalStatus.APPROVED,
        dataConfidence: DataConfidence.MEDIUM,
        problemType: prob.problemType || ProblemType.COMMON_PROBLEM,
        metadata: {
          publishedBy: 'AUTO_RULES',
          publishedReason: '2_kinds_and_2_domains',
          uniqueDomainCount,
          uniqueKindCount,
          ruleVersion: 'v1',
        },
      };
    }

    // Unverified Service Notes present but not matching other rules
    if (unverifiedServiceNotesCount > 0) {
      // Unverified SERVICE_NOTE alone -> USER_COMPLAINT or CHECK_POINT
      return {
        status: ApprovalStatus.APPROVED,
        dataConfidence: DataConfidence.LOW,
        problemType: ProblemType.USER_COMPLAINT,
        metadata: {
          publishedBy: 'AUTO_RULES',
          publishedReason: 'unverified_service_note_only',
          uniqueDomainCount,
          uniqueKindCount,
          warningMsg: 'Bu kayıt doğrulanmamış servis notlarına dayanmaktadır. Her araçta görülmeyebilir.',
          ruleVersion: 'v1',
        },
      };
    }

    // Weak signals: single forum thread or review
    if (uniqueDomainCount >= 1) {
      return {
        status: ApprovalStatus.APPROVED,
        dataConfidence: DataConfidence.LOW,
        problemType: ProblemType.USER_COMPLAINT,
        metadata: {
          publishedBy: 'AUTO_RULES',
          publishedReason: 'weak_signal_user_complaint',
          uniqueDomainCount,
          uniqueKindCount,
          warningMsg: 'Bu kayıt tekil kullanıcı deneyimi niteliğindedir. Her araçta görüleceği anlamına gelmez. Alım öncesi kontrol edilmesi önerilir.',
          ruleVersion: 'v1',
        },
      };
    }

    // Fails all evidence checks
    return {
      status: ApprovalStatus.PENDING,
      dataConfidence: DataConfidence.LOW,
      problemType: ProblemType.COMMON_PROBLEM,
      metadata: {
        publishedBy: 'AUTO_RULES',
        publishedReason: 'insufficient_evidence',
        uniqueDomainCount,
        uniqueKindCount,
        ruleVersion: 'v1',
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
          ruleVersion: 'v1',
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
        ruleVersion: 'v1',
      },
    };
  }
}
