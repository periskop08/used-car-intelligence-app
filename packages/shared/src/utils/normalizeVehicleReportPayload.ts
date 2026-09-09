/**
 * Fail-Safe Report Shape Normalizer
 * Enforces strict shape validation, field-specific string extraction, and zero fabricated content.
 * Usable across API, Web, and Mobile.
 *
 * CORE RULE:
 * FAIL-SAFE != FAKE DATA.
 * Normalizer repairs shapes, it NEVER invents new semantic content, claims, or priorities.
 */

export type NormalizationClassification = 'LOSSLESS' | 'LOSSY' | 'REJECTED' | 'UNRECOVERABLE';

export interface NormalizationTelemetryWarning {
  classification: NormalizationClassification;
  field: string;
  expected: string;
  receivedType: string;
  actionTaken: string;
  details?: string;
}

export interface NormalizationMetrics {
  safelyNormalizedCount: number;
  losslessNormalizedCount: number;
  lossyNormalizedCount: number;
  rejectedItemCount: number;
  unrecoverableFieldCount: number;
}

export interface NormalizationResult<T> {
  data: T;
  warnings: NormalizationTelemetryWarning[];
  metrics: NormalizationMetrics;
}

// Field-Specific Whitelists for String Extraction from Objects
export const WHITELISTS = {
  symptoms: ['symptom', 'text', 'description'],
  inspectionInstructions: ['instruction', 'text', 'description'],
  reasonsToChoose: ['reason', 'title', 'description'],
  compromisesAndLimitations: ['limitation', 'title', 'description', 'text'],
  suitableFor: ['profile', 'target', 'title'],
  notSuitableFor: ['profile', 'target', 'title'],
  purchaseConditions: ['condition', 'text', 'description'],
  walkAwayConditions: ['condition', 'text', 'description'],
  prePurchaseChecks: ['instruction', 'check', 'title', 'description'],
  sellerQuestions: ['questionText', 'question', 'text'],
  factIds: ['factId', 'id', 'key'],
} as const;

/**
 * Safely extracts a string from an unknown value using a FIELD-SPECIFIC whitelist.
 * NEVER produces "[object Object]".
 */
export function extractFieldString(
  val: any,
  whitelistKeys: readonly string[],
  fallback = ''
): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '[object Object]' ? fallback : trimmed;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    for (const key of whitelistKeys) {
      if (typeof val[key] === 'string') {
        const trimmed = val[key].trim();
        if (trimmed && trimmed !== '[object Object]') {
          return trimmed;
        }
      }
    }
    return fallback;
  }
  return fallback;
}

/**
 * Generic safeString for simple primitive text display. Never produces "[object Object]".
 */
export function safeString(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '[object Object]' ? fallback : trimmed;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  return fallback;
}

/**
 * Safely normalizes an unknown value to a string array (string[]) using field-specific extraction.
 */
export function normalizeStringArray(
  raw: any,
  fieldName: string,
  whitelistKeys: readonly string[],
  warnings?: NormalizationTelemetryWarning[],
): string[] {
  if (!raw) return [];

  // If already an array
  if (Array.isArray(raw)) {
    const result: string[] = [];
    for (const item of raw) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && trimmed !== '[object Object]') {
          result.push(trimmed);
        }
      } else if (typeof item === 'object' && item !== null) {
        const extracted = extractFieldString(item, whitelistKeys);
        if (extracted) {
          result.push(extracted);
          if (warnings) {
            warnings.push({
              classification: 'LOSSY',
              field: fieldName,
              expected: 'string[]',
              receivedType: 'object in array',
              actionTaken: `extracted '${extracted}' via whitelist [${whitelistKeys.join(', ')}]`,
            });
          }
        } else if (warnings) {
          warnings.push({
            classification: 'REJECTED',
            field: fieldName,
            expected: 'string[]',
            receivedType: 'unextractable object',
            actionTaken: 'dropped unextractable object item',
          });
        }
      }
    }
    return result;
  }

  // If single string: Lossless wrapping
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed && trimmed !== '[object Object]') {
      if (warnings) {
        warnings.push({
          classification: 'LOSSLESS',
          field: fieldName,
          expected: 'string[]',
          receivedType: 'string',
          actionTaken: 'wrapped single string in array without information loss',
        });
      }
      return [trimmed];
    }
    return [];
  }

  // If single object
  if (typeof raw === 'object' && raw !== null) {
    const extracted = extractFieldString(raw, whitelistKeys);
    if (extracted) {
      if (warnings) {
        warnings.push({
          classification: 'LOSSY',
          field: fieldName,
          expected: 'string[]',
          receivedType: 'object',
          actionTaken: `extracted '${extracted}' from single object via whitelist`,
        });
      }
      return [extracted];
    }
    if (warnings) {
      warnings.push({
        classification: 'REJECTED',
        field: fieldName,
        expected: 'string[]',
        receivedType: 'object',
        actionTaken: 'rejected object item (no matching whitelist property found)',
      });
    }
    return [];
  }

  return [];
}

/**
 * Deep, fail-safe normalizer for ComprehensiveVehicleReport.
 * Guarantees schema-safe payload WITHOUT inventing fake priorities, fake reasons, or fake claims.
 */
export function normalizeVehicleReportPayload(
  rawReport: any,
): NormalizationResult<any> {
  const warnings: NormalizationTelemetryWarning[] = [];
  if (!rawReport || typeof rawReport !== 'object') {
    return {
      data: rawReport,
      warnings,
      metrics: {
        safelyNormalizedCount: 0,
        losslessNormalizedCount: 0,
        lossyNormalizedCount: 0,
        rejectedItemCount: 0,
        unrecoverableFieldCount: 0,
      },
    };
  }

  const report = { ...rawReport };

  // 1. Scoring Guard
  if (!report.scoring || typeof report.scoring !== 'object') {
    report.scoring = {
      buyabilityScore: { value: null },
      technicalRiskScore: { value: null },
    };
    warnings.push({
      classification: 'UNRECOVERABLE',
      field: 'scoring',
      expected: 'object',
      receivedType: typeof report.scoring,
      actionTaken: 'initialized safe empty scoring object with null values',
    });
  } else {
    report.scoring = {
      ...report.scoring,
      buyabilityScore: report.scoring.buyabilityScore && typeof report.scoring.buyabilityScore === 'object'
        ? { value: typeof report.scoring.buyabilityScore.value === 'number' ? report.scoring.buyabilityScore.value : null }
        : { value: null },
      technicalRiskScore: report.scoring.technicalRiskScore && typeof report.scoring.technicalRiskScore === 'object'
        ? { value: typeof report.scoring.technicalRiskScore.value === 'number' ? report.scoring.technicalRiskScore.value : null }
        : { value: null },
    };
  }

  // 2. PrePurchaseChecks Guard (NO dummy priority, NO fake provenance fact IDs)
  if (report.prePurchaseChecks !== undefined) {
    const rawChecks = Array.isArray(report.prePurchaseChecks) ? report.prePurchaseChecks : [report.prePurchaseChecks];
    const checksResult: any[] = [];
    rawChecks.forEach((c: any, i: number) => {
      if (!c) return;
      if (typeof c === 'string') {
        const text = c.trim();
        if (text && text !== '[object Object]') {
          checksResult.push({
            checkId: `c_${i + 1}`,
            title: text,
          });
          warnings.push({
            classification: 'LOSSLESS',
            field: `prePurchaseChecks[${i}]`,
            expected: 'object',
            receivedType: 'string',
            actionTaken: 'preserved string as title without inventing fake priority or reason',
          });
        }
      } else if (typeof c === 'object') {
        const title = extractFieldString(c, WHITELISTS.prePurchaseChecks);
        if (title) {
          const item: Record<string, any> = {
            checkId: safeString(c.checkId) || `c_${i + 1}`,
            title,
          };
          if (c.category) item.category = safeString(c.category);
          if (c.instruction) item.instruction = safeString(c.instruction);
          if (c.priority) item.priority = safeString(c.priority);
          if (c.targetComponent) item.targetComponent = safeString(c.targetComponent);
          if (Array.isArray(c.supportingFactIds) && c.supportingFactIds.length > 0) {
            item.supportingFactIds = normalizeStringArray(c.supportingFactIds, `prePurchaseChecks[${i}].supportingFactIds`, WHITELISTS.factIds);
          }
          checksResult.push(item);
        } else {
          warnings.push({
            classification: 'REJECTED',
            field: `prePurchaseChecks[${i}]`,
            expected: 'object with check/title/instruction',
            receivedType: 'empty/malformed object',
            actionTaken: 'rejected item due to missing extractable check content',
          });
        }
      }
    });
    report.prePurchaseChecks = checksResult;
  } else {
    report.prePurchaseChecks = [];
  }

  // 3. SellerQuestions Guard (NO fake answers, NO fake provenance fact IDs)
  if (report.sellerQuestions !== undefined) {
    const rawQs = Array.isArray(report.sellerQuestions) ? report.sellerQuestions : [report.sellerQuestions];
    const qsResult: any[] = [];
    rawQs.forEach((q: any, i: number) => {
      if (!q) return;
      if (typeof q === 'string') {
        const text = q.trim();
        if (text && text !== '[object Object]') {
          qsResult.push({
            questionId: `q_${i + 1}`,
            questionText: text,
          });
          warnings.push({
            classification: 'LOSSLESS',
            field: `sellerQuestions[${i}]`,
            expected: 'object',
            receivedType: 'string',
            actionTaken: 'preserved string as questionText without inventing fake metadata',
          });
        }
      } else if (typeof q === 'object') {
        const questionText = extractFieldString(q, WHITELISTS.sellerQuestions);
        if (questionText) {
          const item: Record<string, any> = {
            questionId: safeString(q.questionId) || `q_${i + 1}`,
            questionText,
          };
          if (q.category) item.category = safeString(q.category);
          if (q.expectedAnswerHint) item.expectedAnswerHint = safeString(q.expectedAnswerHint);
          if (q.redFlagAnswerHint) item.redFlagAnswerHint = safeString(q.redFlagAnswerHint);
          if (Array.isArray(q.supportingFactIds) && q.supportingFactIds.length > 0) {
            item.supportingFactIds = normalizeStringArray(q.supportingFactIds, `sellerQuestions[${i}].supportingFactIds`, WHITELISTS.factIds);
          }
          qsResult.push(item);
        } else {
          warnings.push({
            classification: 'REJECTED',
            field: `sellerQuestions[${i}]`,
            expected: 'object with question text',
            receivedType: 'empty/malformed object',
            actionTaken: 'rejected question due to missing extractable text',
          });
        }
      }
    });
    report.sellerQuestions = qsResult;
  } else {
    report.sellerQuestions = [];
  }

  // 4. ExpertDecisionSynthesis Guard
  if (report.expertDecisionSynthesis && typeof report.expertDecisionSynthesis === 'object') {
    const synth = { ...report.expertDecisionSynthesis };

    // Primary Technical Risk
    if (synth.primaryTechnicalRisk && typeof synth.primaryTechnicalRisk === 'object') {
      const ptr = { ...synth.primaryTechnicalRisk };
      ptr.title = safeString(ptr.title || ptr.riskTitle);
      if (ptr.explanation !== undefined) ptr.explanation = safeString(ptr.explanation);
      if (ptr.riskMeaning !== undefined) ptr.riskMeaning = safeString(ptr.riskMeaning);
      ptr.symptoms = normalizeStringArray(ptr.symptoms, 'primaryTechnicalRisk.symptoms', WHITELISTS.symptoms, warnings);
      ptr.inspectionInstructions = normalizeStringArray(ptr.inspectionInstructions, 'primaryTechnicalRisk.inspectionInstructions', WHITELISTS.inspectionInstructions, warnings);
      if (Array.isArray(ptr.supportingFactIds)) {
        ptr.supportingFactIds = normalizeStringArray(ptr.supportingFactIds, 'primaryTechnicalRisk.supportingFactIds', WHITELISTS.factIds);
      }
      synth.primaryTechnicalRisk = ptr;
    }

    // Secondary Technical Risks
    if (synth.secondaryTechnicalRisks !== undefined) {
      const rawSec = Array.isArray(synth.secondaryTechnicalRisks) ? synth.secondaryTechnicalRisks : [synth.secondaryTechnicalRisks];
      const secResult: any[] = [];
      rawSec.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed && trimmed !== '[object Object]') {
            secResult.push({
              title: trimmed,
              symptoms: [],
              inspectionInstructions: [],
            });
            warnings.push({
              classification: 'LOSSLESS',
              field: `secondaryTechnicalRisks[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as title',
            });
          }
        } else if (typeof item === 'object') {
          const title = safeString(item.title || item.riskTitle);
          if (title) {
            secResult.push({
              title,
              explanation: safeString(item.explanation),
              symptoms: normalizeStringArray(item.symptoms, `secondaryTechnicalRisks[${i}].symptoms`, WHITELISTS.symptoms),
              inspectionInstructions: normalizeStringArray(item.inspectionInstructions, `secondaryTechnicalRisks[${i}].inspectionInstructions`, WHITELISTS.inspectionInstructions),
            });
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `secondaryTechnicalRisks[${i}]`,
              expected: 'object with title',
              receivedType: 'malformed object',
              actionTaken: 'rejected secondary risk due to missing title',
            });
          }
        }
      });
      synth.secondaryTechnicalRisks = secResult;
    } else {
      synth.secondaryTechnicalRisks = [];
    }

    // Strongest Reasons To Choose (NO dummy title, NO fake provenance)
    if (synth.strongestReasonsToChoose !== undefined) {
      const rawItems = Array.isArray(synth.strongestReasonsToChoose) ? synth.strongestReasonsToChoose : [synth.strongestReasonsToChoose];
      const res: any[] = [];
      rawItems.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const text = item.trim();
          if (text && text !== '[object Object]') {
            res.push({ title: text });
            warnings.push({
              classification: 'LOSSLESS',
              field: `strongestReasonsToChoose[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as title without inventing fake explanation',
            });
          }
        } else if (typeof item === 'object') {
          const title = extractFieldString(item, WHITELISTS.reasonsToChoose);
          if (title) {
            const entry: Record<string, any> = { title };
            if (item.explanation) entry.explanation = safeString(item.explanation);
            if (Array.isArray(item.supportingFactIds) && item.supportingFactIds.length > 0) {
              entry.supportingFactIds = normalizeStringArray(item.supportingFactIds, `strongestReasonsToChoose[${i}].supportingFactIds`, WHITELISTS.factIds);
            }
            res.push(entry);
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `strongestReasonsToChoose[${i}]`,
              expected: 'object with reason/title',
              receivedType: 'malformed object',
              actionTaken: 'rejected reason item due to missing title',
            });
          }
        }
      });
      synth.strongestReasonsToChoose = res;
    }

    // Compromises and Limitations (NO dummy title, NO fake provenance)
    if (synth.compromisesAndLimitations !== undefined) {
      const rawItems = Array.isArray(synth.compromisesAndLimitations) ? synth.compromisesAndLimitations : [synth.compromisesAndLimitations];
      const res: any[] = [];
      rawItems.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const text = item.trim();
          if (text && text !== '[object Object]') {
            res.push({ title: text });
            warnings.push({
              classification: 'LOSSLESS',
              field: `compromisesAndLimitations[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as title without inventing fake explanation',
            });
          }
        } else if (typeof item === 'object') {
          const title = extractFieldString(item, WHITELISTS.compromisesAndLimitations);
          if (title) {
            const entry: Record<string, any> = { title };
            if (item.explanation) entry.explanation = safeString(item.explanation);
            if (Array.isArray(item.supportingFactIds) && item.supportingFactIds.length > 0) {
              entry.supportingFactIds = normalizeStringArray(item.supportingFactIds, `compromisesAndLimitations[${i}].supportingFactIds`, WHITELISTS.factIds);
            }
            res.push(entry);
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `compromisesAndLimitations[${i}]`,
              expected: 'object with limitation/title',
              receivedType: 'malformed object',
              actionTaken: 'rejected compromise item due to missing title',
            });
          }
        }
      });
      synth.compromisesAndLimitations = res;
    }

    // Suitable For
    if (synth.suitableFor !== undefined) {
      const rawItems = Array.isArray(synth.suitableFor) ? synth.suitableFor : [synth.suitableFor];
      const res: any[] = [];
      rawItems.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const text = item.trim();
          if (text && text !== '[object Object]') {
            res.push({ profile: text });
            warnings.push({
              classification: 'LOSSLESS',
              field: `suitableFor[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as profile without inventing fake explanation',
            });
          }
        } else if (typeof item === 'object') {
          const profile = extractFieldString(item, WHITELISTS.suitableFor);
          if (profile) {
            const entry: Record<string, any> = { profile };
            if (item.explanation) entry.explanation = safeString(item.explanation);
            if (Array.isArray(item.supportingFactIds) && item.supportingFactIds.length > 0) {
              entry.supportingFactIds = normalizeStringArray(item.supportingFactIds, `suitableFor[${i}].supportingFactIds`, WHITELISTS.factIds);
            }
            res.push(entry);
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `suitableFor[${i}]`,
              expected: 'object with profile',
              receivedType: 'malformed object',
              actionTaken: 'rejected profile item due to missing profile text',
            });
          }
        }
      });
      synth.suitableFor = res;
    }

    // Not Suitable For
    if (synth.notSuitableFor !== undefined) {
      const rawItems = Array.isArray(synth.notSuitableFor) ? synth.notSuitableFor : [synth.notSuitableFor];
      const res: any[] = [];
      rawItems.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const text = item.trim();
          if (text && text !== '[object Object]') {
            res.push({ profile: text });
            warnings.push({
              classification: 'LOSSLESS',
              field: `notSuitableFor[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as profile without inventing fake explanation',
            });
          }
        } else if (typeof item === 'object') {
          const profile = extractFieldString(item, WHITELISTS.notSuitableFor);
          if (profile) {
            const entry: Record<string, any> = { profile };
            if (item.explanation) entry.explanation = safeString(item.explanation);
            if (Array.isArray(item.supportingFactIds) && item.supportingFactIds.length > 0) {
              entry.supportingFactIds = normalizeStringArray(item.supportingFactIds, `notSuitableFor[${i}].supportingFactIds`, WHITELISTS.factIds);
            }
            res.push(entry);
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `notSuitableFor[${i}]`,
              expected: 'object with profile',
              receivedType: 'malformed object',
              actionTaken: 'rejected notSuitableFor item due to missing profile text',
            });
          }
        }
      });
      synth.notSuitableFor = res;
    }

    // Purchase Conditions (NO fake priority = 'ÖNEMLİ')
    if (synth.purchaseConditions !== undefined) {
      const rawItems = Array.isArray(synth.purchaseConditions) ? synth.purchaseConditions : [synth.purchaseConditions];
      const res: any[] = [];
      rawItems.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const text = item.trim();
          if (text && text !== '[object Object]') {
            res.push({ condition: text });
            warnings.push({
              classification: 'LOSSLESS',
              field: `purchaseConditions[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as condition without inventing fake priority or reason',
            });
          }
        } else if (typeof item === 'object') {
          const condition = extractFieldString(item, WHITELISTS.purchaseConditions);
          if (condition) {
            const entry: Record<string, any> = { condition };
            if (item.reason) entry.reason = safeString(item.reason);
            if (item.priority) entry.priority = safeString(item.priority);
            if (Array.isArray(item.supportingFactIds) && item.supportingFactIds.length > 0) {
              entry.supportingFactIds = normalizeStringArray(item.supportingFactIds, `purchaseConditions[${i}].supportingFactIds`, WHITELISTS.factIds);
            }
            res.push(entry);
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `purchaseConditions[${i}]`,
              expected: 'object with condition',
              receivedType: 'malformed object',
              actionTaken: 'rejected purchase condition due to missing condition text',
            });
          }
        }
      });
      synth.purchaseConditions = res;
    }

    // Walk Away Conditions (NO fake priority = 'KRİTİK')
    if (synth.walkAwayConditions !== undefined) {
      const rawItems = Array.isArray(synth.walkAwayConditions) ? synth.walkAwayConditions : [synth.walkAwayConditions];
      const res: any[] = [];
      rawItems.forEach((item: any, i: number) => {
        if (!item) return;
        if (typeof item === 'string') {
          const text = item.trim();
          if (text && text !== '[object Object]') {
            res.push({ condition: text });
            warnings.push({
              classification: 'LOSSLESS',
              field: `walkAwayConditions[${i}]`,
              expected: 'object',
              receivedType: 'string',
              actionTaken: 'preserved string as condition without inventing fake priority or reason',
            });
          }
        } else if (typeof item === 'object') {
          const condition = extractFieldString(item, WHITELISTS.walkAwayConditions);
          if (condition) {
            const entry: Record<string, any> = { condition };
            if (item.reason) entry.reason = safeString(item.reason);
            if (item.priority) entry.priority = safeString(item.priority);
            if (Array.isArray(item.supportingFactIds) && item.supportingFactIds.length > 0) {
              entry.supportingFactIds = normalizeStringArray(item.supportingFactIds, `walkAwayConditions[${i}].supportingFactIds`, WHITELISTS.factIds);
            }
            res.push(entry);
          } else {
            warnings.push({
              classification: 'REJECTED',
              field: `walkAwayConditions[${i}]`,
              expected: 'object with condition',
              receivedType: 'malformed object',
              actionTaken: 'rejected walk away condition due to missing condition text',
            });
          }
        }
      });
      synth.walkAwayConditions = res;
    }

    report.expertDecisionSynthesis = synth;
  }

  // 5. Common Problems Guard
  if (report.commonProblems !== undefined && !Array.isArray(report.commonProblems)) {
    report.commonProblems = typeof report.commonProblems === 'object' && report.commonProblems !== null ? [report.commonProblems] : [];
    warnings.push({
      classification: 'LOSSLESS',
      field: 'commonProblems',
      expected: 'array',
      receivedType: typeof rawReport.commonProblems,
      actionTaken: 'wrapped single item into array',
    });
  }

  // 6. Recalls Guard
  if (report.recalls !== undefined && !Array.isArray(report.recalls)) {
    report.recalls = typeof report.recalls === 'object' && report.recalls !== null ? [report.recalls] : [];
    warnings.push({
      classification: 'LOSSLESS',
      field: 'recalls',
      expected: 'array',
      receivedType: typeof rawReport.recalls,
      actionTaken: 'wrapped single item into array',
    });
  }

  // Metrics computation
  const losslessCount = warnings.filter(w => w.classification === 'LOSSLESS').length;
  const lossyCount = warnings.filter(w => w.classification === 'LOSSY').length;
  const rejectedCount = warnings.filter(w => w.classification === 'REJECTED').length;
  const unrecoverableCount = warnings.filter(w => w.classification === 'UNRECOVERABLE').length;

  const metrics: NormalizationMetrics = {
    safelyNormalizedCount: warnings.length > 0 ? 1 : 0,
    losslessNormalizedCount: losslessCount,
    lossyNormalizedCount: lossyCount,
    rejectedItemCount: rejectedCount,
    unrecoverableFieldCount: unrecoverableCount,
  };

  return { data: report, warnings, metrics };
}
