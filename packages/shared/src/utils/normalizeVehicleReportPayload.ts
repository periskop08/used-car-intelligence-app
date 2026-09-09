/**
 * Fail-Safe Report Shape Normalizer
 * Enforces strict shape validation and type coercion without corrupted "[object Object]" strings.
 * Usable across API, Web, and Mobile.
 */

export interface NormalizationTelemetryWarning {
  field: string;
  expected: string;
  receivedType: string;
  actionTaken: string;
}

export interface NormalizationResult<T> {
  data: T;
  warnings: NormalizationTelemetryWarning[];
}

/**
 * Safely extracts a meaningful string from an unknown value.
 * Never produces "[object Object]".
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
  if (typeof val === 'object') {
    // Check known string property names instead of coercing object directly
    for (const key of ['title', 'name', 'text', 'symptom', 'instruction', 'description', 'condition', 'reason', 'profile', 'headline', 'value']) {
      if (typeof val[key] === 'string' && val[key].trim() && val[key].trim() !== '[object Object]') {
        return val[key].trim();
      }
    }
    return fallback;
  }
  return fallback;
}

/**
 * Safely normalizes an unknown value to a string array (string[]).
 */
export function normalizeStringArray(
  raw: any,
  fieldName: string,
  warnings?: NormalizationTelemetryWarning[],
): string[] {
  if (!raw) return [];

  // If already an array
  if (Array.isArray(raw)) {
    const result: string[] = [];
    for (const item of raw) {
      const str = safeString(item);
      if (str) {
        result.push(str);
      } else if (typeof item === 'object' && warnings) {
        warnings.push({
          field: fieldName,
          expected: 'string[]',
          receivedType: 'object (unextractable)',
          actionTaken: 'dropped unextractable item',
        });
      }
    }
    return result;
  }

  // If single string
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed && trimmed !== '[object Object]') {
      if (warnings) {
        warnings.push({
          field: fieldName,
          expected: 'string[]',
          receivedType: 'string',
          actionTaken: 'wrapped single string in array',
        });
      }
      return [trimmed];
    }
    return [];
  }

  // If single object
  if (typeof raw === 'object') {
    const extracted = safeString(raw);
    if (extracted) {
      if (warnings) {
        warnings.push({
          field: fieldName,
          expected: 'string[]',
          receivedType: 'object',
          actionTaken: 'extracted string property from object and wrapped in array',
        });
      }
      return [extracted];
    }
    if (warnings) {
      warnings.push({
        field: fieldName,
        expected: 'string[]',
        receivedType: 'object',
        actionTaken: 'coerced to empty array (no string property found)',
      });
    }
    return [];
  }

  return [];
}

/**
 * Safely normalizes Title / Explanation objects (e.g. strongestReasonsToChoose, compromisesAndLimitations).
 */
export function normalizeTitleExplanationArray(
  raw: any,
  fieldName: string,
  defaultTitle: string,
  warnings?: NormalizationTelemetryWarning[],
): Array<{ title: string; explanation: string; supportingFactIds: string[] }> {
  if (!raw) return [];

  const items = Array.isArray(raw) ? raw : [raw];
  const result: Array<{ title: string; explanation: string; supportingFactIds: string[] }> = [];

  for (const item of items) {
    if (!item) continue;

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed && trimmed !== '[object Object]') {
        result.push({
          title: trimmed,
          explanation: '',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        });
        if (warnings) {
          warnings.push({
            field: fieldName,
            expected: 'object[]',
            receivedType: 'string',
            actionTaken: 'converted string to { title, explanation: "" }',
          });
        }
      }
      continue;
    }

    if (typeof item === 'object') {
      const title = safeString(item.title || item.name || item.heading || item.reason || item.limitation || defaultTitle);
      const explanation = safeString(item.explanation || item.description || item.detail || item.text || '');
      const factIds = normalizeStringArray(item.supportingFactIds, `${fieldName}.supportingFactIds`);

      result.push({
        title: title || defaultTitle,
        explanation,
        supportingFactIds: factIds.length > 0 ? factIds : ['AI_RESEARCH_ENGINE'],
      });
    }
  }

  return result;
}

/**
 * Safely normalizes Profile / Explanation objects (e.g. suitableFor, notSuitableFor).
 */
export function normalizeProfileArray(
  raw: any,
  fieldName: string,
  defaultProfile: string,
  warnings?: NormalizationTelemetryWarning[],
): Array<{ profile: string; explanation: string; supportingFactIds: string[] }> {
  if (!raw) return [];

  const items = Array.isArray(raw) ? raw : [raw];
  const result: Array<{ profile: string; explanation: string; supportingFactIds: string[] }> = [];

  for (const item of items) {
    if (!item) continue;

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed && trimmed !== '[object Object]') {
        result.push({
          profile: trimmed,
          explanation: '',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        });
        if (warnings) {
          warnings.push({
            field: fieldName,
            expected: 'object[]',
            receivedType: 'string',
            actionTaken: 'converted string to { profile, explanation: "" }',
          });
        }
      }
      continue;
    }

    if (typeof item === 'object') {
      const profile = safeString(item.profile || item.target || item.title || item.name || defaultProfile);
      const explanation = safeString(item.explanation || item.description || item.reason || item.detail || '');
      const factIds = normalizeStringArray(item.supportingFactIds, `${fieldName}.supportingFactIds`);

      result.push({
        profile: profile || defaultProfile,
        explanation,
        supportingFactIds: factIds.length > 0 ? factIds : ['AI_RESEARCH_ENGINE'],
      });
    }
  }

  return result;
}

/**
 * Safely normalizes Conditions (e.g. purchaseConditions, walkAwayConditions).
 */
export function normalizeConditionArray(
  raw: any,
  fieldName: string,
  defaultPriority: 'ÖNEMLİ' | 'KRİTİK',
  warnings?: NormalizationTelemetryWarning[],
): Array<{ condition: string; reason: string; priority: string; supportingFactIds: string[] }> {
  if (!raw) return [];

  const items = Array.isArray(raw) ? raw : [raw];
  const result: Array<{ condition: string; reason: string; priority: string; supportingFactIds: string[] }> = [];

  for (const item of items) {
    if (!item) continue;

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed && trimmed !== '[object Object]') {
        result.push({
          condition: trimmed,
          reason: '',
          priority: defaultPriority,
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        });
        if (warnings) {
          warnings.push({
            field: fieldName,
            expected: 'object[]',
            receivedType: 'string',
            actionTaken: 'converted string to { condition, reason: "" }',
          });
        }
      }
      continue;
    }

    if (typeof item === 'object') {
      const condition = safeString(item.condition || item.title || item.name || 'Kontrol Şartı');
      const reason = safeString(item.reason || item.explanation || item.description || '');
      const priority = safeString(item.priority || defaultPriority);
      const factIds = normalizeStringArray(item.supportingFactIds, `${fieldName}.supportingFactIds`);

      result.push({
        condition,
        reason,
        priority: priority.toUpperCase().includes('KRİTİK') || priority.toUpperCase().includes('CRITICAL') ? 'KRİTİK' : defaultPriority,
        supportingFactIds: factIds.length > 0 ? factIds : ['AI_RESEARCH_ENGINE'],
      });
    }
  }

  return result;
}

/**
 * Deep, fail-safe normalizer for the full ComprehensiveVehicleReport.
 * Guarantees every array field is an actual array with validated item shapes.
 */
export function normalizeVehicleReportPayload(
  rawReport: any,
): NormalizationResult<any> {
  const warnings: NormalizationTelemetryWarning[] = [];
  if (!rawReport || typeof rawReport !== 'object') {
    return { data: rawReport, warnings };
  }

  const report = { ...rawReport };

  // 1. Scoring Guard
  if (!report.scoring || typeof report.scoring !== 'object') {
    report.scoring = {
      buyabilityScore: { value: null },
      technicalRiskScore: { value: null },
    };
    warnings.push({ field: 'scoring', expected: 'object', receivedType: typeof report.scoring, actionTaken: 'initialized fallback scoring object' });
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

  // 2. PrePurchaseChecks Guard
  if (report.prePurchaseChecks !== undefined) {
    const rawChecks = Array.isArray(report.prePurchaseChecks) ? report.prePurchaseChecks : [report.prePurchaseChecks];
    const checksResult: any[] = [];
    rawChecks.forEach((c: any, i: number) => {
      if (!c) return;
      if (typeof c === 'string') {
        checksResult.push({
          checkId: `c_${i + 1}`,
          category: 'MEKANİK',
          title: safeString(c),
          instruction: safeString(c),
          priority: 'ÖNEMLİ',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        });
      } else if (typeof c === 'object') {
        checksResult.push({
          checkId: safeString(c.checkId || `c_${i + 1}`),
          category: safeString(c.category || 'MEKANİK'),
          title: safeString(c.title || c.check || `Kontrol #${i + 1}`),
          instruction: safeString(c.instruction || c.description || c.title || ''),
          priority: safeString(c.priority || 'ÖNEMLİ'),
          targetComponent: safeString(c.targetComponent) || undefined,
          supportingFactIds: normalizeStringArray(c.supportingFactIds, `prePurchaseChecks[${i}].supportingFactIds`),
        });
      }
    });
    report.prePurchaseChecks = checksResult;
  } else {
    report.prePurchaseChecks = [];
  }

  // 3. SellerQuestions Guard
  if (report.sellerQuestions !== undefined) {
    const rawQs = Array.isArray(report.sellerQuestions) ? report.sellerQuestions : [report.sellerQuestions];
    const qsResult: any[] = [];
    rawQs.forEach((q: any, i: number) => {
      if (!q) return;
      if (typeof q === 'string') {
        qsResult.push({
          questionId: `q_${i + 1}`,
          category: 'MEKANİK',
          questionText: safeString(q),
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        });
      } else if (typeof q === 'object') {
        qsResult.push({
          questionId: safeString(q.questionId || `q_${i + 1}`),
          category: safeString(q.category || 'MEKANİK'),
          questionText: safeString(q.questionText || q.question || 'Detaylı satıcı sorusu'),
          expectedAnswerHint: safeString(q.expectedAnswerHint || q.hint) || undefined,
          redFlagAnswerHint: safeString(q.redFlagAnswerHint) || undefined,
          supportingFactIds: normalizeStringArray(q.supportingFactIds, `sellerQuestions[${i}].supportingFactIds`),
        });
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
      ptr.title = safeString(ptr.title || 'Teknik Risk');
      ptr.explanation = safeString(ptr.explanation || '');
      ptr.symptoms = normalizeStringArray(ptr.symptoms, 'primaryTechnicalRisk.symptoms', warnings);
      ptr.inspectionInstructions = normalizeStringArray(ptr.inspectionInstructions, 'primaryTechnicalRisk.inspectionInstructions', warnings);
      ptr.supportingFactIds = normalizeStringArray(ptr.supportingFactIds, 'primaryTechnicalRisk.supportingFactIds');
      synth.primaryTechnicalRisk = ptr;
    }

    // Secondary Technical Risks
    if (synth.secondaryTechnicalRisks !== undefined) {
      const rawSec = Array.isArray(synth.secondaryTechnicalRisks) ? synth.secondaryTechnicalRisks : [synth.secondaryTechnicalRisks];
      const secResult: any[] = [];
      rawSec.forEach((item: any) => {
        if (!item) return;
        if (typeof item === 'string') {
          secResult.push({
            title: safeString(item),
            explanation: '',
            symptoms: [],
            inspectionInstructions: [],
          });
        } else if (typeof item === 'object') {
          secResult.push({
            title: safeString(item.title || 'İkincil Risk'),
            explanation: safeString(item.explanation || item.description || ''),
            symptoms: normalizeStringArray(item.symptoms, 'secondaryTechnicalRisks.symptoms'),
            inspectionInstructions: normalizeStringArray(item.inspectionInstructions, 'secondaryTechnicalRisks.inspectionInstructions'),
          });
        }
      });
      synth.secondaryTechnicalRisks = secResult;
    } else {
      synth.secondaryTechnicalRisks = [];
    }

    // Strongest Reasons To Choose
    synth.strongestReasonsToChoose = normalizeTitleExplanationArray(
      synth.strongestReasonsToChoose,
      'strongestReasonsToChoose',
      'Güçlü Neden',
      warnings,
    );

    // Compromises and Limitations
    synth.compromisesAndLimitations = normalizeTitleExplanationArray(
      synth.compromisesAndLimitations,
      'compromisesAndLimitations',
      'Taviz & Sınırlama',
      warnings,
    );

    // Suitable For
    synth.suitableFor = normalizeProfileArray(
      synth.suitableFor,
      'suitableFor',
      'Uygun Kullanıcı Profili',
      warnings,
    );

    // Not Suitable For
    synth.notSuitableFor = normalizeProfileArray(
      synth.notSuitableFor,
      'notSuitableFor',
      'Uygun Olmayabilecek Profil',
      warnings,
    );

    // Purchase Conditions
    synth.purchaseConditions = normalizeConditionArray(
      synth.purchaseConditions,
      'purchaseConditions',
      'ÖNEMLİ',
      warnings,
    );

    // Walk Away Conditions
    synth.walkAwayConditions = normalizeConditionArray(
      synth.walkAwayConditions,
      'walkAwayConditions',
      'KRİTİK',
      warnings,
    );

    report.expertDecisionSynthesis = synth;
  }

  // 5. Common Problems Guard
  if (report.commonProblems !== undefined && !Array.isArray(report.commonProblems)) {
    report.commonProblems = typeof report.commonProblems === 'object' && report.commonProblems !== null ? [report.commonProblems] : [];
    warnings.push({ field: 'commonProblems', expected: 'array', receivedType: typeof rawReport.commonProblems, actionTaken: 'wrapped or defaulted to array' });
  }

  // 6. Recalls Guard
  if (report.recalls !== undefined && !Array.isArray(report.recalls)) {
    report.recalls = typeof report.recalls === 'object' && report.recalls !== null ? [report.recalls] : [];
    warnings.push({ field: 'recalls', expected: 'array', receivedType: typeof rawReport.recalls, actionTaken: 'wrapped or defaulted to array' });
  }

  return { data: report, warnings };
}
